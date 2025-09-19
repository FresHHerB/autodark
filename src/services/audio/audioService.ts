import { supabase } from '../../lib/supabase';
import { VoiceData, VoiceListResponse, ApiCredential, AudioPlaybackState, PlatformType, VoiceServiceOptions } from './types';
import { FishAudioService } from './platforms/fishAudio';
import { ElevenLabsService } from './platforms/elevenLabs';
import { MinimaxService } from './platforms/minimax';

/**
 * Serviço unificado para gerenciamento de vozes de todas as plataformas
 */
export class AudioService {
  private fishAudioService: FishAudioService;
  private elevenLabsService: ElevenLabsService;
  private minimaxService: MinimaxService;
  
  // Estado de reprodução global
  private playbackState: AudioPlaybackState = {
    isPlaying: false,
    currentVoiceId: null,
    audioElement: null
  };

  constructor() {
    this.fishAudioService = new FishAudioService();
    this.elevenLabsService = new ElevenLabsService();
    this.minimaxService = new MinimaxService();
  }

  /**
   * Obtém o serviço específico da plataforma
   */
  private getPlatformService(platform: PlatformType) {
    switch (platform) {
      case 'Fish-Audio':
        return this.fishAudioService;
      case 'ElevenLabs':
        return this.elevenLabsService;
      case 'Minimax':
        return this.minimaxService;
      default:
        throw new Error(`Plataforma não suportada: ${platform}`);
    }
  }

