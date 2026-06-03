import React, { useState } from 'react';
import { BookOpen, PlayCircle } from 'lucide-react';

interface CitationData {
  source?: string;
  chunkIndex?: number;
  text?: string;
  score?: number;
  title?: string;
  thumbnail?: string;
}

interface CitationTooltipProps {
  index: number;
  citation: CitationData;
}

export const CitationTooltip: React.FC<CitationTooltipProps> = ({ index, citation }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!citation) return <span className="text-[11px] font-bold text-accent-violet bg-accent-violet/10 rounded-sm px-1.5 py-0.5 relative -top-0.5">[{index}]</span>;

  return (
    <span 
      className="relative inline-block mx-1 group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="text-[11px] font-bold text-accent-violet bg-accent-violet/10 px-1.5 py-0.5 rounded-sm cursor-pointer hover:bg-accent-violet hover:text-white transition-colors relative -top-0.5">
        {index}
      </span>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-canvas rounded-xl shadow-xl border border-border-light overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          <div className="flex p-3 bg-soft-stone border-b border-border-light gap-3">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-border-light shrink-0 relative flex items-center justify-center">
              {citation.thumbnail ? (
                <img src={citation.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
              ) : (
                <PlayCircle size={20} className="text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="text-xs font-bold text-ink line-clamp-2 leading-tight">
                {citation.title || citation.source || "Unknown Source"}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted mt-1 flex items-center gap-1">
                <BookOpen size={10} /> Chunk {citation.chunkIndex !== undefined ? citation.chunkIndex : '?'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-canvas">
            <p className="text-[13px] text-ink font-serif italic line-clamp-4 leading-relaxed">
              "{citation.text}"
            </p>
          </div>

          {/* Pointer Triangle */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-canvas border-b border-r border-border-light transform rotate-45"></div>
        </div>
      )}
    </span>
  );
};
