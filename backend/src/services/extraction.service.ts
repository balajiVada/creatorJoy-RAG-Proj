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

    // 2. Attempt to scrape real metadata from the HTML instead of mocking
    let views = 0;
    let likes = 0;
    let comments = 0;

    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await response.text();
      
      const viewMatch = html.match(/"viewCount":"(\d+)"/);
      if (viewMatch) views = parseInt(viewMatch[1], 10);
      
      // Look for string representations of likes
      const likeMatch = html.match(/"likeCount":"(\d+)"/);
      if (likeMatch) likes = parseInt(likeMatch[1], 10);
    } catch (err: any) {
      logger.warn(`Failed to scrape real YouTube metadata for ${url}`);
    }
    
    const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

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
    // Attempt basic HTML scraping. (This will likely fail due to Meta's aggressive anti-bot protections)
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!response.ok) {
      throw new Error(`Instagram server returned ${response.status}`);
    }
    const html = await response.text();
    
    let transcript = "No description available";
    let views = 0;
    let likes = 0;
    let comments = 0;

    // Grab the description meta tag to act as our transcript
    const metaDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (metaDescMatch) {
      transcript = metaDescMatch[1];
    }
    
    const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

    return {
      transcript,
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
