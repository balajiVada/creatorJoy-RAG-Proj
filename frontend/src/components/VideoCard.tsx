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
}

export const VideoCard: React.FC<VideoMetadata> = ({
  platform,
  views,
  likes,
  comments,
  engagementRate,
  title,
  thumbnail,
  creatorName
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full max-w-2xl hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="w-1/3 min-w-[120px] bg-slate-100 relative">
        {thumbnail ? (
          <img src={thumbnail} alt="Thumbnail" className="object-cover w-full h-full absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle size={32} className="text-slate-400" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
          {platform}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className="font-semibold text-slate-900 text-[15px] leading-tight line-clamp-2" title={title || "Video"}>
            {title || "Untitled Video"}
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium truncate">
            {creatorName || "Unknown Creator"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2 text-slate-600">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-semibold text-slate-400">Views</span>
            <span className="text-sm font-semibold flex items-center gap-1"><PlayCircle size={14}/>{formatNumber(views)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-semibold text-slate-400">Likes</span>
            <span className="text-sm font-semibold flex items-center gap-1"><Heart size={14}/>{formatNumber(likes)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-semibold text-slate-400">Cmnts</span>
            <span className="text-sm font-semibold flex items-center gap-1"><MessageCircle size={14}/>{formatNumber(comments)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-semibold text-primary">Eng. Rate</span>
            <span className="text-sm font-bold text-primary flex items-center gap-1"><BarChart2 size={14}/>{engagementRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
