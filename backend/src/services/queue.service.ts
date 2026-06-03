import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const INGESTION_QUEUE_NAME = 'ingestion-queue';

export const ingestionQueue = new Queue(INGESTION_QUEUE_NAME, { connection });
export const ingestionQueueEvents = new QueueEvents(INGESTION_QUEUE_NAME, { connection });
