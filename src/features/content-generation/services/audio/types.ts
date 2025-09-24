// Tipos unificados para todas as plataformas de áudio
export interface VoiceData {
  voice_id: string;
  nome_voz: string;
  plataforma: 'Fish-Audio' | 'ElevenLabs' | 'Minimax';
  idioma: string;
  genero: string;
  preview_url: string;
  description: string;
  created_at?: string;
  // Campos específicos por plataforma
  [key: string]: any;
}

export interface VoiceListResponse {
  voices: VoiceData[];
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  total?: number;
}

export interface ApiCredential {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
  group_ID?: string;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentVoiceId: string | null;
  audioElement: HTMLAudioElement | null;
}

// Interfaces específicas por plataforma
export interface FishAudioVoiceResponse {
  _id: string;
  title: string;
  description: string;
  languages: string[];
  samples: Array<{
    title: string;
    text: string;
    audio: string;
  }>;
  author: {
    nickname: string;
  };
  like_count: number;
  task_count: number;
}

export interface ElevenLabsVoiceResponse {
  voice_id: string;
  name: string;
  description: string;
  preview_url: string;
  labels: {
    language?: string;
    gender?: string;
    age?: string;
    accent?: string;
    descriptive?: string;
    use_case?: string;
  };
  category: string;
  sharing?: {
    liked_by_count?: number;
    cloned_by_count?: number;
  };
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

export interface MinimaxVoiceResponse {
  voice_id: string;
  voice_name: string;
  description: string[];
  created_time: string;
}

export interface MinimaxApiResponse {
  system_voice: MinimaxVoiceResponse[];
}

export type PlatformType = 'Fish-Audio' | 'ElevenLabs' | 'Minimax';

export interface VoiceServiceOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  language?: string;
  showLegacy?: boolean;
}