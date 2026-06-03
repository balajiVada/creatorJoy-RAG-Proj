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

  async cloneVectorsToNewSession(
    sourceSessionId: string,
    targetSessionId: string,
    videoId: string
  ): Promise<void> {
    if (!pinecone) return;
    try {
      const index = pinecone.Index(PINECONE_INDEX_NAME);
      const sourceNamespace = index.namespace(sourceSessionId);
      const targetNamespace = index.namespace(targetSessionId);

      // Query source namespace for all vectors belonging to videoId
      // We use a dummy vector of 768 zeros since we filter strictly by videoId
      const response = await sourceNamespace.query({
        vector: new Array(768).fill(0),
        topK: 200,
        filter: { videoId },
        includeValues: true,
        includeMetadata: true
      });

      const matches = response.matches || [];
      if (matches.length === 0) return;

      const records = matches.map((match) => {
        const oldMetadata = match.metadata || {};
        return {
          id: `${targetSessionId}:${videoId}:${oldMetadata.chunkIndex}`,
          values: match.values || [],
          metadata: {
            ...oldMetadata,
            sessionId: targetSessionId // update target sessionId
          }
        };
      });

      // Upsert to target namespace
      await targetNamespace.upsert({ records });
    } catch (error) {
      const log = require('../utils/logger').logger;
      log.error({ err: error, sourceSessionId, targetSessionId, videoId }, "Failed to clone vectors to new session");
      throw error;
    }
  }
}

export const vectorService = new VectorService();
