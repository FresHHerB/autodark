import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Tables Types
export interface Channel {
  id: string;
  nome_canal: string;
  prompt_roteiro: string;
  prompt_titulo: string;
  created_at: string;
  voz_prefereida?: number;
  media_chars?: number;
  prompt_thumb?: string;
  titulos?: any;
  roteiros?: any;
  url_canal?: string;
}

export interface VoiceModel {
  id: string;
  voice_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  channel_id: string;
  title: string;
  script: string;
  thumbnail_url?: string;
  status: 'pending' | 'approved' | 'needs-changes' | 'published';
  idea: string;
  estimated_duration: string;
  generated_at: string;
  approved_at?: string;
  published_at?: string;
}

export interface ChannelConfig {
  id: string;
  channel_id: string;
  title_prompt: string;
  script_prompt: string;
  main_theme: string;
  tags: string;
  description_prompt: string;
  image_style: string;
  word_count: number;
  voice_id: string;
  created_at: string;
  updated_at: string;
}

export interface Canal {
  id: number;
  nome_canal: string;
  prompt_titulo: string;
  prompt_roteiro: string;
  prompt_thumb?: string;
  voz_prefereida?: number | null;
  media_chars?: number | null;
  url_canal?: string;
  profile_image?: string | null;
  drive_url?: string | null;
  titulos?: any;
  roteiros?: any;
  caption_style?: any;
  detailed_style?: any;
  created_at: string;
}

export interface ApiCredential {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
  group_ID?: string;
}

export interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string;
  idioma: string;
  genero?: string;
  created_at: string;
}