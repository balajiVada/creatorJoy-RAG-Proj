import { Request, Response, NextFunction } from 'express';
import { ComparisonSession } from '../models/ComparisonSession';
import { VideoMetadata } from '../models/VideoMetadata';

export const createComparisonSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { videoAUrl, videoBUrl } = req.body;

    if (!videoAUrl || !videoBUrl) {
      res.status(400).json({ success: false, message: 'Both Video A and Video B URLs are required.' });
      return;
    }

    // Basic URL validation
    const isYoutube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
    const isInstagram = (url: string) => url.includes('instagram.com/reel');

    if (!isYoutube(videoAUrl)) {
      res.status(400).json({ success: false, message: 'Video A must be a valid YouTube URL.' });
      return;
    }

    if (!isInstagram(videoBUrl)) {
      res.status(400).json({ success: false, message: 'Video B must be a valid Instagram Reel URL.' });
      return;
    }

    // Create Metadata shells
    const videoA = new VideoMetadata({ source: 'youtube', url: videoAUrl });
    const videoB = new VideoMetadata({ source: 'instagram', url: videoBUrl });
    
    await Promise.all([videoA.save(), videoB.save()]);

    // Create Comparison Session
    const session = new ComparisonSession({
      videoAId: videoA._id,
      videoBId: videoB._id,
    });
    
    await session.save();

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await ComparisonSession.findById(req.params.id)
      .populate('videoAId')
      .populate('videoBId');
      
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

import { extractYouTubeData, extractInstagramData } from '../services/extraction.service';
import { chunkingService } from '../services/chunking.service';
import { vectorService } from '../services/vector.service';
import { logger } from '../utils/logger';

export const extractSessionData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const session = await ComparisonSession.findById(id).populate('videoAId').populate('videoBId');
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const videoA: any = session.videoAId;
    const videoB: any = session.videoBId;

    if (videoA.extractionStatus === 'success' && videoB.extractionStatus === 'success') {
      res.status(200).json({ success: true, data: session });
      return;
    }

    const [youtubeData, instagramData] = await Promise.all([
      extractYouTubeData(videoA.url).catch(err => ({ error: err })),
      extractInstagramData(videoB.url).catch(err => ({ error: err }))
    ]);

    if (!('error' in youtubeData)) {
      videoA.transcript = youtubeData.transcript;
      videoA.views = youtubeData.views;
      videoA.likes = youtubeData.likes;
      videoA.comments = youtubeData.comments;
      videoA.engagementRate = youtubeData.engagementRate;
      videoA.extractionStatus = 'success';
      
      // Upsert to vector DB
      try {
        const transcriptText = typeof videoA.transcript === 'string' ? videoA.transcript : String(videoA.transcript || "");
        const chunks = await chunkingService.splitText(transcriptText);
        await vectorService.upsertTranscriptVectors(String(id), String(videoA._id), 'youtube', chunks);
        logger.info(`Upserted ${chunks.length} vectors for YouTube video`);
      } catch (err: any) {
        logger.error(`Failed to upsert YouTube vectors: ${err.message}`);
      }
    } else {
      videoA.extractionStatus = 'failed';
    }

    if (!('error' in instagramData)) {
      videoB.transcript = instagramData.transcript;
      videoB.views = instagramData.views;
      videoB.likes = instagramData.likes;
      videoB.comments = instagramData.comments;
      videoB.engagementRate = instagramData.engagementRate;
      videoB.extractionStatus = 'success';
      
      // Upsert to vector DB
      try {
        const transcriptText = typeof videoB.transcript === 'string' ? videoB.transcript : String(videoB.transcript || "");
        const chunks = await chunkingService.splitText(transcriptText);
        await vectorService.upsertTranscriptVectors(String(id), String(videoB._id), 'instagram', chunks);
        logger.info(`Upserted ${chunks.length} vectors for Instagram video`);
      } catch (err: any) {
        logger.error(`Failed to upsert Instagram vectors: ${err.message}`);
      }
    } else {
      videoB.extractionStatus = 'failed';
    }

    await Promise.all([videoA.save(), videoB.save()]);

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};
