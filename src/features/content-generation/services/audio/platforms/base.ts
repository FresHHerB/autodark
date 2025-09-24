import { VoiceData, VoiceListResponse, VoiceServiceOptions, AudioPlaybackState } from '../types';

/**
 * Classe base abstrata para serviços de plataformas de áudio
 */
export abstract class BasePlatformService {
  protected abstract platformName: string;
  protected abstract apiBaseUrl: string;

  /**
   * Busca dados completos de uma voz específica
   */
  abstract fetchVoiceDetails(voiceId: string, apiKey?: string): Promise<VoiceData>;

  /**
   * Lista vozes da plataforma
   */
  abstract listVoices(apiKey?: string, options?: VoiceServiceOptions): Promise<VoiceListResponse>;

  /**
   * Normaliza dados da plataforma para o formato padrão
   */
  protected abstract normalizeVoiceData(rawData: any): VoiceData;

  /**
   * Configura headers específicos da plataforma
   */
  protected abstract getHeaders(apiKey?: string): HeadersInit;

  /**
   * Configura elemento de áudio para a plataforma
   */
  protected abstract configureAudioElement(audio: HTMLAudioElement): void;

  /**
   * Reproduz preview de áudio (implementação padrão)
   */
  async playPreview(voice: VoiceData): Promise<HTMLAudioElement | null> {
    try {
      if (!voice.preview_url) {
        console.warn(`❌ ${this.platformName}: Voz sem preview URL`, voice.nome_voz);
        return null;
      }

      // Verificar se a URL é válida
      if (!voice.preview_url.startsWith('http')) {
        console.warn(`❌ ${this.platformName}: URL inválida para`, voice.nome_voz);
        return null;
      }

      // Criar elemento de áudio
      const audio = new Audio(voice.preview_url);

      // Configurar elemento específico da plataforma
      this.configureAudioElement(audio);

      // Reproduzir áudio
      try {
        await audio.play();
        console.log(`✅ ${this.platformName}: Áudio iniciado para`, voice.nome_voz);
      } catch (playError) {
        console.warn(`⚠️ ${this.platformName}: Erro no play, tentando fallback...`);

        // Tentar novamente sem CORS como fallback para Fish Audio
        if (this.platformName === 'Fish-Audio' && playError.message.includes('no supported source')) {
          console.log(`🔄 ${this.platformName}: Tentando sem CORS...`);
          const audioFallback = new Audio(voice.preview_url);
          audioFallback.crossOrigin = null; // Sem CORS
          audioFallback.preload = 'auto';

          try {
            await audioFallback.play();
            console.log(`✅ ${this.platformName}: Sucesso com fallback!`);
            return audioFallback;
          } catch (fallbackError) {
            console.error(`❌ ${this.platformName}: Fallback falhou:`, fallbackError.message);
            throw fallbackError;
          }
        }

        throw playError; // Re-throw se não conseguiu resolver
      }
      
      return audio;

    } catch (error) {
      console.error(`❌ ${this.platformName}: Erro ao reproduzir preview de ${voice.nome_voz}:`, error.message);
      return null;
    }
  }

  /**
   * Para reprodução de áudio
   */
  stopAudio(audio: HTMLAudioElement | null): void {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Valida se uma URL de áudio é válida
   */
  protected isValidAudioUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;
    
    // Verificar extensões de áudio comuns
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    const hasAudioExtension = audioExtensions.some(ext => url.toLowerCase().includes(ext));
    
    // Se não tem extensão de áudio, ainda pode ser válido (alguns serviços usam URLs dinâmicas)
    return true;
  }

  /**
   * Cria um timeout para operações de rede
   */
  protected createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms);
    });
  }

  /**
   * Faz uma requisição com timeout
   */
  protected async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      this.createTimeout(timeoutMs)
    ]);
  }
}