import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Film, Music, MessageSquare, CheckCircle, AlertCircle, Filter, X, Video, Trash2, RefreshCw, Upload, Subtitles, Image as ImageIcon, Mic } from 'lucide-react';
import { DashboardHeader } from '@features/dashboard/components';
import { VideoPlayer } from '@shared/components/modals';
import { useVideosWithChannels, VideoStatus, VideoWithChannel } from '@features/channel-management/hooks';
import { apiService } from '@shared/services';
import { supabase } from '@shared/lib';


const statusConfig = {
  gerando_conteudo: {
    label: 'Gerando Conteúdo',
    icon: Loader2,
    color: 'yellow',
    isProcessing: true
  },
  animando_imagens: {
    label: 'Animando Imagens',
    icon: Loader2,
    color: 'blue',
    isProcessing: true
  },
  concatenando_videos: {
    label: 'Concatenando Vídeos',
    icon: Film,
    color: 'purple',
    isProcessing: true
  },
  adicionando_audio: {
    label: 'Adicionando Áudio',
    icon: Music,
    color: 'pink',
    isProcessing: true
  },
  adicionando_legenda: {
    label: 'Adicionando Legenda',
    icon: MessageSquare,
    color: 'cyan',
    isProcessing: true
  },
  video_completo: {
    label: 'Vídeo Completo',
    icon: CheckCircle,
    color: 'green',
    isProcessing: false
  }
};

// Script status labels for "gerando_conteudo" phase
const getScriptStatusLabel = (scriptStatus: string | null | undefined): { text: string; icon: any } | null => {
  if (!scriptStatus) return null;

  const scriptStatusMap: {[key: string]: { text: string; icon: any }} = {
    'gerando_roteiro': { text: 'Gerando Roteiro', icon: Loader2 },
    'roteiro_gerado': { text: 'Roteiro Gerado', icon: CheckCircle },
    'gerando_audio': { text: 'Gerando Áudio', icon: Loader2 },
    'audio_gerado': { text: 'Áudio Gerado', icon: Mic },
    'gerando_imagens': { text: 'Gerando Imagens', icon: Loader2 },
    'imagens_geradas': { text: 'Imagens Geradas', icon: ImageIcon },
    'conteudo_gerado': { text: 'Conteúdo Gerado', icon: CheckCircle },
    'gerando_video': { text: 'Gerando Vídeo', icon: Loader2 },
    'video_gerado': { text: 'Vídeo Gerado', icon: Video },
  };

  return scriptStatusMap[scriptStatus] || null;
};

