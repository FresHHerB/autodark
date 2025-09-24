import { VoiceData, MinimaxVoiceResponse, VoiceListResponse, VoiceServiceOptions } from '../types';
import { BasePlatformService } from './base';

export class MinimaxService extends BasePlatformService {
  protected platformName = 'Minimax' as const;
  protected apiBaseUrl = 'https://api.minimax.io/v1';

  /**
   * Busca dados completos de uma voz específica via Edge Function
   */
  async fetchVoiceDetails(voiceId: string, apiKey?: string): Promise<VoiceData> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log(`🤖 Minimax: Buscando dados para voice_id: ${voiceId}`);

      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-minimax-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_id: voiceId
          // Minimax busca API key do banco automaticamente
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Minimax API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const voiceData = await response.json();
      console.log('🤖 Minimax: Dados obtidos via API:', voiceData);

      return this.normalizeVoiceData(voiceData);
    } catch (error) {
      console.error('🤖 Minimax: Erro ao buscar dados da voz:', error);
      throw error;
    }
  }

  /**
   * Lista vozes do Minimax via Edge Function
   */
  async listVoices(apiKey?: string, options: VoiceServiceOptions = {}): Promise<VoiceListResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/list-minimax-voices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: options.search,
          language: options.language
        })
      });

      if (!response.ok) {
        throw new Error(`Minimax List Error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        voices: data.voices.map((voice: any) => this.normalizeVoiceData(voice)),
        total: data.total
      };
    } catch (error) {
      console.error('🤖 Minimax: Erro ao listar vozes:', error);
      throw error;
    }
  }

  /**
   * Normaliza dados do Minimax para o formato padrão
   */
  protected normalizeVoiceData(rawData: any): VoiceData {
    return {
      voice_id: rawData.voice_id,
      nome_voz: rawData.nome_voz || rawData.voice_name,
      plataforma: 'Minimax',
      idioma: rawData.idioma || this.detectLanguage(rawData.voice_id),
      genero: rawData.genero || this.detectGender(rawData.description || []),
      preview_url: rawData.preview_url || '', // Minimax geralmente não tem preview
      description: rawData.description ? 
        (Array.isArray(rawData.description) ? rawData.description.join(', ') : rawData.description) : '',
      // Campos específicos do Minimax
      created_time: rawData.created_time,
      raw_data: rawData
    };
  }

  /**
   * Detecta idioma baseado no voice_id
   */
  private detectLanguage(voiceId: string): string {
    const id = voiceId.toLowerCase();
    
    if (id.includes('english')) return 'Inglês';
    if (id.includes('chinese') || id.includes('mandarin')) return 'Chinês';
    if (id.includes('spanish')) return 'Espanhol';
    if (id.includes('french')) return 'Francês';
    if (id.includes('german')) return 'Alemão';
    if (id.includes('portuguese')) return 'Português';
    if (id.includes('japanese')) return 'Japonês';
    if (id.includes('korean')) return 'Coreano';
    
    return 'Não especificado';
  }

  /**
   * Detecta gênero baseado na descrição
   */
  private detectGender(description: string[]): string {
    const fullDescription = description.join(' ').toLowerCase();
    
    if (fullDescription.includes('male') && !fullDescription.includes('female')) return 'Masculino';
    if (fullDescription.includes('female') && !fullDescription.includes('male')) return 'Feminino';
    if (fullDescription.includes('girl') || fullDescription.includes('woman')) return 'Feminino';
    if (fullDescription.includes('boy') || fullDescription.includes('man')) return 'Masculino';
    
    return 'Não especificado';
  }

  /**
   * Configura headers específicos do Minimax
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
   * Configura áudio para reprodução (Minimax específico)
   */
  protected configureAudioElement(audio: HTMLAudioElement): void {
    // Minimax geralmente não tem preview, mas configuramos para casos especiais
    audio.addEventListener('loadstart', () => {
      console.log('🤖 Minimax: Iniciando carregamento do áudio');
    });

    audio.addEventListener('canplay', () => {
      console.log('🤖 Minimax: Áudio pronto para reprodução');
    });

    audio.addEventListener('error', (e) => {
      console.error('🤖 Minimax: Erro no áudio:', e);
    });
  }

  /**
   * Minimax geralmente não suporta preview de áudio
   */
  async playPreview(voice: VoiceData): Promise<HTMLAudioElement | null> {
    console.warn('🤖 Minimax: Preview de áudio não disponível para esta plataforma');
    return null;
  }
}