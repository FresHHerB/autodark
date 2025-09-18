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
        console.warn(`${this.platformName}: Voz ${voice.nome_voz} não possui preview disponível`, {
          voice_id: voice.voice_id,
          preview_url: voice.preview_url
        });
        return null;
      }

      // Verificar se a URL é válida
      if (!voice.preview_url.startsWith('http')) {
        console.warn(`${this.platformName}: Preview URL inválida para ${voice.nome_voz}`, {
          voice_id: voice.voice_id,
          preview_url: voice.preview_url,
          startsWithHttp: voice.preview_url.startsWith('http')
        });
        return null;
      }

      console.log(`${this.platformName}: Iniciando reprodução de preview`, {
        voice_id: voice.voice_id,
        nome_voz: voice.nome_voz,
        preview_url: voice.preview_url,
        urlValida: this.isValidAudioUrl(voice.preview_url)
      });

      // Criar elemento de áudio
      const audio = new Audio(voice.preview_url);
      
      // Configurar elemento específico da plataforma
      this.configureAudioElement(audio);
      
      console.log(`${this.platformName}: Elemento de áudio criado, tentando reproduzir...`, {
        src: audio.src,
        readyState: audio.readyState
      });
      
      // Reproduzir áudio
      await audio.play();
      
      console.log(`${this.platformName}: Áudio iniciado com sucesso`, {
        currentTime: audio.currentTime,
        duration: audio.duration,
        paused: audio.paused
      });
      
      return audio;

    } catch (error) {
      console.error(`${this.platformName}: Erro ao reproduzir preview:`, {
        voice_id: voice.voice_id,
        nome_voz: voice.nome_voz,
        preview_url: voice.preview_url,
        error: error.message,
        stack: error.stack
      });
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