export default function ReviewEditPage() {
  const navigate = useNavigate();
  const { videos: videosFromHook, loading, error, refetch } = useVideosWithChannels();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithChannel | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);

  // Delete confirmation state
  const [deletingVideo, setDeletingVideo] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id: number, title: string} | null>(null);

  // Reload state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drag & Drop states
  const [dragOverVideoId, setDragOverVideoId] = useState<number | null>(null);
  const [uploadingVideoId, setUploadingVideoId] = useState<number | null>(null);
  const [successVideoId, setSuccessVideoId] = useState<number | null>(null);

  // Video/Audio duration state (video.id -> formatted duration like "3:45")
  const [durations, setDurations] = useState<{[key: number]: string}>({});

  // Sync videos from hook to local state
  React.useEffect(() => {
    setVideos(videosFromHook);
  }, [videosFromHook]);

  // Auto-update every 10 seconds (pause when tab is inactive)
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (interval) return; // Already running

      interval = setInterval(() => {
        console.log('🔄 Auto-atualizando vídeos...');
        refetch(true); // Silent refetch (no loading state)
      }, 10000); // 10 seconds
    };

    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Only update when tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Aba inativa - pausando auto-update de vídeos');
        stopInterval();
      } else {
        console.log('👁️ Aba ativa - retomando auto-update de vídeos');
        refetch(true); // Update immediately when returning (silent)
        startInterval();
      }
    };

    // Start interval
    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // Load durations for videos/audios
  React.useEffect(() => {
    const loadDurations = async () => {
      const newDurations: {[key: number]: string} = {};

      for (const video of videos) {
        // Skip if we already have this duration
        if (durations[video.id]) {
          newDurations[video.id] = durations[video.id];
          continue;
        }

        try {
          // Priority: videoUrl > audioUrl
          if (video.videoUrl) {
            const durationSeconds = await loadMediaDuration(video.videoUrl, 'video');
            newDurations[video.id] = formatDuration(durationSeconds);
          } else if (video.audioUrl) {
            const durationSeconds = await loadMediaDuration(video.audioUrl, 'audio');
            newDurations[video.id] = formatDuration(durationSeconds);
          }
        } catch (error) {
          // Silently fail - duration won't be shown for this video
          console.error(`Failed to load duration for video ${video.id}:`, error);
        }
      }

      // Only update if we have new durations
      if (Object.keys(newDurations).length > 0) {
        setDurations(prev => ({ ...prev, ...newDurations }));
      }
    };

    if (videos.length > 0) {
      loadDurations();
    }
  }, [videos]);

  // Extract unique channels from videos
  const channels = useMemo(() => {
    const uniqueChannels = new Map<number, { id: number; name: string; profileImage: string }>();
    videos.forEach(video => {
      if (!uniqueChannels.has(video.channelId)) {
        uniqueChannels.set(video.channelId, {
          id: video.channelId,
          name: video.channelName,
          profileImage: video.channelProfileImage
        });
      }
    });
    return Array.from(uniqueChannels.values());
  }, [videos]);

  // Filter videos by selected channel
  const filteredVideos = useMemo(() => {
    if (selectedChannelId === null) return videos;
    return videos.filter(v => v.channelId === selectedChannelId);
  }, [videos, selectedChannelId]);

  // Format duration in seconds to "MM:SS" or "HH:MM:SS"
  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Load media duration from audio or video URL
  const loadMediaDuration = async (url: string, type: 'audio' | 'video'): Promise<number> => {
    return new Promise((resolve, reject) => {
      const element = type === 'audio'
        ? document.createElement('audio')
        : document.createElement('video');

      element.src = url;

      element.addEventListener('loadedmetadata', () => {
        resolve(element.duration);
      });

      element.addEventListener('error', () => {
        console.error(`Failed to load ${type} duration from:`, url);
        reject(new Error(`Failed to load ${type} duration`));
      });

      // Trigger metadata load
      element.load();
    });
  };

  const handleVideoClick = (video: VideoWithChannel) => {
    if (!statusConfig[video.status].isProcessing && video.videoUrl) {
      setSelectedVideo(video);
      setIsPlayerOpen(true);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    try {
      setDeletingVideo(id);

      await apiService.deleteContent({
        id,
        deleteType: 'deleteVideo'
      });

      // Recarrega a lista de vídeos
      await refetch();
      setConfirmDelete(null);

    } catch (error) {
      console.error('Erro ao deletar vídeo:', error);
      alert('Erro ao deletar vídeo. Tente novamente.');
    } finally {
      setDeletingVideo(null);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } catch (error) {
      console.error('Erro ao recarregar vídeos:', error);
      alert('Erro ao recarregar vídeos. Tente novamente.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allStatuses: VideoStatus[] = ['gerando_conteudo', 'animando_imagens', 'concatenando_videos', 'adicionando_audio', 'adicionando_legenda', 'video_completo'];

  const getVideosByStatus = (status: VideoStatus) => {
    return filteredVideos.filter(v => v.status === status);
  };

  // Handle image drop on video card
  const handleDragOver = (e: React.DragEvent, videoId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverVideoId(videoId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverVideoId(null);
  };

  const handleDrop = async (e: React.DragEvent, videoId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverVideoId(null);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, arraste apenas arquivos de imagem.');
      return;
    }

    try {
      setUploadingVideoId(videoId);

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data (remove data:image/...;base64, prefix)
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to webhook
      const response = await apiService.updateVideoImage(videoId, { base64 });

      // Check response
      const isSuccess = response && (
        response.success === true ||
        (Array.isArray(response) && response[0]?.success === true)
      );

      if (isSuccess) {
        // Reload all videos silently (without loading state)
        await refetch(true);

        // Show success toast on video card
        setSuccessVideoId(videoId);

        // Hide toast after 3 seconds
        setTimeout(() => {
          setSuccessVideoId(null);
        }, 3000);
      } else {
        throw new Error('Falha ao atualizar thumbnail');
      }
    } catch (error) {
      console.error('Erro ao atualizar thumbnail:', error);
      alert('Erro ao atualizar thumbnail. Tente novamente.');
    } finally {
      setUploadingVideoId(null);
    }
  };

  const renderVideoCard = (video: VideoWithChannel) => {
    const config = statusConfig[video.status];
    const Icon = config.icon;
    const isProcessing = config.isProcessing;
    const isDragOver = dragOverVideoId === video.id;
    const isUploading = uploadingVideoId === video.id;
    const showSuccess = successVideoId === video.id;

    return (
      <div
        key={video.id}
        onDragOver={(e) => handleDragOver(e, video.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, video.id)}
        className={`
          bg-gray-800 border overflow-hidden group relative transition-all
          ${isDragOver ? 'border-blue-500 border-2 scale-[1.02]' : 'border-gray-700'}
          ${!isProcessing && !isDragOver ? 'hover:border-gray-600' : ''}
        `}
      >
        {/* Success Toast */}
        {showSuccess && (
          <div className="absolute top-3 left-3 right-3 z-30 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Thumbnail atualizada!</span>
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete({ id: video.id, title: video.title });
          }}
          className="absolute top-3 right-3 z-10 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Excluir vídeo"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div
          onClick={() => !isUploading && handleVideoClick(video)}
          className={`${!isProcessing && !isUploading ? 'cursor-pointer' : ''}`}
        >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-700">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center w-full h-full">
              <Video className="w-16 h-16 text-gray-600" />
            </div>
          )}

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
              <Loader2 className="w-8 h-8 text-blue-500 mb-3 animate-spin" />
              <span className="text-white text-sm">Atualizando thumbnail...</span>
            </div>
          )}

          {/* Drag Over Overlay */}
          {isDragOver && !isUploading && (
            <div className="absolute inset-0 bg-blue-500/30 flex flex-col items-center justify-center z-20 border-2 border-blue-500 border-dashed">
              <Upload className="w-12 h-12 text-blue-300 mb-2" />
              <span className="text-white text-sm font-medium">Solte a imagem aqui</span>
            </div>
          )}

          {isProcessing && video.progress && !isUploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <Icon className="w-8 h-8 text-white mb-3 animate-spin" />
              <div className="w-3/4 bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${video.progress}%` }}
                />
              </div>
              <span className="text-white text-sm mt-2">{video.progress}%</span>
            </div>
          )}

          {!isProcessing && !isDragOver && !isUploading && (
            <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors" />
          )}

          {/* Caption Indicator (bottom-left) */}
          {video.caption && (
            <div className="absolute bottom-2 left-2 z-10">
              <div className="bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1">
                <Subtitles className="w-3 h-3 text-white" />
                <span className="text-white text-[10px] font-medium">CC</span>
              </div>
            </div>
          )}

          {/* Duration Indicator (bottom-right) */}
          {durations[video.id] && (
            <div className="absolute bottom-2 right-2 z-10">
              <div className="bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5">
                <span className="text-white text-[10px] font-semibold">
                  {durations[video.id]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Channel Info */}
          <div className="flex items-center gap-2 mb-3">
            <img
              src={video.channelProfileImage}
              alt={video.channelName}
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-sm text-gray-300 font-medium">{video.channelName}</span>
          </div>

          {/* Title */}
          <h4 className="text-white text-sm font-medium leading-tight mb-2 line-clamp-2">
            {video.title}
          </h4>

          {/* Script Status Label (only for specific statuses) */}
          {video.status === 'gerando_conteudo' &&
           video.scriptStatus &&
           ['gerando_roteiro', 'gerando_imagens', 'gerando_audio'].includes(video.scriptStatus) &&
           (() => {
            const scriptStatusInfo = getScriptStatusLabel(video.scriptStatus);
            if (!scriptStatusInfo) return null;

            const StatusIcon = scriptStatusInfo.icon;

            // Map status to colors (matching ViewScriptsPage)
            const colorMap: {[key: string]: { bgClass: string; textClass: string }} = {
              'gerando_roteiro': { bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-300' },
              'gerando_audio': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-300' },
              'gerando_imagens': { bgClass: 'bg-purple-500/20', textClass: 'text-purple-300' },
            };

            const colors = colorMap[video.scriptStatus] || { bgClass: 'bg-gray-500/20', textClass: 'text-gray-300' };

            return (
              <div className="mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 ${colors.bgClass} ${colors.textClass} text-[10px] rounded-full font-medium`}>
                  <StatusIcon className="w-3 h-3 animate-spin" />
                  <span>{scriptStatusInfo.text}</span>
                </span>
              </div>
            );
          })()}

          {/* Date */}
          <div className="text-xs text-gray-500">
            {formatDate(video.createdAt)}
          </div>
        </div>
        </div>
      </div>
    );
  };

  const renderStatusColumn = (status: VideoStatus, showSeparator: boolean = false) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    const videos = getVideosByStatus(status);

    const colorClasses = {
      blue: 'border-blue-500/30 bg-blue-500/5',
      purple: 'border-purple-500/30 bg-purple-500/5',
      pink: 'border-pink-500/30 bg-pink-500/5',
      cyan: 'border-cyan-500/30 bg-cyan-500/5',
      green: 'border-green-500/30 bg-green-500/5',
      yellow: 'border-yellow-500/30 bg-yellow-500/5',
      red: 'border-red-500/30 bg-red-500/5'
    };

    return (
      <>
        <div className="flex-shrink-0 w-64">
          <div className={`bg-gray-900 border ${colorClasses[config.color as keyof typeof colorClasses]} p-3 mb-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-white">{config.label}</h3>
            </div>
            <p className="text-xs text-gray-500">{videos.length} vídeo{videos.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="space-y-3">
            {videos.map(video => renderVideoCard(video))}
          </div>
        </div>

        {showSeparator && (
          <div className="flex-shrink-0 w-px bg-gray-700/50 mx-2" />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />

      <main className="w-[90%] mx-auto px-6 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Carregando vídeos...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-red-500 font-medium mb-1">Erro ao carregar vídeos</h3>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-light text-white">Visualização de Vídeos</h1>
            <p className="text-gray-400 text-sm">
              Acompanhe o status de processamento e visualize seus vídeos prontos
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Atualizar lista de vídeos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>

        {/* Channel Filter */}
        {channels.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-white">Filtrar por Canal</h3>
              {selectedChannelId !== null && (
                <button
                  onClick={() => setSelectedChannelId(null)}
                  className="ml-2 text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpar filtro
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id === selectedChannelId ? null : channel.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 border transition-all
                    ${channel.id === selectedChannelId
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-700'
                    }
                  `}
                >
                  <img
                    src={channel.profileImage}
                    alt={channel.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-sm">{channel.name}</span>
                  {channel.id === selectedChannelId && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kanban Board - Single Row */}
        <div>
          <h2 className="text-lg font-light text-white mb-4">
            Pipeline de Vídeos
          </h2>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {allStatuses.map(status => (
                <React.Fragment key={status}>
                  {renderStatusColumn(status, status === 'adicionando_legenda')}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          isOpen={isPlayerOpen}
          videoUrl={selectedVideo.videoUrl || ''}
          videoTitle={selectedVideo.title}
          onClose={() => {
            setIsPlayerOpen(false);
            setSelectedVideo(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmar Exclusão</h2>
            </div>

            <p className="text-gray-300 mb-2">
              Tem certeza que deseja excluir o vídeo:
            </p>
            <p className="text-white font-semibold mb-6">
              "{confirmDelete.title}"
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                disabled={deletingVideo !== null}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteVideo(confirmDelete.id)}
                disabled={deletingVideo !== null}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {deletingVideo === confirmDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
