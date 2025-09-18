import { VoiceData, ElevenLabsVoiceResponse, VoiceListResponse, VoiceServiceOptions } from '../types';
import { BasePlatformService } from './base';

export class ElevenLabsService extends BasePlatformService {
  protected platformName = 'ElevenLabs' as const;
  protected apiBaseUrl = 'https://api.elevenlabs.io/v1';

  /**
   * Busca dados completos de uma voz específica via Edge Function
   */
  async fetchVoiceDetails(voiceId: string, apiKey?: string): Promise<VoiceData> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log(`🎙️ ElevenLabs: Buscando dados para voice_id: ${voiceId}`);

      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-elevenlabs-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_id: voiceId,
          ...(apiKey && { api_key: apiKey })
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const voiceData = await response.json();
      console.log('🎙️ ElevenLabs: Dados obtidos via API:', voiceData);

      return this.normalizeVoiceData(voiceData);
    } catch (error) {
      console.error('🎙️ ElevenLabs: Erro ao buscar dados da voz:', error);
      throw error;
    }
  }

  /**
   * Lista vozes do ElevenLabs via Edge Function
   */
  async listVoices(apiKey?: string, options: VoiceServiceOptions = {}): Promise<VoiceListResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/list-elevenlabs-voices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(apiKey && { api_key: apiKey }),
          show_legacy: options.showLegacy || false
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs List Error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        voices: data.voices.map((voice: any) => this.normalizeVoiceData(voice)),
        total: data.total
      };
    } catch (error) {
      console.error('🎙️ ElevenLabs: Erro ao listar vozes:', error);
      throw error;
    }
  }

  /**
   * Normaliza dados do ElevenLabs para o formato padrão
   */
  protected normalizeVoiceData(rawData: any): VoiceData {
    // Mapeamento de idiomas
    const languageMap: Record<string, string> = {
      'en': 'Inglês',
      'pt': 'Português',
      'es': 'Espanhol',
      'fr': 'Francês',
      'de': 'Alemão',
      'it': 'Italiano',
      'ja': 'Japonês',
      'ko': 'Coreano',
      'zh': 'Chinês'
    };

    // Mapeamento de gêneros
    const genderMap: Record<string, string> = {
      'male': 'Masculino',
      'female': 'Feminino',
      'neutral': 'Neutro'
    };

    const language = rawData.labels?.language || 'en';
    const gender = rawData.labels?.gender || 'neutral';

    return {
      voice_id: rawData.voice_id,
      nome_voz: rawData.nome_voz || rawData.name,
      plataforma: 'ElevenLabs',
      idioma: rawData.idioma || languageMap[language] || 'Inglês',
      genero: rawData.genero || genderMap[gender] || 'Não especificado',
      preview_url: rawData.preview_url || '',
      description: rawData.description || '',
      // Campos específicos do ElevenLabs
      category: rawData.category,
      age: rawData.labels?.age,
      accent: rawData.labels?.accent,
      use_case: rawData.labels?.use_case,
      popularity: (rawData.sharing?.liked_by_count || 0) + (rawData.sharing?.cloned_by_count || 0),
      settings: rawData.settings,
      raw_data: rawData
    };
  }

  /**
   * Configura headers específicos do ElevenLabs
   */
  protected getHeaders(apiKey?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (apiKey) {
      headers['xi-api-key'] = apiKey;
    }

    return headers;
  }

  /**
   * Configura áudio para reprodução (ElevenLabs específico)
   */
  protected configureAudioElement(audio: HTMLAudioElement): void {
    // ElevenLabs geralmente não precisa de configurações especiais
    audio.addEventListener('loadstart', () => {
      console.log('🎙️ ElevenLabs: Iniciando carregamento do áudio');
    });

    audio.addEventListener('canplay', () => {
      console.log('🎙️ ElevenLabs: Áudio pronto para reprodução');
    });

    audio.addEventListener('error', (e) => {
      console.error('🎙️ ElevenLabs: Erro no áudio:', e);
    });
  }
}