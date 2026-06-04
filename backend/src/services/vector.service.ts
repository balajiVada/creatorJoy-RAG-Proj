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
    videoId: string,
    videoUrl: string,
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
        id: `${videoId}:${idx}`,
        values: vector,
        metadata: {
          videoId,
          videoUrl,
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

    const queryOptions: any = {
      vector,
      topK,
      includeMetadata: true,
    };

    if (filter) {
      queryOptions.filter = filter;
    }

    const response = await index.query(queryOptions);
    return response.matches || [];
  }

  async deleteSessionVectors(sessionId: string): Promise<void> {
    // No-op: Vectors are stored globally and cached across sessions.
    // They are preserved even if individual chat sessions are deleted.
  }

  async cloneVectorsToNewSession(
    sourceSessionId: string,
    targetSessionId: string,
    videoId: string
  ): Promise<void> {
    // No-op: Vectors are stored globally and shared. No copying is required.
  }
}

export const vectorService = new VectorService();
