import { supabase } from '../../../lib/supabase';
import { VoiceData, FishAudioVoiceResponse, VoiceListResponse, VoiceServiceOptions } from '../types';
import { BasePlatformService } from './base';

export class FishAudioService extends BasePlatformService {
  protected platformName = 'Fish-Audio' as const;
  protected apiBaseUrl = 'https://api.fish.audio';

  /**
   * Busca dados completos de uma voz específica via Edge Function
   */
  async fetchVoiceDetails(voiceId: string, apiKey?: string): Promise<VoiceData> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuração do Supabase não encontrada');
      }

      console.log(`🐟 FishAudioService: Iniciando busca de dados`, {
        voice_id: voiceId,
        temApiKey: !!apiKey,
        supabaseUrl: supabaseUrl ? 'configurado' : 'não configurado',
        supabaseAnonKey: supabaseAnonKey ? 'configurado' : 'não configurado'
      });

      const requestBody = {
        voice_id: voiceId,
        ...(apiKey && { api_key: apiKey })
      };
      
      console.log(`🐟 FishAudioService: Fazendo requisição para Edge Function`, {
        url: `${supabaseUrl}/functions/v1/fetch-fish-audio-voice`,
        body: requestBody
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-fish-audio-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`🐟 FishAudioService: Resposta da Edge Function`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`🐟 FishAudioService: Erro na resposta da API`, {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Fish Audio API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const voiceData = await response.json();
      console.log('🐟 FishAudioService: Dados obtidos via API:', {
        voice_id: voiceData.voice_id,
        nome_voz: voiceData.nome_voz,
        preview_url: voiceData.preview_url,
        temSamples: !!voiceData.samples,
        quantidadeSamples: voiceData.samples?.length || 0,
        dadosCompletos: voiceData
      });

      const normalizedData = this.normalizeVoiceData(voiceData);
      
      console.log('🐟 FishAudioService: Dados normalizados:', {
        voice_id: normalizedData.voice_id,
        nome_voz: normalizedData.nome_voz,
        preview_url: normalizedData.preview_url,
        plataforma: normalizedData.plataforma
      });
      
      return normalizedData;
    } catch (error) {
      console.error('🐟 FishAudioService: Erro ao buscar dados da voz:', {
        voice_id: voiceId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Lista vozes do Fish Audio via Edge Function
   */
  async listVoices(apiKey?: string, options: VoiceServiceOptions = {}): Promise<VoiceListResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/list-fish-audio-voices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(apiKey && { api_key: apiKey }),
          page: options.page || 1,
          page_size: options.pageSize || 20,
          search: options.search,
          language: options.language
        })
      });

      if (!response.ok) {
        throw new Error(`Fish Audio List Error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        voices: data.voices.map((voice: any) => this.normalizeVoiceData(voice)),
        pagination: data.pagination,
        total: data.total
      };
    } catch (error) {
      console.error('🐟 Fish Audio: Erro ao listar vozes:', error);
      throw error;
    }
  }

  /**
   * Normaliza dados do Fish Audio para o formato padrão
   */
  protected normalizeVoiceData(rawData: any): VoiceData {
    return {
      voice_id: rawData.voice_id || rawData._id,
      nome_voz: rawData.nome_voz || rawData.title,
      plataforma: 'Fish-Audio',
      idioma: rawData.idioma || (rawData.languages ? rawData.languages.join(', ') : 'Não especificado'),
      genero: rawData.genero || 'Não especificado',
      preview_url: rawData.preview_url || (rawData.samples?.[0]?.audio) || '',
      description: rawData.description || '',
      // Campos específicos do Fish Audio
      author: rawData.author || (rawData.author?.nickname),
      popularity: rawData.popularity || rawData.like_count || 0,
      samples: rawData.samples || [],
      raw_data: rawData
    };
  }

  /**
   * Configura headers específicos do Fish Audio
   */
  protected getHeaders(apiKey?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  /**
   * Configura áudio para reprodução (Fish Audio específico)
   */
  protected configureAudioElement(audio: HTMLAudioElement): void {
    audio.crossOrigin = 'anonymous';
    
    // Headers específicos para Fish Audio se necessário
    audio.addEventListener('loadstart', () => {
      console.log('🐟 Fish Audio: Iniciando carregamento do áudio');
    });

    audio.addEventListener('canplay', () => {
      console.log('🐟 Fish Audio: Áudio pronto para reprodução');
    });

    audio.addEventListener('error', (e) => {
      console.error('🐟 Fish Audio: Erro no áudio:', e);
    });
  }
}