import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = any>() {
  const [state, setState] = useState<UseApiState<T>>({
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
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
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

// Specific API hooks
export function useChannelSearch() {
  const { execute, ...state } = useApi();
  
  const searchChannel = useCallback((channelUrl: string) => {
    return execute(() => apiService.searchChannel(channelUrl));
  }, [execute]);

  return {
    ...state,
    searchChannel,
  };
}

export function useAIGeneration() {
  const { execute, ...state } = useApi();
  
  const generateTitle = useCallback((idea: string, prompt: string, model?: string) => {
    return execute(() => apiService.generateTitle(idea, prompt, model));
  }, [execute]);

  const generateScript = useCallback((idea: string, title: string, prompt: string, model?: string) => {
    return execute(() => apiService.generateScript(idea, title, prompt, model));
  }, [execute]);

  return {
    ...state,
    generateTitle,
    generateScript,
  };
}

export function useVideoProcessing() {
  const { execute, ...state } = useApi();
  
  const cloneChannel = useCallback((channelUrl: string, selectedVideos: string[], channelName: string) => {
    return execute(() => apiService.cloneChannel(channelUrl, selectedVideos, channelName));
  }, [execute]);

  const processVideo = useCallback((videoId: string) => {
    return execute(() => apiService.processVideo(videoId));
  }, [execute]);

  const publishVideo = useCallback((videoId: string, scheduleDate?: string) => {
    return execute(() => apiService.publishVideo(videoId, scheduleDate));
  }, [execute]);

  return {
    ...state,
    cloneChannel,
    processVideo,
    publishVideo,
  };
}