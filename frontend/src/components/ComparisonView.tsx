import React from 'react';
import { VideoCard } from './VideoCard';
import type { VideoMetadata } from './VideoCard';

interface ComparisonViewProps {
  videos: VideoMetadata[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ videos }) => {
  if (!videos || videos.length < 2) return null;

  const [videoA, videoB] = videos;
  const isABetter = videoA.engagementRate > videoB.engagementRate;
  
  const difference = Math.abs(videoA.engagementRate - videoB.engagementRate).toFixed(1);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-px bg-slate-200 flex-1"></div>
        <span className="text-[11px] uppercase font-bold text-slate-400 tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          Comparison View
        </span>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative min-w-0">
          <div className={`absolute -top-3 -right-3 px-2 py-1 rounded text-xs font-bold shadow-sm z-10 ${isABetter ? 'bg-green-100 text-green-700 border border-green-200' : 'hidden'}`}>
            Winner
          </div>
          <VideoCard {...videoA} />
        </div>
        
        <div className="flex items-center justify-center xl:w-12 text-slate-300 font-bold italic py-2 xl:py-0">VS</div>
        
        <div className="flex-1 relative min-w-0">
          <div className={`absolute -top-3 -right-3 px-2 py-1 rounded text-xs font-bold shadow-sm z-10 ${!isABetter ? 'bg-green-100 text-green-700 border border-green-200' : 'hidden'}`}>
            Winner
          </div>
          <VideoCard {...videoB} />
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-sm font-medium text-slate-700 shadow-sm mt-4">
        {isABetter ? 'Video A' : 'Video B'} outperforms by <span className="text-primary font-bold">{difference}%</span> engagement rate.
      </div>
    </div>
  );
};
