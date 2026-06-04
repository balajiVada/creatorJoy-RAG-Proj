import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { vectorService } from '../services/vector.service';
import { llmService, ChatMessage as LLMChatMessage } from '../services/langchain';
import { logger } from '../utils/logger';
import { ChatSession } from '../models/ChatSession';
import { ChatMessage } from '../models/ChatMessage';
import { VideoMetadata } from '../models/VideoMetadata';
import { ingestionQueue, ingestionQueueEvents } from '../services/queue.service';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const handleChat = async (req: Request, res: Response): Promise<any> => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const runId = uuidv4();
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  let lastStepTime = Date.now();

  const emitPipelineStep = (step: any) => {
    const now = Date.now();
    const durationMs = now - lastStepTime;
    lastStepTime = now;
    
    res.write(`data: ${JSON.stringify({ 
      type: 'pipeline_step', 
      runId,
      payload: { ...step, timestamp: now, durationMs } 
    })}\n\n`);
  };

  emitPipelineStep({ step: 'query_received', status: 'completed', query: message });

  try {
    // 1. Session Handling
    let chatSession;
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      if (!chatSession) {
        throw new Error('Chat session not found.');
      }
    } else {
      chatSession = new ChatSession({
        title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
        ingestedVideos: [],
        messageCount: 0
      });
      await chatSession.save();
    }

    // 2. URL Extraction & Intent Routing
    const urls = message.match(URL_REGEX) || [];
    const textContent = message.replace(URL_REGEX, '').trim();
    const newUrlsToIngest: string[] = [];
    const uiComponents: any[] = [];
    const newlyIngestedMetadata: any[] = [];

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}/i;
    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p)\/[a-zA-Z0-9_-]+/i;

    for (const url of urls) {
      const isYT = youtubeRegex.test(url);
      const isIG = instagramRegex.test(url);

      if (!isYT && !isIG) {
        emitPipelineStep({ 
          step: 'ingestion_failed', 
          status: 'error', 
          url, 
          error: 'Unsupported URL platform. Only YouTube and Instagram Reels/Posts are supported.' 
        });
        
        res.write(`data: ${JSON.stringify({ 
          type: 'ui_component', 
          component: 'error_card', 
          props: { url, error: 'Unsupported URL platform. Please provide a valid YouTube or Instagram link.' } 
        })}\n\n`);
        continue;
      }

      const alreadyIngested = chatSession.ingestedVideos.some(v => v.url === url);
      if (!alreadyIngested) {
        newUrlsToIngest.push(url);
      }
    }

    // 3. Ingestion Pipeline (if new URLs detected)
    if (newUrlsToIngest.length > 0) {
      emitPipelineStep({ step: 'ingestion_started', status: 'processing', urls: newUrlsToIngest });

      for (const url of newUrlsToIngest) {
        try {
          emitPipelineStep({ step: 'ingestion_started', status: 'processing', url });
          
          // Check if video exists globally in database (re-use cache)
          const existingMetadata = await VideoMetadata.findOne({ url, extractionStatus: 'success' });
          
          if (existingMetadata) {
            logger.info(`Global metadata cache hit for ${url}. Reusing existing extraction.`);
            
            // Clone Pinecone vectors from old session namespace to current session namespace
            await vectorService.cloneVectorsToNewSession(
              existingMetadata.chatSessionId.toString(),
              chatSession._id.toString(),
              existingMetadata._id.toString()
            );

            // Create a session-specific copy of the metadata
            const newMetadata = await VideoMetadata.create({
              url,
              platform: existingMetadata.platform,
              chatSessionId: chatSession._id,
              transcript: existingMetadata.transcript,
              views: existingMetadata.views,
              likes: existingMetadata.likes,
              comments: existingMetadata.comments,
              engagementRate: existingMetadata.engagementRate,
              extractionStatus: 'success',
              extractedAt: new Date(),
              title: existingMetadata.title,
              thumbnail: existingMetadata.thumbnail,
              creatorName: existingMetadata.creatorName
            });

            chatSession.ingestedVideos.push({ url, metadataId: newMetadata._id as any });
            await chatSession.save();

            newlyIngestedMetadata.push(newMetadata.toJSON());
            
            const platformName = existingMetadata.platform === 'youtube' ? 'youtube' : 'instagram';
            emitPipelineStep({ step: `ingested_${platformName}`, status: 'completed', url, cached: true });
          } else {
            // Not cached, run scraping job in worker queue
            const job = await ingestionQueue.add('ingest-video', { url, chatSessionId: chatSession._id.toString() });
            
            const progressListener = (args: { jobId: string; data: any | string }) => {
              if (args.jobId === job.id) {
                emitPipelineStep(args.data);
              }
            };
            
            ingestionQueueEvents.on('progress', progressListener);
            
            try {
              const metadata = await job.waitUntilFinished(ingestionQueueEvents);
              newlyIngestedMetadata.push(metadata);
            } finally {
              ingestionQueueEvents.off('progress', progressListener);
            }
          }
        } catch (err: any) {
          logger.error(`Failed to queue/ingest ${url}`, err);
          emitPipelineStep({ step: `ingestion_failed`, status: 'error', url, error: err.message });
          
          res.write(`data: ${JSON.stringify({ 
            type: 'ui_component', 
            component: 'error_card', 
            props: { url, error: err.message || 'Failed to ingest video' } 
          })}\n\n`);
        }
      }

      // Generate UI Components based on what was ingested
      if (newlyIngestedMetadata.length === 1) {
        uiComponents.push({
          type: 'video_card',
          props: newlyIngestedMetadata[0]
        });
      } else if (newlyIngestedMetadata.length > 1) {
        uiComponents.push({
          type: 'comparison_view',
          props: { videos: newlyIngestedMetadata }
        });
      }
    }

    // Persist User Message
    await ChatMessage.create({
      chatSessionId: chatSession._id,
      role: 'user',
      content: message,
    });
    chatSession.messageCount += 1;
    await chatSession.save();

    // 4. Determine Query to Process
    const queryToProcess = message;

    // 5. Retrieval Pipeline (for actual text queries)
    const history = await ChatMessage.find({ chatSessionId: chatSession._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    history.reverse();
    
    emitPipelineStep({ step: 'memory_loaded', status: 'completed' });

    const memoryContext = history.map(msg => ({ role: msg.role, content: msg.content }));

    const rewrittenQuery = await llmService.rewriteQuery(queryToProcess, memoryContext);
    
    emitPipelineStep({ 
      step: 'query_rewritten', 
      status: 'completed', 
      rewrittenQuery: rewrittenQuery,
      wasRewritten: rewrittenQuery !== queryToProcess
    });
    
    // NEW: Intent Classification for metadata routing
    const intent = await llmService.classifyIntent(rewrittenQuery);
    
    // Fetch all metadata for this session to inject into prompt and citations
    const allMetadata = await VideoMetadata.find({ chatSessionId: chatSession._id });
    
    // Create lookup map
    const metadataMap = new Map(allMetadata.map(md => [md._id.toString(), md]));

    let citations: any[] = [];
    
    // First, add all metadata as base citations so the LLM can cite general video facts
    allMetadata.forEach((md) => {
      citations.push({
        source: md.platform,
        text: `Creator: ${md.creatorName}, Followers: ${md.followerCount || 'N/A'}, Views: ${md.views}, Likes: ${md.likes}, Comments: ${md.comments}, Engagement: ${md.engagementRate}%, Uploaded: ${md.uploadDate ? new Date(md.uploadDate).toLocaleDateString() : 'Unknown'}, Duration: ${md.duration || 'Unknown'}, Hashtags: ${md.hashtags?.join(', ') || 'None'}.`,
        title: md.title,
        thumbnail: md.thumbnail
      });
    });
    
    emitPipelineStep({ step: 'retrieval_started', status: 'processing' });

    if (intent === 'REQUIRES_TRANSCRIPT') {
      const embeddedQuery = await vectorService.embedText(rewrittenQuery);
      const matches = await vectorService.querySimilarity(embeddedQuery, 6, { sessionId: chatSession._id.toString() });
      
      emitPipelineStep({ 
        step: 'semantic_search_completed', 
        status: 'completed',
        chunksRetrieved: matches.length,
        topScores: matches.map(m => m.score)
      });

      matches.forEach(match => {
        const videoId = match.metadata?.videoId;
        const md = videoId ? metadataMap.get(videoId.toString()) : null;
        
        citations.push({
          source: match.metadata?.source,
          chunkIndex: match.metadata?.chunkIndex,
          text: match.metadata?.text,
          score: match.score,
          title: md?.title,
          thumbnail: md?.thumbnail
        });
      });
    }

    const contextText = citations.map((c, idx) => `[${idx + 1}] Source: ${c.title || c.source}\nText: ${c.text}`).join('\n\n');
    
    emitPipelineStep({ 
      step: 'context_compiled', 
      status: 'completed',
      tokenEstimate: Math.round(contextText.length / 4),
      chunksUsed: citations.length
    });

    const systemPrompt = `You are an advanced Creator Performance Analyst & Coach, deeply integrated into a backend system.
The system automatically scrapes, processes, and provides you with the transcripts and metadata for any Instagram or YouTube URLs the user drops into the chat.

CRITICAL RULES FOR HANDLING URLs:
1. The user's query may contain raw URLs. The content for these URLs has ALREADY been extracted and is provided to you in the CONTEXT below.
2. YOU MUST NEVER say "I cannot directly open links", "I don't have internet access", or anything similar. You are an integrated system. You HAVE the data.
3. If the user only pastes a URL, your job is to proactively analyze its hook, storytelling, and engagement strategy using the CONTEXT.

GENERAL GUIDELINES:
- Use your knowledge of social media strategy to explain *why* something worked (hooks, pacing, retention tactics).
- When you state a fact, metric, or quote, you MUST use an inline HTML citation tag like <cite>1</cite> or <cite>2</cite> matching the index in the CONTEXT. Do NOT use plain brackets like [1].
- Use rich Markdown formatting (Headings, bullet points, bold text).
- If comparing videos, explicitly break down differences in their hooks, storytelling, or engagement rates.

---
FEW-SHOT EXAMPLES:

Example 1: Single URL
User: "https://www.instagram.com/reel/DY7SJ3AlZz_/"
Assistant: "This Reel by Leonardo Dreyer uses an excellent rapid-fire hook. Let's break down why it works:<br><br>### The Hook<br>He immediately jumps into the pronunciation correction without any fluff <cite>2</cite>. <br><br>### Performance<br>The engagement rate sits at a solid 7.04% <cite>1</cite>, which shows the audience found it highly educational..."

Example 2: Multiple URLs
User: "Which of these two hooks is better? [URL 1] and [URL 2]"
Assistant: "Between these two videos, [URL 1] has a much stronger retention strategy. While the first video immediately establishes the problem <cite>3</cite>, the second video wastes 5 seconds on an intro graphic <cite>5</cite>..."

Example 3: Follow-up Question
User: "How can I apply that same hook to a fitness video?"
Assistant: "To adapt that rapid-fire hook for a fitness context, you could start immediately with: 'It's not a squat, it's a *squat*.' Don't do an intro, just jump straight into the form correction..."

Example 4: Normal Conversation (No URLs)
User: "What makes a good hook on Instagram Reels?"
Assistant: "A great hook on Reels needs to capture attention within the first 3 seconds. The best strategies include..."
---

CONTEXT (Metadata and Transcript Chunks):
${citations.length > 0 ? contextText : 'No context loaded.'}
`;

    const messages: LLMChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...memoryContext as LLMChatMessage[],
      { role: 'user', content: queryToProcess },
    ];

    emitPipelineStep({ step: 'prompt_compiled', status: 'completed' });

    res.write(`data: ${JSON.stringify({ 
      type: 'citations', 
      citations,
      sessionId: chatSession._id 
    })}\n\n`);

    // Emit UI components for the RAG pipeline branch
    if (uiComponents.length > 0) {
      uiComponents.forEach(ui => {
        res.write(`data: ${JSON.stringify({ type: 'ui_component', component: ui.type, props: ui.props })}\n\n`);
      });
    }

    emitPipelineStep({ step: 'generation_started', status: 'completed' });

    let fullResponse = '';
    await llmService.generateResponse(messages, (token) => {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    });
    
    emitPipelineStep({ 
      step: 'generation_completed', 
      status: 'completed',
      totalTokens: Math.round(fullResponse.length / 4)
    });

    await ChatMessage.create({
      chatSessionId: chatSession._id,
      role: 'assistant',
      content: fullResponse,
      citations,
      uiComponents // Save UI Components to DB
    });
    chatSession.messageCount += 1;
    chatSession.lastMessageAt = new Date();
    await chatSession.save();

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    logger.error({ err: error }, 'RAG Chat pipeline error');
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Internal error' })}\n\n`);
      res.end();
    } else {
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }
};

export const getSessions = async (req: Request, res: Response): Promise<any> => {
  try {
    const sessions = await ChatSession.find()
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(sessions);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getSessionMessages = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params; 
    
    const session = await ChatSession.findById(id);
    if (!session) return res.json([]); 

    const messages = await ChatMessage.find({ chatSessionId: session._id })
      .sort({ createdAt: 1 })
      .lean();
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await ChatSession.findByIdAndDelete(id);
    await ChatMessage.deleteMany({ chatSessionId: id });
    await VideoMetadata.deleteMany({ chatSessionId: id });
    await vectorService.deleteSessionVectors(id as string);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
