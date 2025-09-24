import React from 'react';
import { X, Play, Wand2 } from 'lucide-react';

interface VideoToReview {
  id: string;
  title: string;
  script: string;
  thumbnail: string;
  status: 'pending' | 'approved' | 'needs-changes';
  generatedAt: string;
  channel: string;
  idea: string;
  estimatedDuration: string;
}

interface VideoReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoToReview | null;
  onGenerateVideo: (videoId: string) => void;
  onApprove: (videoId: string) => void;
  onRequestChanges: (videoId: string) => void;
}

export default function VideoReviewModal({ 
  isOpen, 
  onClose, 
  video, 
  onGenerateVideo,
  onApprove,
  onRequestChanges 
}: VideoReviewModalProps) {
  if (!isOpen || !video) return null;

  const statusColors = {
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    'needs-changes': 'bg-red-500'
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    'needs-changes': 'Precisa Alterações'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-light text-white">Revisar Vídeo</h3>
            <div className={`px-2 py-1 rounded text-xs text-white ${statusColors[video.status]}`}>
              {statusLabels[video.status]}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Video Info */}
            <div className="space-y-6">
              {/* Thumbnail */}
              <div className="bg-gray-800 border border-gray-700 p-4">
                <h4 className="text-white font-medium mb-3">Thumbnail</h4>
                <div className="relative aspect-video bg-gray-700 rounded overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity">
                    <div className="bg-black/50 p-3 rounded-full">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Details */}
              <div className="bg-gray-800 border border-gray-700 p-4">
                <h4 className="text-white font-medium mb-3">Detalhes</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Canal:</span>
                    <span className="text-white">{video.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ideia Original:</span>
                    <span className="text-white">{video.idea}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duração Estimada:</span>
                    <span className="text-white">{video.estimatedDuration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gerado em:</span>
                    <span className="text-white">{new Date(video.generatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="space-y-6">
              {/* Title */}
              <div className="bg-gray-800 border border-gray-700 p-4">
                <h4 className="text-white font-medium mb-3">Título</h4>
                <textarea
                  value={video.title}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Script */}
              <div className="bg-gray-800 border border-gray-700 p-4">
                <h4 className="text-white font-medium mb-3">Roteiro</h4>
                <textarea
                  value={video.script}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
                  rows={12}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onRequestChanges(video.id)}
              className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors border border-red-400/30 hover:border-red-300/50"
            >
              Solicitar Alterações
            </button>
            <button
              onClick={() => onApprove(video.id)}
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Aprovar
            </button>
          </div>
          
          <button
            onClick={() => onGenerateVideo(video.id)}
            className="bg-white text-black px-6 py-2 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Gerar Vídeo
          </button>
        </div>
      </div>
    </div>
  );
}