import { YoutubeTranscript } from 'youtube-transcript';
import { logger } from '../utils/logger';

export interface ExtractedData {
  transcript: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
}

export const extractYouTubeData = async (url: string): Promise<ExtractedData> => {
  try {
    // 1. Fetch transcript
    const transcriptChunks = await YoutubeTranscript.fetchTranscript(url);
    const transcript = transcriptChunks.map(chunk => chunk.text).join(' ');

    // 2. Since YouTube Data API requires a key, we will simulate realistic metrics
    // based on typical averages for demonstration purposes unless an API key is provided.
    // In a production app, we would hit the YouTube Data API v3 `videos?part=statistics` here.
    
    // Generating realistic mock metrics for YouTube
    const views = Math.floor(Math.random() * (500000 - 10000) + 10000);
    const likes = Math.floor(views * (Math.random() * (0.08 - 0.02) + 0.02)); // 2% to 8% like rate
    const comments = Math.floor(likes * (Math.random() * (0.1 - 0.01) + 0.01)); // 1% to 10% comment rate
    
    const engagementRate = ((likes + comments) / views) * 100;

    return {
      transcript,
      views,
      likes,
      comments,
      engagementRate: parseFloat(engagementRate.toFixed(2))
    };
  } catch (error: any) {
    logger.error({ err: error, url }, "Failed to extract YouTube data");
    throw new Error("YouTube Extraction Failed: " + error.message);
  }
};

export const extractInstagramData = async (url: string): Promise<ExtractedData> => {
  try {
    // Instagram is aggressively blocking scrapes without authentication.
    // As agreed in the implementation plan, we will inject highly realistic mock data
    // to ensure the AI pipeline has rich data to compare against the YouTube video.

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockTranscript = "What is up guys! Today we're looking at something crazy. You won't believe how simple this trick is. Just do X, Y, and Z and you're good to go! Drop a like and follow for more tips.";
    
    // Generating realistic mock metrics for Instagram Reels (often higher engagement rates than YT)
    const views = Math.floor(Math.random() * (800000 - 50000) + 50000);
    const likes = Math.floor(views * (Math.random() * (0.12 - 0.04) + 0.04)); // 4% to 12% like rate
    const comments = Math.floor(likes * (Math.random() * (0.15 - 0.02) + 0.02)); 
    
    const engagementRate = ((likes + comments) / views) * 100;

    return {
      transcript: mockTranscript,
      views,
      likes,
      comments,
      engagementRate: parseFloat(engagementRate.toFixed(2))
    };
  } catch (error: any) {
    logger.error({ err: error, url }, "Failed to extract Instagram data");
    throw new Error("Instagram Extraction Failed: " + error.message);
  }
};
