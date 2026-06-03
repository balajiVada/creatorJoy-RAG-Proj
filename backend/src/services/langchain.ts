import { AzureChatOpenAI } from "@langchain/openai";
import { GoogleGenAI } from '@google/genai';
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';

dotenv.config();

// Match Documind-AI's Azure OpenAI setup
const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://example.openai.azure.com/";
const url = new URL(endpoint);
const basePath = `${url.protocol}//${url.hostname}/openai/deployments`;

export const llm = new AzureChatOpenAI({
  azureOpenAIApiKey: azureApiKey,
  azureOpenAIBasePath: basePath,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.4-mini",
  azureOpenAIApiVersion: "2024-02-15-preview",
  streaming: true,
  temperature: 0,
});

// Match Documind-AI's Gemini embedding setup
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});

export const embeddings = {
  embedQuery: async (text: string): Promise<number[]> => {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: {
        outputDimensionality: 768,
      }
    });
    return response.embeddings?.[0]?.values || [];
  },
  embedDocuments: async (texts: string[]): Promise<number[][]> => {
    if (texts.length === 0) return [];
    const batchSize = 100;
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batchTexts = texts.slice(i, i + batchSize);
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: batchTexts,
        config: {
          outputDimensionality: 768,
        }
      });
      
      const embeddingsList = response.embeddings || [];
      embeddingsList.forEach((emb) => {
        if (emb && emb.values) {
          results.push(emb.values);
        }
      });
    }
    return results;
  }
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const llmService = {
  async generateResponse(messages: ChatMessage[], onToken?: (token: string) => void) {
    const langchainMessages = messages.map(m => {
      if (m.role === 'system') return new SystemMessage(m.content);
      if (m.role === 'assistant') return new AIMessage(m.content);
      return new HumanMessage(m.content);
    });

    if (onToken) {
      const stream = await llm.stream(langchainMessages);
      for await (const chunk of stream) {
        if (chunk.content) {
          onToken(chunk.content.toString());
        }
      }
      return;
    }

    const response = await llm.invoke(langchainMessages);
    return response.content.toString();
  },

  async rewriteQuery(currentQuery: string, memory: { role: string; content: string }[]): Promise<string> {
    if (memory.length === 0) return currentQuery;

    const lowerQuery = currentQuery.toLowerCase();
    const needsRewrite = lowerQuery.length < 30 || /\b(it|this|that|he|she|they|them|his|hers|its|these|those|the previous|the first|the second)\b/i.test(lowerQuery);

    if (!needsRewrite) return currentQuery;

    const systemPrompt = `You are a search query rewriter. 
Your goal is to rewrite the user's latest query into a standalone, context-independent sentence that can be used for semantic search.
Use the conversation memory to resolve pronouns and references.
Strict Rules:
- Output ONLY the rewritten query, nothing else.
- Do NOT answer the question.
- Do NOT add external assumptions.
- If the query is already standalone, return it exactly as is.`;

    const formattedMemory = memory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\nConversation Memory:\n${formattedMemory}\n\nUser Query: ${currentQuery}\n\nRewritten Query:`;

    try {
      const response = await llm.invoke([new HumanMessage(fullPrompt)]);
      return response.content.toString().trim();
    } catch (error) {
      return currentQuery;
    }
  },

  async classifyIntent(query: string): Promise<'METADATA_ONLY' | 'REQUIRES_TRANSCRIPT'> {
    const prompt = `You are a query intent router.
Determine if the following user query can be answered STRICTLY by looking at basic video metadata (e.g., views, likes, comments, engagement rate, creator name, title, or simple comparisons of these numbers).
If the query asks about the content of the video, hooks, pacing, summary, or what was said, you must classify it as REQUIRES_TRANSCRIPT.
If the query ONLY asks about numerical metrics, titles, or creator names, classify it as METADATA_ONLY.

User Query: "${query}"

Respond with ONLY the exact string "METADATA_ONLY" or "REQUIRES_TRANSCRIPT" and nothing else.`;

    try {
      const response = await llm.invoke([new HumanMessage(prompt)]);
      const result = response.content.toString().trim();
      return result === 'METADATA_ONLY' ? 'METADATA_ONLY' : 'REQUIRES_TRANSCRIPT';
    } catch (error) {
      return 'REQUIRES_TRANSCRIPT'; // Default to full retrieval on error
    }
  }
};
