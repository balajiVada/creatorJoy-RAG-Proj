import { pinecone, PINECONE_INDEX_NAME } from "../config/pinecone";
import { embeddings } from "./langchain";

export class VectorService {
  constructor() {}

  async embedText(text: string): Promise<number[]> {
    return await embeddings.embedQuery(text);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return await embeddings.embedDocuments(texts);
  }

  async upsertTranscriptVectors(
    sessionId: string,
    videoId: string,
    source: 'youtube' | 'instagram',
    chunks: string[]
  ): Promise<void> {
    if (!pinecone) {
      throw new Error("Pinecone client is not initialized.");
    }

    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const vectors = await this.embedDocuments(chunks);

    const records = chunks.map((chunkText, idx) => {
      const vector = vectors[idx];
      if (!vector || vector.length === 0) {
        throw new Error(`Failed to generate embedding for chunk ${idx}`);
      }
      return {
        id: `${sessionId}:${videoId}:${idx}`,
        values: vector,
        metadata: {
          sessionId,
          videoId,
          source,
          chunkIndex: idx,
          text: chunkText,
        },
      };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await index.upsert({ records: batch });
    }
  }

  async querySimilarity(vector: number[], topK = 6, filter?: Record<string, any>) {
    if (!pinecone) {
      throw new Error("Pinecone client is not initialized.");
    }
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const response = await index.query({
      vector,
      topK,
      includeMetadata: true,
      filter,
    });
    return response.matches || [];
  }
}

export const vectorService = new VectorService();
