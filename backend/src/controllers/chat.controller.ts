import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { vectorService } from '../services/vector.service';
import { llmService, ChatMessage as LLMChatMessage } from '../services/langchain';
import { logger } from '../utils/logger';
import { ChatSession } from '../models/ChatSession';
import { ChatMessage } from '../models/ChatMessage';
import { ComparisonSession } from '../models/ComparisonSession';
import { IVideoMetadata } from '../models/VideoMetadata';

export const handleChat = async (req: Request, res: Response): Promise<any> => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message query is required and must be a string.' });
  }
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  const runId = uuidv4();
  
  // 0. Setup SSE headers immediately to stream pipeline steps
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  const emitPipelineStep = (step: any) => {
    res.write(`data: ${JSON.stringify({ 
      type: 'pipeline_step', 
      runId,
      timestamp: Date.now(),
      payload: step 
    })}\n\n`);
  };

  emitPipelineStep({ step: 'query_received', status: 'completed', query: message });

  try {
    // 1. Session Handling
    const compSession = await ComparisonSession.findById(sessionId).populate('videoAId').populate('videoBId');
    if (!compSession) {
      throw new Error('Comparison session not found.');
    }

    let chatSession = await ChatSession.findOne({ comparisonSessionId: sessionId });
    if (!chatSession) {
      chatSession = new ChatSession({
        comparisonSessionId: sessionId,
        title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
        messageCount: 0
      });
      await chatSession.save();
    }

    // 2. Sliding Window Memory (last 6 messages)
    const history = await ChatMessage.find({ chatSessionId: chatSession._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    history.reverse(); // oldest -> newest

    const memoryContext = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    emitPipelineStep({ step: 'memory_loaded', status: 'completed', messageCount: memoryContext.length });

    // 3. Query Rewriting
    const tRewriteStart = performance.now();
    const rewrittenQuery = await llmService.rewriteQuery(message, memoryContext);
    const rewriteLatency = performance.now() - tRewriteStart;

    emitPipelineStep({ step: 'query_rewritten', status: 'completed', rewrittenQuery });

    // 4. Semantic Retrieval
    const tRetrievalStart = performance.now();
    const embeddedQuery = await vectorService.embedText(rewrittenQuery);
    
    // Query pinecone filtered by this session ID
    const matches = await vectorService.querySimilarity(embeddedQuery, 6, { sessionId });
    const retrievalLatency = performance.now() - tRetrievalStart;

    // Extract citations
    const citations = matches.map(match => ({
      source: match.metadata?.source,
      chunkIndex: match.metadata?.chunkIndex,
      text: match.metadata?.text,
      score: match.score,
    }));

    // 5. Construct Prompts separately
    const contextText = citations
      .map((match, index) => `Source: ${match.source}\nText: ${match.text}`)
      .join('\n\n');

    const videoA = compSession.videoAId as any;
    const videoB = compSession.videoBId as any;

    const systemPrompt = `You are a Social Media Video Comparison Analyst.
Your goal is to answer the user's question accurately using ONLY the provided document context chunks and metadata.

Video A (YouTube):
- Views: ${videoA.views}
- Likes: ${videoA.likes}
- Comments: ${videoA.comments}
- Engagement Rate: ${videoA.engagementRate}%

Video B (Instagram Reel):
- Views: ${videoB.views}
- Likes: ${videoB.likes}
- Comments: ${videoB.comments}
- Engagement Rate: ${videoB.engagementRate}%

Strict Guidelines:
1. Base your answer solely on the provided metadata and context. Do NOT use outside information or speculation.
2. Compare the two videos effectively if asked.
3. If the answer cannot be found in the context, explicitly say so.
4. Keep your answers highly clear, detailed, and structured.
5. Use the conversation memory ONLY for context, but answer based on the CONTEXT chunks.

CONTEXT CHUNKS:
${contextText}`;

    const messages: LLMChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...memoryContext as LLMChatMessage[],
      { role: 'user', content: message },
    ];

    emitPipelineStep({ step: 'prompt_compiled', status: 'completed' });

    // Persist User Message
    await ChatMessage.create({
      chatSessionId: chatSession._id,
      role: 'user',
      content: message,
    });
    chatSession.messageCount += 1;
    chatSession.lastMessageAt = new Date();
    await chatSession.save();

    // Send citations and metrics first
    const metadata = {
      originalQuery: message,
      rewrittenQuery,
      rewriteLatency,
      retrievalLatency,
    };

    res.write(`data: ${JSON.stringify({ 
      type: 'citations', 
      citations,
      metrics: metadata,
      sessionId: chatSession._id
    })}\n\n`);

    // 7. Stream LLM response
    emitPipelineStep({ step: 'generation_started', status: 'completed' });

    const tGenStart = performance.now();
    let fullResponse = '';
    
    await llmService.generateResponse(messages, (token) => {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    });
    const generationLatency = performance.now() - tGenStart;
    
    emitPipelineStep({ step: 'generation_completed', status: 'completed' });

    // Persist Assistant Message
    await ChatMessage.create({
      chatSessionId: chatSession._id,
      role: 'assistant',
      content: fullResponse,
      citations,
      retrievalMetadata: {
        ...metadata,
        generationLatency,
      }
    });
    chatSession.messageCount += 1;
    chatSession.lastMessageAt = new Date();
    await chatSession.save();

    // Send completed signal
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    logger.error({ err: error }, 'RAG Chat pipeline error');
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Internal RAG error' })}\n\n`);
      res.end();
    } else {
      return res.status(500).json({ error: error.message || 'Internal RAG error' });
    }
  }
};

export const getSessionMessages = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params; // comparisonSessionId
    
    const session = await ChatSession.findOne({ comparisonSessionId: id });
    if (!session) return res.json([]); // No chat history yet

    const messages = await ChatMessage.find({ chatSessionId: session._id })
      .sort({ createdAt: 1 })
      .lean();
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
