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

    urls.forEach((url) => {
      const alreadyIngested = chatSession.ingestedVideos.some(v => v.url === url);
      if (!alreadyIngested) {
        newUrlsToIngest.push(url);
      }
    });

    // 3. Ingestion Pipeline (if new URLs detected)
    if (newUrlsToIngest.length > 0) {
      emitPipelineStep({ step: 'ingestion_started', status: 'processing', urls: newUrlsToIngest });

      for (const url of newUrlsToIngest) {
        try {
          emitPipelineStep({ step: 'ingestion_started', status: 'processing', url });
          
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
        } catch (err: any) {
          logger.error(`Failed to queue/ingest ${url}`, err);
          emitPipelineStep({ step: `ingestion_failed`, status: 'error', url, error: err.message });
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

    // 4. Intent Decision: Auto-Insight Generation for pure URL ingestions
    let queryToProcess = textContent;
    if (!textContent && urls.length > 0) {
      queryToProcess = urls.length > 1 
        ? "Analyze the hooks, pacing, and engagement of the videos I just provided. Which one performed better and what can I learn from it to improve my own content? Compare them directly."
        : "Analyze the hook, storytelling, and engagement of the video I just provided. Provide actionable recommendations on how I can apply these strategies to my own content.";
    }

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
        text: `Creator: ${md.creatorName}, Views: ${md.views}, Likes: ${md.likes}, Comments: ${md.comments}, Engagement: ${md.engagementRate}%.`,
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

    const systemPrompt = `You are a Creator Performance Analyst & Coach.
Your goal is to help the user understand why videos succeed, compare engagement metrics, and provide highly actionable advice for their own content strategy.

Strict Guidelines:
1. You may use your general knowledge of social media strategy (e.g., hooks, pacing, retention tactics) to analyze the provided data.
2. If the user asks a question about metrics (views, likes, creator name), answer it using the Metadata provided in the CONTEXT.
3. If the user asks about the content, refer to the transcript chunks in the CONTEXT.
4. MANDATORY: Whenever you state a fact, metric, or quote, you MUST include an inline HTML citation tag like <cite>1</cite> or <cite>2</cite> matching the index in the CONTEXT below. Do NOT use plain brackets like [1] or [Video 1]. You must strictly use the <cite> HTML tag.
5. If you are comparing videos, explicitly break down the differences in their hooks, storytelling, or engagement rates.
6. MANDATORY: Use rich Markdown formatting (e.g., ### Headings, **bold text**, bullet points) to structure your answer cleanly. Do not output giant walls of plain text.

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
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
