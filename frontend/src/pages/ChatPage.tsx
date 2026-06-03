import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  RefreshCw, 
  BookOpen, 
  ArrowRight,
  Trash2,
  PanelLeft,
  Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useChatStore } from '../stores/useChatStore';
import { usePipelineInspectorStore } from '../stores/usePipelineInspectorStore';
import { PipelineInspector } from '../components/PipelineInspector';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
import { VideoCard } from '../components/VideoCard';
import { ComparisonView } from '../components/ComparisonView';
import { CitationTooltip } from '../components/CitationTooltip';
import { ErrorCard } from '../components/ErrorCard';

interface Citation {
  source?: string;
  chunkIndex?: number;
  text?: string;
  score?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  uiComponents?: {
    type: 'video_card' | 'comparison_view' | 'error_card';
    props: any;
  }[];
}

function ChatPage() {
  const { sessions, activeSessionId, isLoadingSessions, fetchSessions, setActiveSession, deleteSession } = useChatStore();
  const { addStep, resetRun } = usePipelineInspectorStore();

  const [showDebug, setShowDebug] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/chat/sessions/${activeSessionId}/messages`);
        const data = await response.json();
        const mappedMessages = data.map((msg: any) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          uiComponents: msg.uiComponents
        }));
        setMessages(mappedMessages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages();
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) setInput('');
    setIsLoading(true);

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: query };
    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true, citations: [], uiComponents: [] };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    resetRun(Date.now().toString()); 

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, sessionId: activeSessionId }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream available');

      let buffer = '';
      let detectedSessionId = activeSessionId;
      
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
                if (data.sessionId && data.sessionId !== activeSessionId) {
                  detectedSessionId = data.sessionId;
                }
                setMessages((prev) =>
                  prev.map((msg) => msg.id === assistantMsgId ? { ...msg, citations: data.citations } : msg)
                );
              } else if (data.type === 'token') {
                setMessages((prev) =>
                  prev.map((msg) => msg.id === assistantMsgId ? { ...msg, content: msg.content + data.token } : msg)
                );
              } else if (data.type === 'ui_component') {
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id === assistantMsgId) {
                      const newComponents = [...(msg.uiComponents || []), { type: data.component, props: data.props }];
                      return { ...msg, uiComponents: newComponents as any };
                    }
                    return msg;
                  })
                );
              } else if (data.type === 'pipeline_step') {
                addStep(data.runId, data.payload);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (err) {
              console.error('SSE Error:', err);
            }
          }
        }
      }
      
      setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg));
      
      if (detectedSessionId && detectedSessionId !== activeSessionId) {
        await fetchSessions();
        setActiveSession(detectedSessionId);
      }
    } catch (error: any) {
      setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, content: `Error: ${error.message}`, isStreaming: false } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionPrompts = [
    "What's the engagement rate difference?",
    "Summarize the key points of the YouTube video.",
    "Which video format performs better here?",
  ];

  const renderUserMessage = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-lime underline decoration-accent-lime/30 underline-offset-2 hover:text-white transition-colors break-all">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden font-sans relative">
      {/* Mobile Backdrop */}
      {isMobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity" onClick={() => setIsMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-canvas-dark bg-starfield text-on-primary flex flex-col shadow-xl transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-[260px]' : 'w-[72px]'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className={`p-4 flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} mt-2`}>
          {isSidebarExpanded && <h1 className="text-xl font-bold font-display tracking-normal text-on-primary truncate px-2">Video RAG</h1>}
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 rounded-md hover:bg-white/10 text-white/70 hover:text-white hidden md:block">
            <PanelLeft size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto relative z-10 pb-32">
          <button onClick={() => { setActiveSession(null); setMessages([]); }} className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-[14px] font-bold uppercase tracking-[0.2px] text-on-primary bg-on-dark-faint hover:bg-surface-night transition-all border border-hairline-violet shadow-sm mb-6">
            <Plus size={16} />
            {isSidebarExpanded && <span>New Analysis</span>}
          </button>

          {isSidebarExpanded && (
            <>
              <div className="pt-2 pb-3 px-2">
                <span className="text-[10px] font-bold text-on-dark-muted uppercase tracking-[0.25px]">Recent Sessions</span>
              </div>
              {isLoadingSessions ? (
                <div className="px-3 text-sm text-on-dark-muted animate-pulse">Loading...</div>
              ) : (
                sessions.map(session => (
                  <div key={session._id} className="group relative flex items-center pr-1 mb-1">
                    <button onClick={() => setActiveSession(session._id)} className={`flex-1 text-left px-3 py-2 rounded-md text-[14px] truncate transition-all font-medium ${activeSessionId === session._id ? 'bg-on-dark-faint text-on-primary shadow-sm' : 'text-on-dark-muted hover:bg-on-dark-faint/50 hover:text-on-primary'}`}>
                      {session.title}
                    </button>
                    <button onClick={async (e) => { e.stopPropagation(); await deleteSession(session._id); if (activeSessionId === session._id) setMessages([]); }} className="absolute right-1 opacity-0 group-hover:opacity-100 p-1.5 text-on-dark-muted hover:text-error hover:bg-on-dark-faint rounded transition-all bg-canvas-dark" title="Delete Chat">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </nav>

        {/* Sticker Mascot Layer (Sentry-style decorative floating element) */}
        {isSidebarExpanded && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none -rotate-6">
             <div className="w-16 h-16 bg-accent-pink rounded-xxl flex items-center justify-center shadow-lg border border-primary relative">
                <span className="text-3xl rotate-12">👾</span>
                <div className="absolute -bottom-2 -right-4 bg-accent-lime text-ink-press px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs tracking-[0.25px] border border-primary shadow-sm whitespace-nowrap">Debugging</div>
             </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col relative min-w-0 bg-canvas transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'md:ml-[260px]' : 'md:ml-[72px]'}`}>
        <header className="h-16 border-b border-border-light flex items-center justify-between px-4 sm:px-6 bg-canvas z-10 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-primary hidden sm:block" />
            <span className="text-[14px] font-medium text-ink tracking-tight truncate">Video Analysis Dashboard</span>
          </div>
          <button onClick={() => setShowDebug(!showDebug)} className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-primary text-white shadow-inner' : 'bg-soft-stone text-muted hover:text-ink'}`} title="Toggle Inspector">
            <Settings size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto space-y-12 animate-in pb-20">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm">
                <MessageSquare size={32} className="text-primary" />
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold font-cohere-display text-ink">
                  Video Intent <span className="bg-accent-lime px-2 py-1 rounded-xs text-ink-press">Analyzer</span>
                </h2>
                <p className="text-muted text-[16px] max-w-xl mx-auto leading-relaxed">
                  Paste any YouTube or Instagram Reel links. I will automatically extract the video context and compare engagement metrics. Ask any questions!
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-8">
                {suggestionPrompts.map((prompt, idx) => (
                  <button key={idx} onClick={() => handleSend(prompt)} className="p-4 text-left bg-canvas border border-border-light rounded-xl hover:border-primary hover:shadow-md transition-all text-[14px] text-ink flex items-center justify-between group">
                    <span className="truncate pr-4 font-sans">{prompt}</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-10 pb-8">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4 animate-in">
                  <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-surface-night border border-hairline-violet text-on-primary rounded-xl px-6 py-4 text-[16px] max-w-[80%] shadow-md font-sans leading-relaxed whitespace-pre-wrap">
                        {renderUserMessage(msg.content)}
                      </div>
                    ) : (
                      <div className="flex gap-5 items-start w-full">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm mt-1 shadow-md shrink-0">AI</div>
                        <div className="flex-1 space-y-5">
                          
                          {/* Generative UI Components */}
                          {msg.uiComponents && msg.uiComponents.length > 0 && (
                            <div className="flex flex-col gap-4 w-full">
                              {msg.uiComponents.map((ui, idx) => (
                                <div key={idx} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                                  {ui.type === 'video_card' && <VideoCard {...ui.props} />}
                                  {ui.type === 'comparison_view' && <ComparisonView {...ui.props} />}
                                  {ui.type === 'error_card' && (
                                    <ErrorCard 
                                      {...ui.props} 
                                      onRetry={() => handleSend(ui.props.url)} 
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.content === '' && msg.isStreaming ? (
                            <div className="text-[16px] leading-relaxed text-ink font-sans">
                              <span className="flex items-center gap-2 text-muted text-sm font-medium mt-2">
                                <RefreshCw size={16} className="animate-spin text-accent-violet-deep" /> Analyzing intent & routing pipeline...
                              </span>
                            </div>
                          ) : msg.content ? (
                            <div className="text-[16px] leading-relaxed text-ink font-sans">
                              <div className="prose prose-zinc max-w-none prose-headings:font-bold prose-headings:text-ink prose-p:text-ink/90 prose-strong:text-ink prose-strong:font-bold prose-a:text-accent-violet prose-li:text-ink/90 prose-li:marker:text-accent-violet-deep prose-blockquote:border-accent-violet prose-blockquote:bg-surface-press-stronger prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-md prose-blockquote:not-italic prose-blockquote:text-ink/80">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    cite: ({ children }) => {
                                      const indexText = Array.isArray(children) ? children[0] : children;
                                      const index = parseInt(indexText as string);
                                      if (isNaN(index) || !msg.citations) return <span>[{indexText}]</span>;
                                      
                                      const citation = msg.citations[index - 1];
                                      return <CitationTooltip index={index} citation={citation} />;
                                    }
                                  }}
                                >
                                  {msg.content.replace(/(?<![a-zA-Z0-9])\[(\d+)\]/g, '<cite>$1</cite>')}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-6 pb-8 shrink-0 bg-canvas relative">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl flex items-center gap-2 border border-border-light shadow-sm focus-within:shadow-md focus-within:border-primary/30 transition-all p-1.5 pl-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
              placeholder="Paste links or ask anything..."
              className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 py-3 px-4 text-[16px] outline-none placeholder:text-muted/70 font-sans text-ink"
            />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className={`p-3 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isLoading ? 'bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md' : 'bg-soft-stone text-muted cursor-not-allowed'}`}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* AI Pipeline Inspector */}
      {showDebug && (
        <aside className="w-[360px] border-l border-border-light flex flex-col z-10 shrink-0 bg-canvas">
          <PipelineInspector />
        </aside>
      )}
    </div>
  );
}

export default ChatPage;
