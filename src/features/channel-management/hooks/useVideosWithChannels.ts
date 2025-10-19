import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@shared/lib';

export type VideoStatus =
  | 'gerando_conteudo'
  | 'animando_imagens'
  | 'concatenando_videos'
  | 'adicionando_audio'
  | 'adicionando_legenda'
  | 'video_completo'
  | 'video_agendado'
  | 'video_publicado';

export interface VideoWithChannel {
  id: number;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  status: VideoStatus;
  progress?: number;
  createdAt: string;
  scheduledDate?: string;
  channelId: number;
  channelName: string;
  channelProfileImage: string;
}

export function useVideosWithChannels() {
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const { data, error: queryError } = await supabase.rpc('get_videos_with_channels');

      if (queryError) {
        // Fallback to regular query if RPC doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('videos')
          .select(`
            id,
            status,
            video_path,
            thumb_path,
            created_at,
            data_publicar,
            roteiros!inner (
              id,
              titulo,
              canal_id,
              canais!inner (
                id,
                nome_canal,
                profile_image
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;

        // Transform the data to match our interface
        const transformedData: VideoWithChannel[] = (fallbackData || []).map((video: any) => {
          // Add timestamp to thumbnail URL to bypass cache
          const thumbnailUrl = video.thumb_path
            ? `${video.thumb_path}?t=${Date.now()}`
            : '';

          return {
            id: video.id,
            title: video.roteiros?.titulo || 'Sem título',
            thumbnail: thumbnailUrl,
            videoUrl: video.video_path || undefined,
            status: video.status as VideoStatus,
            createdAt: video.created_at,
            scheduledDate: video.data_publicar,
            channelId: video.roteiros?.canais?.id || 0,
            channelName: video.roteiros?.canais?.nome_canal || 'Canal desconhecido',
            channelProfileImage: video.roteiros?.canais?.profile_image || ''
          };
        });

        setVideos(transformedData);
      } else {
        // Add timestamp to thumbnails from RPC data
        const dataWithTimestamp = (data || []).map((video: VideoWithChannel) => ({
          ...video,
          thumbnail: video.thumbnail ? `${video.thumbnail}?t=${Date.now()}` : ''
        }));
        setVideos(dataWithTimestamp);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar vídeos');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    refetch: fetchVideos
  };
}
