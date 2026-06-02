import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();

export const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
});
