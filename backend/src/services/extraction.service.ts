import { YoutubeTranscript } from 'youtube-transcript';
import { logger } from '../utils/logger';

export interface ExtractedData {
  transcript: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  title?: string;
  thumbnail?: string;
  creatorName?: string;
}

export const extractYouTubeData = async (url: string): Promise<ExtractedData> => {
  try {
    // 1. Fetch transcript
    const transcriptChunks = await YoutubeTranscript.fetchTranscript(url);
    const transcript = transcriptChunks.map(chunk => chunk.text).join(' ');

    let views = 0;
    let likes = 0;
    let comments = 0;
    let title = '';
    let thumbnail = '';
    let creatorName = '';

    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await response.text();
      
      const viewMatch = html.match(/"viewCount":"(\d+)"/);
      if (viewMatch) views = parseInt(viewMatch[1], 10);
      
      const likeMatch = html.match(/"likeCount":"(\d+)"/);
      if (likeMatch) likes = parseInt(likeMatch[1], 10);

      // Extract comment count using multiple potential patterns
      let commentMatch = html.match(/"commentCountText"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([\d,]+)"/);
      if (!commentMatch) {
        commentMatch = html.match(/"commentCount"\s*:\s*\{\s*"simpleText"\s*:\s*"([\d,]+)"/);
      }
      if (!commentMatch) {
        commentMatch = html.match(/"commentCount"\s*:\s*"(\d+)"/);
      }
      if (!commentMatch) {
        commentMatch = html.match(/"commentCountText"\s*:\s*\{\s*"simpleText"\s*:\s*"([\d,]+)"/);
      }
      if (commentMatch) {
        comments = parseInt(commentMatch[1].replace(/,/g, ''), 10);
      }

      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (titleMatch) title = titleMatch[1];

      const thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (thumbnailMatch) thumbnail = thumbnailMatch[1];

      const creatorMatch = html.match(/<link itemprop="name" content="([^"]+)"/);
      if (creatorMatch) creatorName = creatorMatch[1];
    } catch (err: any) {
      logger.warn(`Failed to scrape real YouTube metadata for ${url}`);
    }
    
    const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

    return {
      transcript,
      views,
      likes,
      comments,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      title,
      thumbnail,
      creatorName
    };
  } catch (error: any) {
    logger.error({ err: error, url }, "Failed to extract YouTube data");
    throw new Error("YouTube Extraction Failed: " + error.message);
  }
};

function shortcodeToId(shortcode: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    id = (id * BigInt(64)) + BigInt(alphabet.indexOf(shortcode[i]));
  }
  return id.toString();
}

export const extractInstagramData = async (url: string) => {
  try {
    logger.info(`Starting Instagram extraction via RapidAPI for ${url}`);

    // Extract shortcode from URL (e.g. instagram.com/reel/Cq_xyz123/)
    const match = url.match(/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
    const shortcode = match ? match[1] : null;

    if (!shortcode) {
      throw new Error('Could not parse Instagram Reel shortcode from URL');
    }

    const rapidApiKey = process.env.RAPID_API_KEY;
    if (!rapidApiKey) {
      throw new Error('RAPID_API_KEY is not configured in environment variables');
    }

    // Convert shortcode to numeric Media ID for this specific API
    const mediaId = shortcodeToId(shortcode);

    const apiUrl = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/media?id=${mediaId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('Invalid response structure from RapidAPI');
    }

    const views = data.play_count || data.view_count || data.video_view_count || data.fb_play_count || 0;
    const likes = data.like_count || data.fb_like_count || 0;
    const comments = data.comment_count || 0;
    
    let transcript = data.caption?.text || '';

    if (!transcript) {
      transcript = "No caption available for this Reel.";
    }

    let engagementRate = 0;
    if (views > 0) {
      engagementRate = Number((((likes + comments) / views) * 100).toFixed(2));
    }

    const title = data.title || transcript.substring(0, 50) + '...';
    const thumbnail = data.thumbnail_url || data.display_url || '';
    const creatorName = data.user?.username || data.owner?.username || '';

    logger.info(`Successfully extracted Instagram data for ${shortcode} (Media ID: ${mediaId})`);

    return {
      transcript,
      views,
      likes,
      comments,
      engagementRate,
      title,
      thumbnail,
      creatorName
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to extract Instagram data');
    throw new Error('Failed to extract Instagram metadata and caption');
  }
};
