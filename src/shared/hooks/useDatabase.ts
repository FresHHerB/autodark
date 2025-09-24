import { useState, useEffect, useCallback } from 'react';
import { 
  channelService, 
  voiceService, 
  videoService, 
  channelConfigService,
  Channel,
  VoiceModel,
  Video,
  ChannelConfig
} from '@shared/services/database';

// Generic database hook
function useDatabase<T>(
  fetchFn: () => Promise<T[]>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, dependencies);

  return { data, loading, error, refetch };
}

// Channel hooks
export function useChannels() {
  const { data, loading, error, refetch } = useDatabase(() => channelService.getAll());

  const createChannel = useCallback(async (channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>) => {
    const newChannel = await channelService.create(channel);
    await refetch();
    return newChannel;
  }, [refetch]);

  const updateChannel = useCallback(async (id: string, updates: Partial<Channel>) => {
    const updatedChannel = await channelService.update(id, updates);
    await refetch();
    return updatedChannel;
  }, [refetch]);

  const deleteChannel = useCallback(async (id: string) => {
    await channelService.delete(id);
    await refetch();
  }, [refetch]);

  return {
    channels: data,
    loading,
    error,
    refetch,
    createChannel,
    updateChannel,
    deleteChannel,
  };
}

// Voice model hooks
export function useVoiceModels() {
  const { data, loading, error, refetch } = useDatabase(() => voiceService.getAll());

  const createVoice = useCallback(async (voice: Omit<VoiceModel, 'id' | 'created_at' | 'updated_at'>) => {
    const newVoice = await voiceService.create(voice);
    await refetch();
    return newVoice;
  }, [refetch]);

  const updateVoice = useCallback(async (id: string, updates: Partial<VoiceModel>) => {
    const updatedVoice = await voiceService.update(id, updates);
    await refetch();
    return updatedVoice;
  }, [refetch]);

  const deleteVoice = useCallback(async (id: string) => {
    await voiceService.delete(id);
    await refetch();
  }, [refetch]);

  return {
    voices: data,
    loading,
    error,
    refetch,
    createVoice,
    updateVoice,
    deleteVoice,
  };
}

// Video hooks
export function useVideos(channelId?: string, status?: Video['status']) {
  const fetchFn = useCallback(() => {
    if (channelId) return videoService.getByChannel(channelId);
    if (status) return videoService.getByStatus(status);
    return videoService.getAll();
  }, [channelId, status]);

  const { data, loading, error, refetch } = useDatabase(fetchFn, [channelId, status]);

  const createVideo = useCallback(async (video: Omit<Video, 'id' | 'generated_at'>) => {
    const newVideo = await videoService.create(video);
    await refetch();
    return newVideo;
  }, [refetch]);

  const updateVideoStatus = useCallback(async (id: string, status: Video['status']) => {
    const updatedVideo = await videoService.updateStatus(id, status);
    await refetch();
    return updatedVideo;
  }, [refetch]);

  const updateVideo = useCallback(async (id: string, updates: Partial<Video>) => {
    const updatedVideo = await videoService.update(id, updates);
    await refetch();
    return updatedVideo;
  }, [refetch]);

  const deleteVideo = useCallback(async (id: string) => {
    await videoService.delete(id);
    await refetch();
  }, [refetch]);

  return {
    videos: data,
    loading,
    error,
    refetch,
    createVideo,
    updateVideoStatus,
    updateVideo,
    deleteVideo,
  };
}

// Channel configuration hook
export function useChannelConfig(channelId: string) {
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!channelId) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await channelConfigService.getByChannel(channelId);
      setConfig(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  const saveConfig = useCallback(async (configData: Omit<ChannelConfig, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const savedConfig = await channelConfigService.createOrUpdate(configData);
      setConfig(savedConfig);
      return savedConfig;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
    saveConfig,
  };
}