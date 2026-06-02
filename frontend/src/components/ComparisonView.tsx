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
    <div className="w-full space-y-4 font-sans">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-px bg-border-light flex-1"></div>
        <span className="text-[14px] uppercase font-bold text-muted tracking-[0.2px] bg-canvas px-3 py-1 rounded-xs border border-border-light">
          Comparison View
        </span>
        <div className="h-px bg-border-light flex-1"></div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative min-w-0">
          <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-xs text-[10px] font-bold shadow-sm z-10 uppercase tracking-[0.25px] ${isABetter ? 'bg-accent-lime text-ink-press border border-accent-lime' : 'hidden'}`}>
            Winner
          </div>
          <VideoCard {...videoA} isWinner={isABetter} />
        </div>
        
        <div className="flex items-center justify-center xl:w-12 text-muted font-bold py-2 xl:py-0">VS</div>
        
        <div className="flex-1 relative min-w-0">
          <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-xs text-[10px] font-bold shadow-sm z-10 uppercase tracking-[0.25px] ${!isABetter ? 'bg-accent-lime text-ink-press border border-accent-lime' : 'hidden'}`}>
            Winner
          </div>
          <VideoCard {...videoB} isWinner={!isABetter} />
        </div>
      </div>

      <div className="bg-soft-stone border border-border-light rounded-xl p-4 text-center text-[16px] text-ink font-sans">
        {isABetter ? 'Video A' : 'Video B'} outperforms by <span className="text-primary font-bold">{difference}%</span> engagement rate.
      </div>
    </div>
  );
};
