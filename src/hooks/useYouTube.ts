import { useState, useCallback } from 'react';
import { youtubeService, YouTubeChannel, YouTubeVideo } from '../services/youtube';

interface UseYouTubeState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic YouTube hook
export function useYouTube<T = any>() {
  const [state, setState] = useState<UseYouTubeState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar com YouTube';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Channel search hook
export function useChannelSearch() {
  const { execute, ...state } = useYouTube<YouTubeChannel>();
  
  const searchChannel = useCallback((channelUrl: string) => {
    return execute(() => youtubeService.getChannelInfo(channelUrl));
  }, [execute]);

  return {
    ...state,
    searchChannel,
  };
}

// Channel videos hook
export function useChannelVideos() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  const fetchVideos = useCallback(async (
    uploadsPlaylistId: string, 
    maxResults: number = 50,
    reset: boolean = true
  ) => {
    try {
      setLoading(true);
      setError(null);

      const pageToken = reset ? undefined : nextPageToken;
      const result = await youtubeService.getChannelVideos(
        uploadsPlaylistId, 
        maxResults, 
        pageToken
      );

      if (reset) {
        setVideos(result.videos);
      } else {
        setVideos(prev => [...prev, ...result.videos]);
      }

      setNextPageToken(result.nextPageToken);
      setHasMore(!!result.nextPageToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar vídeos';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [nextPageToken]);

  const loadMore = useCallback((uploadsPlaylistId: string, maxResults: number = 50) => {
    if (!loading && hasMore) {
      fetchVideos(uploadsPlaylistId, maxResults, false);
    }
  }, [fetchVideos, loading, hasMore]);

  const reset = useCallback(() => {
    setVideos([]);
    setNextPageToken(undefined);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    videos,
    loading,
    error,
    hasMore,
    fetchVideos,
    loadMore,
    reset,
  };
}

// Channel search by query hook
export function useChannelSearchByQuery() {
  const { execute, ...state } = useYouTube<YouTubeChannel[]>();
  
  const searchChannels = useCallback((query: string, maxResults?: number) => {
    return execute(() => youtubeService.searchChannels(query, maxResults));
  }, [execute]);

  return {
    ...state,
    searchChannels,
  };
}