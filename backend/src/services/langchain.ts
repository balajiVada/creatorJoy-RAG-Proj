import { AzureChatOpenAI } from "@langchain/openai";
import { GoogleGenAI } from '@google/genai';
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
    const results = await Promise.all(
      texts.map(async (text) => {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: text,
          config: { outputDimensionality: 768 }
        });
        return response.embeddings?.[0]?.values || [];
      })
    );
    return results;
  }
};
