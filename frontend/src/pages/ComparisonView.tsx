import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSession, extractSession } from '../lib/api';
import { Loader2, MonitorPlay, Smartphone, MessageSquare, Heart, Eye, Activity, Send, RefreshCw, BookOpen } from 'lucide-react';
import { Card } from '../components/ui/Card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Citation {
  source: string;
  chunkIndex: number;
  text: string;
  score: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export const ComparisonView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        if (!id) return;
        const currentSession = await getSession(id);
        
        if (currentSession.videoAId?.extractionStatus === 'success' && currentSession.videoBId?.extractionStatus === 'success') {
          setSession(currentSession);
          setIsExtracting(false);
          fetchChatHistory();
          return;
        }

        const updatedSession = await extractSession(id);
        setSession(updatedSession);
        fetchChatHistory();
      } catch (err: any) {
        setError(err.message || 'Failed to extract video data');
      } finally {
        setIsExtracting(false);
      }
    };
    initSession();
  }, [id]);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`http://localhost:5005/api/chat/${id}/messages`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data.map((msg: any) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          citations: msg.citations
        })));
      }
    } catch (err) {
      console.error("Failed to load chat history");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || !id) return;

    setInput('');
    setIsChatLoading(true);

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: query };
    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true, citations: [] };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);

    try {
      const response = await fetch(`http://localhost:5005/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, sessionId: id }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream available');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'citations') {
                setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, citations: data.citations } : msg));
              } else if (data.type === 'token') {
                setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, content: msg.content + data.token } : msg));
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (err) {
              console.error('Parse err:', err);
            }
          }
        }
      }
      setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg));
    } catch (error: any) {
      setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, content: `Error: ${error.message}`, isStreaming: false } : msg));
    } finally {
      setIsChatLoading(false);
    }
  };

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-400 p-8 text-center">{error}</div>;
  }

  if (isExtracting || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-medium text-white">Extracting Data & Transcripts...</h2>
        <p className="text-foreground/60 mt-2">This may take a moment</p>
      </div>
    );
  }

  const { videoAId: videoA, videoBId: videoB } = session;

  const MetricRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 text-foreground/80">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-semibold text-white">{value?.toLocaleString() || 'N/A'}</span>
    </div>
  );

  return (
    <div className="h-screen flex animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] -z-10 mix-blend-screen" />
      
      {/* LEFT COLUMN: Metadata Dashboard */}
      <div className="w-1/2 h-full overflow-y-auto p-8 border-r border-white/10">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">Comparison Dashboard</h1>
            <p className="text-foreground/60 font-mono text-xs">Session: {id}</p>
          </div>

          {/* YouTube Card */}
          <Card className="border-red-500/20 bg-black/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <div className="flex items-center gap-3 mb-6">
              <MonitorPlay className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-white">YouTube</h2>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
              <MetricRow icon={Activity} label="Engagement Rate" value={`${videoA.engagementRate}%`} />
              <MetricRow icon={Eye} label="Views" value={videoA.views} />
              <MetricRow icon={Heart} label="Likes" value={videoA.likes} />
              <MetricRow icon={MessageSquare} label="Comments" value={videoA.comments} />
            </div>
          </Card>

          {/* Instagram Card */}
          <Card className="border-pink-500/20 bg-black/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-6 h-6 text-pink-500" />
              <h2 className="text-xl font-bold text-white">Instagram Reel</h2>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
              <MetricRow icon={Activity} label="Engagement Rate" value={`${videoB.engagementRate}%`} />
              <MetricRow icon={Eye} label="Views" value={videoB.views} />
              <MetricRow icon={Heart} label="Likes" value={videoB.likes} />
              <MetricRow icon={MessageSquare} label="Comments" value={videoB.comments} />
            </div>
          </Card>
        </div>
      </div>

      {/* RIGHT COLUMN: RAG Chat Interface */}
      <div className="w-1/2 h-full flex flex-col bg-black/20">
        <div className="h-16 border-b border-white/10 flex items-center px-6 shrink-0 bg-white/5">
          <BookOpen size={18} className="text-primary mr-3" />
          <span className="font-medium text-white">Video Analysis Chat</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <MessageSquare size={40} className="mb-4 text-primary" />
              <p className="text-center">Ask a question about these two videos!</p>
              <p className="text-sm mt-2">Example: "Which video had better engagement and why?"</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-primary/20 border border-primary/30 text-white rounded-2xl rounded-tr-sm px-5 py-3 text-[15px] max-w-[85%]">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex gap-4 w-full">
                    <div className="w-8 h-8 rounded-full bg-primary flex flex-col items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                      AI
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="text-[15px] text-white/90 leading-relaxed bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-4">
                        {msg.content === '' && msg.isStreaming ? (
                          <span className="flex items-center gap-2 text-white/50 text-sm">
                            <RefreshCw size={14} className="animate-spin" /> Thinking...
                          </span>
                        ) : (
                          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                        
                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/10">
                            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-2">Sources Referenced</span>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((c, i) => (
                                <div key={i} className="px-2 py-1 bg-black/40 border border-white/10 rounded-md text-[11px] flex items-center gap-1.5 text-white/70">
                                  {c.source === 'youtube' ? <MonitorPlay size={10} className="text-red-500" /> : <Smartphone size={10} className="text-pink-500" />}
                                  <span>{c.source} Transcript</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-black/40 border-t border-white/10 shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-2 bg-white/5 rounded-xl border border-white/10 p-2 focus-within:border-primary/50 transition-colors">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isChatLoading}
              placeholder="Ask anything about the videos..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-2 max-h-32 text-sm text-white placeholder:text-white/30"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={isChatLoading || !input.trim()}
              className="p-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
