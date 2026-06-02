import { useEffect, useRef } from 'react';
import { usePipelineInspectorStore, type PipelineStep } from '../stores/usePipelineInspectorStore';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Activity, Zap, Database, Server, Clock } from 'lucide-react';

const formatDuration = (ms?: number) => {
  if (ms === undefined) return '';
  if (ms < 1) return '<1ms';
  return `${ms.toFixed(0)}ms`;
};

const getStepIcon = (step: string) => {
  if (step.includes('search')) return <Database size={14} className="text-accent-pink" />;
  if (step.includes('generation') || step.includes('token')) return <Zap size={14} className="text-accent-lime" />;
  if (step.includes('fusion') || step.includes('compiled')) return <Server size={14} className="text-accent-violet" />;
  return <Activity size={14} className="text-muted" />;
};

const getStepLabel = (step: string) => {
  const map: Record<string, string> = {
    query_received: 'Query Received',
    memory_loaded: 'Memory Loaded',
    query_rewritten: 'Query Rewritten',
    retrieval_started: 'Retrieval Started',
    semantic_search_completed: 'Semantic Search',
    keyword_search_completed: 'Keyword Search',
    fusion_completed: 'RRF Fusion',
    context_compiled: 'Context Compiled',
    prompt_compiled: 'Prompt Compiled',
    generation_started: 'Generation Started',
    stream_first_token: 'Time to First Token (TTFT)',
    generation_completed: 'Generation Completed'
  };
  return map[step] || step;
};

