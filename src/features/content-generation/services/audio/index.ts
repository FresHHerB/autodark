// Exportações principais do módulo de áudio
export { audioService } from './audioService';
export { AudioService } from './audioService';

// Exportar tipos
export type {
  VoiceData,
  VoiceListResponse,
  ApiCredential,
  AudioPlaybackState,
  PlatformType,
  VoiceServiceOptions,
  FishAudioVoiceResponse,
  ElevenLabsVoiceResponse,
  MinimaxVoiceResponse,
  MinimaxApiResponse
} from './types';

// Exportar serviços de plataforma (para uso avançado)
export { FishAudioService } from './platforms/fishAudio';
export { ElevenLabsService } from './platforms/elevenLabs';
export { MinimaxService } from './platforms/minimax';
export { BasePlatformService } from './platforms/base';