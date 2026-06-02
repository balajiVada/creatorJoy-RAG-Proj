import React from 'react';
import { PlayCircle, MessageCircle, Heart, BarChart2 } from 'lucide-react';

export interface VideoMetadata {
  url: string;
  platform: 'youtube' | 'instagram';
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  title?: string;
  thumbnail?: string;
  creatorName?: string;
  isWinner?: boolean;
}

export const VideoCard: React.FC<VideoMetadata> = ({
  platform,
  views,
  likes,
  comments,
  engagementRate,
  title,
  thumbnail,
  creatorName,
  isWinner
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className={`flex rounded-xl shadow-sm border overflow-hidden w-full max-w-2xl hover:shadow-md transition-shadow font-sans ${isWinner ? 'bg-accent-violet-deep text-on-primary border-accent-violet' : 'bg-canvas text-ink border-border-light'}`}>
      {/* Thumbnail */}
      <div className={`w-1/3 min-w-[120px] relative ${isWinner ? 'bg-primary' : 'bg-soft-stone'}`}>
        {thumbnail ? (
          <img src={thumbnail} alt="Thumbnail" className="object-cover w-full h-full absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle size={32} className="text-muted" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-xs uppercase tracking-[0.25px]">
          {platform}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className={`font-medium text-[16px] leading-tight line-clamp-2 ${isWinner ? 'text-on-primary' : 'text-ink'}`} title={title || "Video"}>
            {title || "Untitled Video"}
          </h3>
          <p className={`text-[14px] mt-1 truncate ${isWinner ? 'text-on-dark-muted' : 'text-muted'}`}>
            {creatorName || "Unknown Creator"}
          </p>
        </div>

        <div className={`mt-4 grid grid-cols-2 gap-y-3 gap-x-2 ${isWinner ? 'text-on-primary' : 'text-ink'}`}>
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase font-bold tracking-[0.25px] ${isWinner ? 'text-on-dark-muted' : 'text-muted'}`}>Views</span>
            <span className="text-sm font-semibold flex items-center gap-1"><PlayCircle size={14} className={isWinner ? 'text-accent-lime' : ''}/>{formatNumber(views)}</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase font-bold tracking-[0.25px] ${isWinner ? 'text-on-dark-muted' : 'text-muted'}`}>Likes</span>
            <span className="text-sm font-semibold flex items-center gap-1"><Heart size={14} className={isWinner ? 'text-accent-pink' : ''}/>{formatNumber(likes)}</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase font-bold tracking-[0.25px] ${isWinner ? 'text-on-dark-muted' : 'text-muted'}`}>Cmnts</span>
            <span className="text-sm font-semibold flex items-center gap-1"><MessageCircle size={14} className={isWinner ? 'text-accent-violet-mid' : ''}/>{formatNumber(comments)}</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase font-bold tracking-[0.25px] ${isWinner ? 'text-accent-lime' : 'text-accent-violet-deep'}`}>Eng. Rate</span>
            <span className={`text-sm font-bold flex items-center gap-1 ${isWinner ? 'text-accent-lime' : 'text-accent-violet-deep'}`}><BarChart2 size={14}/>{engagementRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