  /**
   * Busca todas as vozes do banco de dados local
   */
  async getAllVoicesFromDatabase(): Promise<VoiceData[]> {
    try {
      console.log('🔍 AudioService: Buscando todas as vozes do banco de dados...');
      
      const { data, error } = await supabase
        .from('vozes')
        .select('*')
        .order('nome_voz', { ascending: true });
      
      if (error) throw error;
      
      const voices = (data || []).map(voice => ({
        voice_id: voice.voice_id,
        nome_voz: voice.nome_voz,
        plataforma: voice.plataforma as PlatformType,
        idioma: voice.idioma || 'Não especificado',
        genero: voice.genero || 'Não especificado',
        preview_url: voice.preview_url || '',
        description: '',
        created_at: voice.created_at,
        id: voice.id
      }));
      
      console.log('📊 AudioService: Vozes carregadas do banco:', {
        total: voices.length,
        porPlataforma: voices.reduce((acc, voice) => {
          acc[voice.plataforma] = (acc[voice.plataforma] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        fishAudioComPreview: voices.filter(v => v.plataforma === 'Fish-Audio' && v.preview_url).length,
        fishAudioSemPreview: voices.filter(v => v.plataforma === 'Fish-Audio' && !v.preview_url).length
      });


      return voices;
    } catch (error) {
      console.error('Erro ao buscar vozes do banco:', error);
      throw error;
    }
  }

  /**
   * Busca vozes por plataforma do banco de dados local
   */
  async getVoicesByPlatformFromDatabase(platform: PlatformType): Promise<VoiceData[]> {
    try {
      const { data, error } = await supabase
        .from('vozes')
        .select('*')
        .eq('plataforma', platform)
        .order('nome_voz', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(voice => ({
        voice_id: voice.voice_id,
        nome_voz: voice.nome_voz,
        plataforma: voice.plataforma as PlatformType,
        idioma: voice.idioma || 'Não especificado',
        genero: voice.genero || 'Não especificado',
        preview_url: voice.preview_url || '',
        description: '',
        created_at: voice.created_at,
        id: voice.id
      }));
    } catch (error) {
      console.error(`Erro ao buscar vozes ${platform} do banco:`, error);
      throw error;
    }
  }

  /**
   * Busca credenciais de API do banco de dados
   */
  async getApiCredentials(): Promise<ApiCredential[]> {
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .order('plataforma', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar credenciais de API:', error);
      throw error;
    }
  }

  /**
   * Busca API key por plataforma
   */
  async getApiKeyByPlatform(platform: PlatformType): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', platform)
        .single();

      if (error) {
        console.warn(`❌ AudioService: Erro ao buscar API key ${platform}:`, error.message);
        return null;
      }
      return data?.api_key || null;
    } catch (error) {
      console.error(`❌ AudioService: Erro ao buscar API key ${platform}:`, error.message);
      return null;
    }
  }

  /**
   * Busca dados completos de uma voz específica via API
   */
  async fetchVoiceDetails(platform: PlatformType, voiceId: string): Promise<VoiceData> {
    try {
      const service = this.getPlatformService(platform);
      const apiKey = await this.getApiKeyByPlatform(platform);

      return await service.fetchVoiceDetails(voiceId, apiKey || undefined);
    } catch (error) {
      console.error(`❌ AudioService: Erro ao buscar detalhes da voz ${platform}:`, error.message);
      throw error;
    }
  }

  /**
   * Lista vozes de uma plataforma via API
   */
  async listVoicesFromApi(platform: PlatformType, options: VoiceServiceOptions = {}): Promise<VoiceListResponse> {
    try {
      const service = this.getPlatformService(platform);
      const apiKey = await this.getApiKeyByPlatform(platform);
      
      return await service.listVoices(apiKey || undefined, options);
    } catch (error) {
      console.error(`Erro ao listar vozes ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Salva uma voz no banco de dados local
   */
  async saveVoiceToDatabase(voiceData: VoiceData): Promise<void> {
    try {
      const { error } = await supabase
        .from('vozes')
        .upsert({
          voice_id: voiceData.voice_id,
          nome_voz: voiceData.nome_voz,
          plataforma: voiceData.plataforma,
          idioma: voiceData.idioma,
          genero: voiceData.genero,
          preview_url: voiceData.preview_url
        }, {
          onConflict: 'voice_id,plataforma'
        });

      if (error) throw error;
      console.log(`✅ Voz ${voiceData.nome_voz} salva no banco`);
    } catch (error) {
      console.error('Erro ao salvar voz no banco:', error);
      throw error;
    }
  }

  /**
   * Busca e salva automaticamente uma voz no banco
   */
  async fetchAndSaveVoice(platform: PlatformType, voiceId: string): Promise<VoiceData> {
    try {
      const voiceData = await this.fetchVoiceDetails(platform, voiceId);
      await this.saveVoiceToDatabase(voiceData);
      return voiceData;
    } catch (error) {
      console.error(`Erro ao buscar e salvar voz ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Reproduz preview de áudio de uma voz
   */
  async playVoicePreview(voice: VoiceData): Promise<HTMLAudioElement | null> {
    try {
      console.log('🎵 AudioService: Reproduzindo preview', voice.nome_voz, `(${voice.plataforma})`);

      // Parar áudio atual se estiver tocando
      this.stopCurrentAudio();

      console.log(`🎵 AudioService: Tentando reproduzir preview para:`, {
        nome: voice.nome_voz,
        plataforma: voice.plataforma,
        preview_url: voice.preview_url,
        voice_id: voice.voice_id,
        temPreviewUrl: !!voice.preview_url
      });

      let audioElement: HTMLAudioElement | null = null;

      // Para Fish Audio, sempre buscar URL fresca da API a cada clique (URLs são temporárias)
      if (voice.plataforma === 'Fish-Audio') {
        console.log('🐟 AudioService: Buscando URL fresca do Fish Audio para', voice.nome_voz);

        try {
          const fishAudioData = await this.fetchVoiceDetails('Fish-Audio', voice.voice_id);

          if (fishAudioData && fishAudioData.preview_url) {
            // Usar URL fresca diretamente (não salvar no banco pois é temporária)
            voice = { ...voice, preview_url: fishAudioData.preview_url };
            console.log('✅ AudioService: URL fresca obtida com sucesso');
          } else {
            console.warn('⚠️ AudioService: Não foi possível obter preview para', voice.nome_voz);
            return null;
          }
        } catch (error) {
          console.error('❌ AudioService: Erro ao buscar dados Fish Audio:', error.message);
          return null;
        }
      }

      // Usar o serviço específico da plataforma para reproduzir
      const service = this.getPlatformService(voice.plataforma);

      audioElement = await service.playPreview(voice);

      if (audioElement) {
        // Atualizar estado de reprodução
        this.playbackState = {
          isPlaying: true,
          currentVoiceId: voice.voice_id,
          audioElement
        };

        // Configurar eventos para limpar estado quando terminar
        audioElement.addEventListener('ended', () => {
          console.log(`🎵 AudioService: Áudio finalizado para ${voice.nome_voz}`);
          this.clearPlaybackState();
        });
        
        audioElement.addEventListener('error', () => {
          console.error(`🎵 AudioService: Erro no áudio para ${voice.nome_voz}`);
          this.clearPlaybackState();
        });

        console.log(`✅ AudioService: Preview iniciado com sucesso para ${voice.nome_voz}`);
      }

      return audioElement;
    } catch (error) {
      console.error('🚨 AudioService: Erro ao reproduzir preview:', {
        voice: voice.nome_voz,
        plataforma: voice.plataforma,
        error: error.message,
        stack: error.stack
      });
      this.clearPlaybackState();
      return null;
    }
  }

  /**
   * Para o áudio atual em reprodução
   */
  stopCurrentAudio(): void {
    if (this.playbackState.audioElement) {
      const service = this.getPlatformService(this.getCurrentPlatform());
      service.stopAudio(this.playbackState.audioElement);
      this.clearPlaybackState();
    }
  }

  /**
   * Verifica se uma voz específica está tocando
   */
  isVoicePlaying(voiceId: string): boolean {
    return this.playbackState.isPlaying && this.playbackState.currentVoiceId === voiceId;
  }

  /**
   * Obtém o estado atual de reprodução
   */
  getPlaybackState(): AudioPlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Limpa o estado de reprodução
   */
  private clearPlaybackState(): void {
    this.playbackState = {
      isPlaying: false,
      currentVoiceId: null,
      audioElement: null
    };
  }

  /**
   * Obtém a plataforma atual baseada no estado de reprodução
   */
  private getCurrentPlatform(): PlatformType {
    // Fallback para Fish-Audio se não conseguir determinar
    return 'Fish-Audio';
  }


  /**
   * Busca vozes de todas as plataformas (híbrido: banco + API)
   */
  async searchVoicesAllPlatforms(searchTerm?: string): Promise<VoiceData[]> {
    try {
      // Primeiro, buscar do banco local
      const localVoices = await this.getAllVoicesFromDatabase();
      
      // Filtrar por termo de busca se fornecido
      let filteredVoices = localVoices;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredVoices = localVoices.filter(voice => 
          voice.nome_voz.toLowerCase().includes(term) ||
          voice.plataforma.toLowerCase().includes(term) ||
          voice.idioma.toLowerCase().includes(term)
        );
      }

      return filteredVoices;
    } catch (error) {
      console.error('Erro ao buscar vozes de todas as plataformas:', error);
      throw error;
    }
  }

  /**
   * Sincroniza vozes de uma plataforma (busca da API e salva no banco)
   */
  async syncPlatformVoices(platform: PlatformType, options: VoiceServiceOptions = {}): Promise<number> {
    try {
      console.log(`🔄 Sincronizando vozes ${platform}...`);
      
      const result = await this.listVoicesFromApi(platform, options);
      let savedCount = 0;

      for (const voice of result.voices) {
        try {
          await this.saveVoiceToDatabase(voice);
          savedCount++;
        } catch (error) {
          console.warn(`Erro ao salvar voz ${voice.nome_voz}:`, error);
        }
      }

      console.log(`✅ ${savedCount} vozes ${platform} sincronizadas`);
      return savedCount;
    } catch (error) {
      console.error(`Erro ao sincronizar vozes ${platform}:`, error);
      throw error;
    }
  }
}

// Instância singleton do serviço
export const audioService = new AudioService();