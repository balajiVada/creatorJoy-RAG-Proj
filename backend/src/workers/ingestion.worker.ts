import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { INGESTION_QUEUE_NAME } from '../services/queue.service';
import { extractYouTubeData, extractInstagramData } from '../services/extraction.service';
import { VideoMetadata } from '../models/VideoMetadata';
import { chunkingService } from '../services/chunking.service';
import { vectorService } from '../services/vector.service';
import { ChatSession } from '../models/ChatSession';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const ingestionWorker = new Worker(INGESTION_QUEUE_NAME, async (job: Job) => {
  const { url, chatSessionId } = job.data;
  
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const platform = isYouTube ? 'youtube' : 'instagram';
  
  await job.updateProgress({ step: `extracting_${platform}`, status: 'processing', url });
  
  try {
    const data = isYouTube ? await extractYouTubeData(url) : await extractInstagramData(url);
    
    const metadata = await VideoMetadata.create({
      url,
      platform,
      chatSessionId,
      transcript: data.transcript,
      views: data.views,
      likes: data.likes,
      comments: data.comments,
      engagementRate: data.engagementRate,
      extractionStatus: 'success',
      extractedAt: new Date(),
      title: data.title,
      thumbnail: data.thumbnail,
      creatorName: data.creatorName,
      followerCount: data.followerCount,
      hashtags: data.hashtags,
      uploadDate: data.uploadDate,
      duration: data.duration
    });
    
    const chunks = await chunkingService.splitText(data.transcript);
    
    await vectorService.upsertTranscriptVectors(
      chatSessionId, 
      metadata._id.toString(), 
      platform, 
      chunks
    );

    const chatSession = await ChatSession.findById(chatSessionId);
    if (chatSession) {
      chatSession.ingestedVideos.push({ url, metadataId: metadata._id as any });
      await chatSession.save();
    }
    
    await job.updateProgress({ step: `ingested_${platform}`, status: 'completed', url });
    return metadata.toJSON();
    
  } catch (err: any) {
    logger.error(`Worker failed to ingest ${url}`, err);
    await job.updateProgress({ step: `ingestion_failed`, status: 'error', url, error: err.message });
    throw err;
  }
}, { 
  connection: connection as any,
  stalledInterval: 300000, // CRITICAL: Set to 5 minutes to drastically reduce polling (cannot be 0)
  metrics: { maxDataPoints: 0 } as any
});
