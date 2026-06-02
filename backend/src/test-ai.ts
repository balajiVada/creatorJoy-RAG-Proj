import { initPinecone } from './config/pinecone';
import { llm, embeddings } from './services/langchain';
import { logger } from './utils/logger';

async function testConnections() {
  logger.info("Testing LLM generation...");
  try {
    const res = await llm.invoke("Say hello world");
    logger.info(`LLM Response: ${res.content}`);
  } catch (err: any) {
    logger.error(`LLM Error: ${err.message}`);
  }

  logger.info("Testing Embeddings generation...");
  try {
    const vector = await embeddings.embedQuery("Hello world");
    logger.info(`Embedding generated with dimension: ${vector.length}`);
  } catch (err: any) {
    logger.error(`Embeddings Error: ${err.message}`);
  }

  logger.info("Testing Pinecone connection...");
  await initPinecone();
  
  process.exit(0);
}

testConnections();
