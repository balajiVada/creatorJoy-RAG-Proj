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

  if (!citation) return <span className="text-primary font-medium">[{index}]</span>;

  return (
    <span 
      className="relative inline-block mx-1 group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="text-[12px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary hover:text-white transition-colors">
        {index}
      </span>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          <div className="flex p-3 bg-slate-50 border-b border-slate-100 gap-3">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-200 shrink-0 relative flex items-center justify-center">
              {citation.thumbnail ? (
                <img src={citation.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
              ) : (
                <PlayCircle size={20} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                {citation.title || citation.source || "Unknown Source"}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center gap-1">
                <BookOpen size={10} /> Chunk {citation.chunkIndex !== undefined ? citation.chunkIndex : '?'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white">
            <p className="text-[13px] text-slate-600 font-serif italic line-clamp-4 leading-relaxed">
              "{citation.text}"
            </p>
          </div>

          {/* Pointer Triangle */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
        </div>
      )}
    </span>
  );
};
