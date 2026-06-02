import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX || 'creatorjoy-rag';

if (!apiKey) {
  logger.warn('PINECONE_API_KEY is not defined in environment variables.');
}

export const pinecone = apiKey ? new Pinecone({ apiKey }) : null;

export const PINECONE_INDEX_NAME = indexName;

export async function initPinecone() {
  if (!pinecone) {
    logger.warn('Pinecone client not initialized due to missing API key.');
    return null;
  }

  try {
    logger.info('Checking Pinecone index...');
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(idx => idx.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      logger.info(`Pinecone index "${PINECONE_INDEX_NAME}" does not exist. Creating a serverless index...`);
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: 768, // Dimension for Gemini embeddings
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      logger.info(`Pinecone index "${PINECONE_INDEX_NAME}" created successfully.`);
    } else {
      logger.info(`Pinecone index "${PINECONE_INDEX_NAME}" is ready.`);
    }

    return pinecone.Index(PINECONE_INDEX_NAME);
  } catch (error) {
    logger.error({ err: error }, 'Error initializing Pinecone');
    return null;
  }
}
