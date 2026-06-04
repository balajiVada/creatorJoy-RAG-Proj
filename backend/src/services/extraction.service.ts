import { YoutubeTranscript } from 'youtube-transcript';
import { AssemblyAI } from 'assemblyai';
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
  followerCount?: number;
  hashtags?: string[];
  uploadDate?: Date;
  duration?: string;
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export const extractYouTubeData = async (url: string): Promise<ExtractedData> => {
  try {
    let transcript = '';
    try {
      // 1. Fetch transcript
      const transcriptChunks = await YoutubeTranscript.fetchTranscript(url);
      transcript = transcriptChunks.map(chunk => chunk.text).join(' ');
    } catch (err: any) {
      logger.warn({ err, url }, "Failed to fetch YouTube transcript. Falling back to placeholder.");
      transcript = "Transcript is disabled or unavailable for this video.";
    }

    let views = 0;
    let likes = 0;
    let comments = 0;
    let title = '';
    let thumbnail = '';
    let creatorName = '';
    let followerCount: number | undefined;
    let hashtags: string[] | undefined;
    let uploadDate: Date | undefined;
    let duration: string | undefined;

    const apiKey = process.env.YOUTUBE_API_KEY;
    const videoId = extractYouTubeId(url);
    let apiSuccess = false;

    if (apiKey && videoId) {
      try {
        logger.info(`Fetching YouTube metadata via Data API v3 for ID: ${videoId}`);
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            views = parseInt(item.statistics?.viewCount || '0', 10);
            likes = parseInt(item.statistics?.likeCount || '0', 10);
            comments = parseInt(item.statistics?.commentCount || '0', 10);
            title = item.snippet?.title || '';
            creatorName = item.snippet?.channelTitle || '';
            thumbnail = item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || '';
            
            duration = item.contentDetails?.duration;
            uploadDate = item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined;
            hashtags = item.snippet?.tags || [];
            
            apiSuccess = true;
            logger.info(`Successfully fetched YouTube metadata via API for ${videoId}`);
            
            const channelId = item.snippet?.channelId;
            if (channelId) {
              try {
                const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
                const channelRes = await fetch(channelUrl);
                if (channelRes.ok) {
                  const channelData = await channelRes.json();
                  if (channelData.items && channelData.items.length > 0) {
                    followerCount = parseInt(channelData.items[0].statistics?.subscriberCount || '0', 10);
                  }
                }
              } catch (channelErr: any) {
                logger.warn(`Failed to fetch YouTube channel metadata: ${channelErr.message}`);
              }
            }
          }
        }
      } catch (err: any) {
        logger.warn(`Failed to fetch YouTube Data API metadata: ${err.message}. Falling back to scraping.`);
      }
    }

    if (!apiSuccess) {
      try {
        logger.info(`Falling back to YouTube scraping for URL: ${url}`);
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
      creatorName,
      followerCount,
      hashtags,
      uploadDate,
      duration
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

export const extractInstagramData = async (url: string): Promise<ExtractedData> => {
  try {
    const apifyToken = process.env.APIFY_TOKEN;
    let views = 0;
    let likes = 0;
    let comments = 0;
    let transcript = '';
    let title = '';
    let thumbnail = '';
    let creatorName = '';
    let followerCount: number | undefined;
    let hashtags: string[] | undefined;
    let uploadDate: Date | undefined;
    let mediaUrl = '';
    let apiSuccess = false;

    if (apifyToken) {
      try {
        logger.info(`Starting Instagram extraction via Apify for ${url}`);
        const input = {
          username: [url],
          resultsLimit: 1,
        };
        const apiUrl = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${apifyToken}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        });

        if (response.ok) {
          const items = await response.json();
          if (Array.isArray(items) && items.length > 0) {
            const data = items[0];
            views = data.videoPlayCount || data.videoViewCount || data.playsCount || data.viewCount || 0;
            likes = data.likesCount || data.likes || 0;
            comments = data.commentsCount || data.comments || 0;
            transcript = data.caption || '';
            thumbnail = data.displayUrl || data.thumbnailUrl || '';
            creatorName = data.ownerUsername || '';
            title = data.title || (transcript.length > 50 ? transcript.substring(0, 50) + '...' : transcript);
            
            followerCount = data.ownerFollowersCount || data.owner?.followersCount;
            uploadDate = data.timestamp ? new Date(data.timestamp) : undefined;
            hashtags = data.hashtags || (transcript ? transcript.match(/#[\w]+/g) : []) || [];
            mediaUrl = data.audioUrl || data.videoUrl || '';
            
            apiSuccess = true;
            logger.info(`Successfully extracted Instagram data via Apify for ${url}`);
          }
        }
      } catch (err: any) {
        logger.warn(`Failed to extract Instagram data via Apify: ${err.message}. Falling back to RapidAPI.`);
      }
    }

    if (!apiSuccess) {
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

      views = data.play_count || data.view_count || data.video_view_count || data.fb_play_count || 0;
      likes = data.like_count || data.fb_like_count || 0;
      comments = data.comment_count || 0;
      transcript = data.caption?.text || '';
      title = data.title || transcript.substring(0, 50) + '...';
      thumbnail = data.thumbnail_url || data.display_url || '';
      creatorName = data.user?.username || data.owner?.username || '';
      followerCount = data.user?.follower_count || data.owner?.follower_count;
      uploadDate = data.taken_at ? new Date(data.taken_at * 1000) : undefined;
      hashtags = transcript ? transcript.match(/#[\w]+/g) || [] : [];
      mediaUrl = data.video_url || '';
      
      logger.info(`Successfully extracted Instagram data for ${shortcode} (Media ID: ${mediaId})`);
    }

    // Secondary process for actual audio transcript using AssemblyAI
    if (mediaUrl && process.env.ASSEMBLYAI_API_KEY) {
      try {
        logger.info(`Starting AssemblyAI transcription for ${url}`);
        const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
        const transcriptResponse = await client.transcripts.transcribe({
          audio: mediaUrl
        });
        if (transcriptResponse.text) {
          transcript = transcriptResponse.text;
          logger.info(`Successfully extracted true audio transcript via AssemblyAI for ${url}`);
        }
      } catch (err: any) {
        logger.warn(`Failed to extract true audio transcript via AssemblyAI, falling back to caption: ${err.message}`);
      }
    }

    if (!transcript) {
      transcript = "No caption available for this Reel.";
    }

    let engagementRate = 0;
    if (views > 0) {
      engagementRate = Number((((likes + comments) / views) * 100).toFixed(2));
    }

    return {
      transcript,
      views,
      likes,
      comments,
      engagementRate,
      title,
      thumbnail,
      creatorName,
      followerCount,
      hashtags,
      uploadDate,
      duration: undefined
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to extract Instagram data');
    throw new Error('Failed to extract Instagram metadata and caption');
  }
};
