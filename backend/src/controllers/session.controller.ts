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
