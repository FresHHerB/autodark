import React from 'react';
import { Play, Clock, Eye, Check } from 'lucide-react';

import { YouTubeVideo } from '@shared/services/youtube';

interface VideoCardProps {
  video: YouTubeVideo;
  isSelected: boolean;
  onSelect: () => void;
}

export default function VideoCard({ video, isSelected, onSelect }: VideoCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'há 1 dia';
    if (diffDays < 30) return `há ${diffDays} dias`;
    if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`;
    return `há ${Math.floor(diffDays / 365)} anos`;
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group relative cursor-pointer bg-gray-800 border transition-all duration-200
        ${isSelected 
          ? 'border-white shadow-lg shadow-white/10' 
          : 'border-gray-700 hover:border-gray-600'
        }
      `}
    >
      {/* Selection Indicator */}
      <div className={`
        absolute top-2 right-2 z-10 w-5 h-5 border-2 flex items-center justify-center transition-all
        ${isSelected 
          ? 'bg-white border-white' 
          : 'border-gray-500 group-hover:border-gray-400'
        }
      `}>
        {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-700 overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/50 p-3 rounded-full">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        </div>

        {/* Duration */}
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {video.duration}
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        <h4 className="text-white text-xs font-medium leading-tight mb-1 line-clamp-2">
          {video.title}
        </h4>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" />
            {video.views}
          </div>
          <span>{formatDate(video.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}