const InspectorStep = ({ step, isExpanded, toggleExpand }: { step: PipelineStep, isExpanded: boolean, toggleExpand: () => void }) => {
  const hasDetails = step.step === 'query_rewritten' || 
                     step.step === 'context_compiled' || 
                     step.step === 'semantic_search_completed' || 
                     step.step === 'keyword_search_completed' ||
                     step.step === 'generation_completed';

  return (
    <div className="flex flex-col mb-3 last:mb-0 text-sm">
      <div 
        className={`flex items-center gap-2 ${hasDetails ? 'cursor-pointer hover:bg-white/5 p-1 -mx-1 rounded' : 'py-1'}`}
        onClick={() => hasDetails && toggleExpand()}
      >
        <div className="flex-shrink-0 mt-0.5">
          {step.status === 'completed' ? (
            <CheckCircle2 size={16} className="text-accent-lime" />
          ) : (
            <Circle size={16} className="text-white/20 animate-pulse" />
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5">
          {getStepIcon(step.step)}
        </div>
        <div className="flex-1 font-mono text-xs font-medium text-white/90">
          {getStepLabel(step.step)}
        </div>
        
        {step.durationMs !== undefined && (
          <div className="text-[11px] font-mono text-white/40 flex items-center gap-1">
            <Clock size={10} />
            {formatDuration(step.durationMs)}
          </div>
        )}

        {hasDetails && (
          <div className="text-white/40 ml-1">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        )}
      </div>

      {hasDetails && isExpanded && (
        <div className="ml-7 mt-2 pl-3 border-l border-white/10 text-xs font-mono">
          
          {step.step === 'query_rewritten' && (
            <div className="space-y-2">
              <div className="text-white/50">Rewritten Query:</div>
              <div className="bg-ink border border-hairline-violet p-2 rounded text-accent-lime break-words whitespace-pre-wrap">
                {step.rewrittenQuery}
              </div>
              <div className="text-white/40">Rewritten: {step.wasRewritten ? 'Yes' : 'No'}</div>
            </div>
          )}

          {step.step === 'semantic_search_completed' && (
            <div className="space-y-1 text-white/60">
              <div>Chunks Retrieved: <span className="text-white">{step.chunksRetrieved}</span></div>
              {step.topScores && step.topScores.length > 0 && (
                <div>Top Scores: <span className="text-accent-lime">{step.topScores.map((s: number) => s.toFixed(3)).join(', ')}</span></div>
              )}
            </div>
          )}

          {step.step === 'keyword_search_completed' && (
            <div className="space-y-1 text-white/60">
              <div>Chunks Retrieved: <span className="text-white">{step.chunksRetrieved}</span></div>
            </div>
          )}

          {step.step === 'context_compiled' && (
            <div className="space-y-2">
              <div className="text-white/60 flex items-center gap-3">
                <span>Tokens: <span className="text-white">{step.tokenEstimate}</span></span>
                <span>Chunks: <span className="text-white">{step.chunksUsed}</span></span>
              </div>
              {step.retrievedChunks && step.retrievedChunks.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-white/40 mb-1">Fused Chunks:</div>
                  {step.retrievedChunks.map((chunk: any, i: number) => (
                    <div key={i} className="bg-ink border border-hairline-violet p-2 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40 uppercase truncate pr-2">
                          {chunk.documentName} (p.{chunk.pageNumber})
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          chunk.retrievalMethod === 'semantic' ? 'bg-blue-500/20 text-blue-400' :
                          chunk.retrievalMethod === 'keyword' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {chunk.retrievalMethod}
                        </span>
                      </div>
                      <div className="text-white/70 line-clamp-3 overflow-hidden text-[11px] leading-relaxed">
                        {chunk.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step.step === 'generation_completed' && (
            <div className="space-y-1 text-white/60">
              <div>Total Tokens Generated: <span className="text-white">{step.totalTokens}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PipelineInspector = () => {
  const { steps, runId, expandedSteps, toggleStepExpanded } = usePipelineInspectorStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length]);

  if (!runId && steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/30 text-sm p-6 text-center font-mono">
        Waiting for pipeline events...<br/><br/>
        Start a chat to inspect the RAG pipeline in real-time.
      </div>
    );
  }

  const generationCompletedStep = steps.find(s => s.step === 'generation_completed');
  const contextCompiledStep = steps.find(s => s.step === 'context_compiled');

  const totalLatency = steps.reduce((acc, step) => {
    if (step.step === 'query_rewritten' || step.step === 'context_compiled' || step.step === 'generation_completed') {
      return acc + (step.durationMs || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="flex flex-col h-full bg-surface-night text-on-primary overflow-hidden font-mono">
      <div className="p-3 border-b border-hairline-violet flex items-center justify-between shrink-0 bg-canvas-dark">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent-lime" />
          <span className="text-sm font-semibold tracking-wide">AI Pipeline Inspector</span>
        </div>
        <div className="text-[10px] text-white/40 uppercase">Dev Mode</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1" ref={scrollRef}>
        {steps.map((step, idx) => (
          <InspectorStep 
            key={`${step.step}-${idx}`} 
            step={step} 
            isExpanded={!!expandedSteps[step.step]} 
            toggleExpand={() => toggleStepExpanded(step.step)}
          />
        ))}
        {!generationCompletedStep && steps.length > 0 && (
          <div className="flex items-center gap-2 py-2 opacity-50">
             <Circle size={16} className="text-white/20 animate-pulse" />
             <div className="text-xs font-mono text-white/60">Processing...</div>
          </div>
        )}
      </div>

      {generationCompletedStep && (
        <div className="p-3 border-t border-hairline-violet bg-white/5 shrink-0 text-xs space-y-2 font-mono">
          <div className="text-accent-lime font-semibold mb-2">Pipeline Completed</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-white/50">Total Latency</div>
            <div className="text-right text-white">{totalLatency.toFixed(0)}ms</div>
            
            <div className="text-white/50">Context Tokens</div>
            <div className="text-right text-white">{contextCompiledStep?.tokenEstimate || 0}</div>
            
            <div className="text-white/50">Retrieval Sources</div>
            <div className="text-right text-white">{contextCompiledStep?.chunksUsed || 0} chunks</div>
          </div>
        </div>
      )}
    </div>
  );
};
