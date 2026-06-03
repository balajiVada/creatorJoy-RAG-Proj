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

    const index = pinecone.Index(PINECONE_INDEX_NAME).namespace(sessionId);
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
    
    const ns = filter?.sessionId;
    const index = ns 
      ? pinecone.Index(PINECONE_INDEX_NAME).namespace(ns)
      : pinecone.Index(PINECONE_INDEX_NAME);

    const queryOptions: any = {
      vector,
      topK,
      includeMetadata: true,
    };

    if (filter) {
      const cleanFilter = { ...filter };
      if (ns) {
        delete cleanFilter.sessionId;
      }
      if (Object.keys(cleanFilter).length > 0) {
        queryOptions.filter = cleanFilter;
      }
    }

    const response = await index.query(queryOptions);
    return response.matches || [];
  }

  async deleteSessionVectors(sessionId: string): Promise<void> {
    if (!pinecone) return;
    try {
      const index = pinecone.Index(PINECONE_INDEX_NAME);
      await index.namespace(sessionId).deleteAll();
    } catch (error) {
      // Don't throw, just log warning as database cleanup shouldn't block main deletes
      const log = require('../utils/logger').logger;
      log.warn({ err: error, sessionId }, "Failed to delete Pinecone namespace vectors");
    }
  }
}

export const vectorService = new VectorService();
