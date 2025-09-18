import { supabase, Channel, VoiceModel, Video, ChannelConfig } from '../lib/supabase';

// Channel Database Operations
export class ChannelService {
  async getAll(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async create(channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>): Promise<Channel> {
    const { data, error } = await supabase
      .from('channels')
      .insert([channel])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<Channel>): Promise<Channel> {
    const { data, error } = await supabase
      .from('channels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

// Voice Model Database Operations
export class VoiceService {
  async getAll(): Promise<VoiceModel[]> {
    const { data, error } = await supabase
      .from('voice_models')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async create(voice: Omit<VoiceModel, 'id' | 'created_at' | 'updated_at'>): Promise<VoiceModel> {
    const { data, error } = await supabase
      .from('voice_models')
      .insert([voice])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<VoiceModel>): Promise<VoiceModel> {
    const { data, error } = await supabase
      .from('voice_models')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('voice_models')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

// Video Database Operations
export class VideoService {
  async getAll(): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        channels (
          name,
          description
        )
      `)
      .order('generated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getByChannel(channelId: string): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('channel_id', channelId)
      .order('generated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getByStatus(status: Video['status']): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        channels (
          name,
          description
        )
      `)
      .eq('status', status)
      .order('generated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async create(video: Omit<Video, 'id' | 'generated_at'>): Promise<Video> {
    const { data, error } = await supabase
      .from('videos')
      .insert([{ ...video, generated_at: new Date().toISOString() }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, status: Video['status']): Promise<Video> {
    const updates: any = { status };
    
    if (status === 'approved') {
      updates.approved_at = new Date().toISOString();
    } else if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<Video>): Promise<Video> {
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

// Channel Configuration Database Operations
export class ChannelConfigService {
  async getByChannel(channelId: string): Promise<ChannelConfig | null> {
    const { data, error } = await supabase
      .from('channel_configs')
      .select('*')
      .eq('channel_id', channelId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createOrUpdate(config: Omit<ChannelConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ChannelConfig> {
    const { data, error } = await supabase
      .from('channel_configs')
      .upsert([{
        ...config,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Export service instances
export const channelService = new ChannelService();
export const voiceService = new VoiceService();
export const videoService = new VideoService();
export const channelConfigService = new ChannelConfigService();