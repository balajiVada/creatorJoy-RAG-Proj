import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { vectorService } from '../services/vector.service';
import { llmService, ChatMessage as LLMChatMessage } from '../services/langchain';
import { logger } from '../utils/logger';
import { ChatSession } from '../models/ChatSession';
import { ChatMessage } from '../models/ChatMessage';
import { VideoMetadata } from '../models/VideoMetadata';
import { extractYouTubeData, extractInstagramData } from '../services/extraction.service';
import { chunkingService } from '../services/chunking.service';

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
          const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
          const platform = isYouTube ? 'youtube' : 'instagram';
          
          emitPipelineStep({ step: `extracting_${platform}`, status: 'processing', url });
          
          // A. Extraction
          const data = isYouTube ? await extractYouTubeData(url) : await extractInstagramData(url);
          
          // D. Save Metadata
          const metadata = await VideoMetadata.create({
            url,
            platform,
            chatSessionId: chatSession._id,
            transcript: data.transcript,
            views: data.views,
            likes: data.likes,
            comments: data.comments,
            engagementRate: data.engagementRate,
            extractionStatus: 'success',
            extractedAt: new Date()
          });
          
          // B. Chunking
          const chunks = await chunkingService.splitText(data.transcript);
          
          // C. Vectorization
          await vectorService.upsertTranscriptVectors(
            chatSession._id.toString(), 
            metadata._id.toString(), 
            platform, 
            chunks
          );

          // E. Link to Session
          chatSession.ingestedVideos.push({ url, metadataId: metadata._id as any });
          await chatSession.save();

          emitPipelineStep({ step: `ingested_${platform}`, status: 'completed', url });
        } catch (err: any) {
          logger.error(`Failed to ingest ${url}`, err);
          emitPipelineStep({ step: `ingestion_failed`, status: 'error', url, error: err.message });
        }
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

    // 4. Intent Decision: If only URLs were sent, just return a confirmation
    if (!textContent && urls.length > 0) {
      const confirmMsg = `I have successfully ingested ${newUrlsToIngest.length} new video(s). What would you like to know about them?`;
      
      await ChatMessage.create({
        chatSessionId: chatSession._id,
        role: 'assistant',
        content: confirmMsg,
      });
      chatSession.messageCount += 1;
      chatSession.lastMessageAt = new Date();
      await chatSession.save();

      // We must send the sessionId to the client so it knows the new session ID
      res.write(`data: ${JSON.stringify({ type: 'citations', citations: [], sessionId: chatSession._id })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'token', token: confirmMsg })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      return res.end();
    }

    // 5. Retrieval Pipeline (for actual text queries)
    const history = await ChatMessage.find({ chatSessionId: chatSession._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    history.reverse();

    const memoryContext = history.map(msg => ({ role: msg.role, content: msg.content }));

    const rewrittenQuery = await llmService.rewriteQuery(textContent, memoryContext);
    
    // Query pinecone filtered by chatSessionId
    const embeddedQuery = await vectorService.embedText(rewrittenQuery);
    const matches = await vectorService.querySimilarity(embeddedQuery, 6, { sessionId: chatSession._id.toString() });

    const citations = matches.map(match => ({
      source: match.metadata?.source,
      chunkIndex: match.metadata?.chunkIndex,
      text: match.metadata?.text,
      score: match.score,
    }));

    const contextText = citations.map(match => `Source: ${match.source}\nText: ${match.text}`).join('\n\n');

    // Fetch all metadata for this session to inject into prompt
    const allMetadata = await VideoMetadata.find({ chatSessionId: chatSession._id });
    const metadataStats = allMetadata.map(md => 
      `${md.platform.toUpperCase()} (${md.url}): Views: ${md.views}, Likes: ${md.likes}, Engagement: ${md.engagementRate}%`
    ).join('\n');

    const systemPrompt = `You are a Social Media Video Analyst.
Your goal is to answer the user's question accurately using ONLY the provided document context chunks and metadata.

Ingested Videos Metadata:
${metadataStats || 'No videos ingested yet.'}

Strict Guidelines:
1. Base your answer solely on the provided metadata and context chunks. Do NOT use outside information.
2. If the user asks to compare videos, compare their engagement and context effectively.
3. If the answer cannot be found in the context, explicitly say so.
4. Use the conversation memory ONLY for context, but answer based on the CONTEXT CHUNKS.

CONTEXT CHUNKS:
${contextText}`;

    const messages: LLMChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...memoryContext as LLMChatMessage[],
      { role: 'user', content: textContent },
    ];

    emitPipelineStep({ step: 'prompt_compiled', status: 'completed' });

    res.write(`data: ${JSON.stringify({ 
      type: 'citations', 
      citations,
      sessionId: chatSession._id 
    })}\n\n`);

    emitPipelineStep({ step: 'generation_started', status: 'completed' });

    let fullResponse = '';
    await llmService.generateResponse(messages, (token) => {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    });
    
    emitPipelineStep({ step: 'generation_completed', status: 'completed' });

    await ChatMessage.create({
      chatSessionId: chatSession._id,
      role: 'assistant',
      content: fullResponse,
      citations
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
