import { supabase } from '@shared/lib';
import { VoiceData, FishAudioVoiceResponse, VoiceListResponse, VoiceServiceOptions } from '../types';
import { BasePlatformService } from './base';

export class FishAudioService extends BasePlatformService {
  protected platformName = 'Fish-Audio' as const;
  protected apiBaseUrl = 'https://api.fish.audio';

  constructor() {
    super();
    console.log('🐟 FishAudioService: Serviço inicializado', {
      platformName: this.platformName,
      apiBaseUrl: this.apiBaseUrl,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Busca dados completos de uma voz específica via Edge Function
   */
  async fetchVoiceDetails(voiceId: string, apiKey?: string): Promise<VoiceData> {
    const startTime = Date.now();
    const logPrefix = `🐟 FishAudioService.fetchVoiceDetails[${voiceId}]`;

    try {
      console.group(`${logPrefix}: INICIANDO BUSCA DE DADOS DA VOZ`);
      console.log(`📋 Parâmetros iniciais:`, {
        voice_id: voiceId,
        voiceId_type: typeof voiceId,
        voiceId_length: voiceId?.length,
        temApiKey: !!apiKey,
        apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'não fornecida',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log(`🔧 Configuração do ambiente:`, {
        supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NÃO CONFIGURADO',
        supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NÃO CONFIGURADO',
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE
      });

      if (!supabaseUrl || !supabaseAnonKey) {
        const error = new Error('Configuração do Supabase não encontrada');
        console.error(`${logPrefix}: ERRO DE CONFIGURAÇÃO`, {
          supabaseUrl: !!supabaseUrl,
          supabaseAnonKey: !!supabaseAnonKey,
          envVars: Object.keys(import.meta.env)
        });
        throw error;
      }

      const requestBody = {
        voice_id: voiceId,
        ...(apiKey && { api_key: apiKey })
      };

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/fetch-fish-audio-voice`;

      console.log(`📤 REQUISIÇÃO PARA EDGE FUNCTION:`, {
        url: edgeFunctionUrl,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey.substring(0, 20)}...`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
        bodyStringified: JSON.stringify(requestBody)
      });

      let response;
      let fetchStartTime = Date.now();

      try {
        console.log(`⏱️ Iniciando requisição HTTP...`);

        response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        const fetchDuration = Date.now() - fetchStartTime;

        console.log(`📥 RESPOSTA DA EDGE FUNCTION:`, {
          url: edgeFunctionUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          type: response.type,
          redirected: response.redirected,
          bodyUsed: response.bodyUsed,
          headers: Object.fromEntries(response.headers.entries()),
          fetchDuration: `${fetchDuration}ms`,
          responseSize: response.headers.get('content-length')
        });

        // Log adicional para status codes específicos
        if (response.status >= 400) {
          console.warn(`⚠️ Status de erro detectado:`, {
            status: response.status,
            statusText: response.statusText,
            possiveisMotivos: {
              400: 'Bad Request - parâmetros inválidos',
              401: 'Unauthorized - problema com API key ou auth',
              404: 'Not Found - voice_id não existe',
              500: 'Internal Server Error - erro no servidor'
            }[response.status] || 'Erro desconhecido'
          });
        }

      } catch (fetchError) {
        const fetchDuration = Date.now() - fetchStartTime;
        console.error(`%c🚨 ERRO DE REDE NA EDGE FUNCTION:`, 'color: red; font-weight: bold;', {
          error: fetchError.message,
          errorType: fetchError.name,
          errorStack: fetchError.stack,
          url: edgeFunctionUrl,
          fetchDuration: `${fetchDuration}ms`,
          networkState: navigator.onLine ? 'ONLINE' : 'OFFLINE',
          timestamp: new Date().toISOString()
        });
        response = { ok: false, status: 0, statusText: 'Network Error' }; // Simular resposta falhada para ativar fallback
        console.log('%c🔄 ATIVANDO FALLBACK devido ao erro de rede...', 'color: yellow; font-weight: bold;');
      }

      if (!response.ok) {
        console.group(`🔄 ATIVANDO FALLBACK - EDGE FUNCTION FALHOU`);
        console.warn(`Edge Function falhou:`, {
          status: response.status,
          statusText: response.statusText,
          url: edgeFunctionUrl,
          reason: 'Tentando API direta como fallback'
        });

        // Fallback: chamada direta para a API Fish Audio
        let fishAudioApiKey = apiKey;

        if (!fishAudioApiKey) {
          console.log(`🔑 API key não fornecida, buscando no banco de dados...`);

          // Buscar API key do banco para o fallback
          try {
            const dbQueryStart = Date.now();
            const { data: apiData, error: apiError } = await supabase
              .from('apis')
              .select('api_key')
              .eq('plataforma', 'Fish-Audio')
              .single();

            const dbQueryDuration = Date.now() - dbQueryStart;

            console.log(`📊 Resultado da consulta ao banco:`, {
              hasData: !!apiData,
              hasApiKey: !!(apiData?.api_key),
              hasError: !!apiError,
              error: apiError,
              queryDuration: `${dbQueryDuration}ms`
            });

            if (apiError || !apiData?.api_key) {
              throw new Error(`API key do Fish-Audio não encontrada: ${apiError?.message || 'Dados não retornados'}`);
            }

            fishAudioApiKey = apiData.api_key;
            console.log(`✅ API key encontrada no banco de dados`, {
              keyLength: fishAudioApiKey.length,
              keyPreview: `${fishAudioApiKey.substring(0, 10)}...`
            });
          } catch (dbError) {
            console.error(`🚨 ERRO ao buscar API key do banco:`, {
              error: dbError.message,
              errorType: dbError.name,
              errorStack: dbError.stack
            });
            console.log(`🎯 Usando API key 'demo' como último recurso`);
            fishAudioApiKey = 'demo';
          }
        } else {
          console.log(`🔑 Usando API key fornecida`, {
            keyLength: fishAudioApiKey.length,
            keyPreview: `${fishAudioApiKey.substring(0, 10)}...`
          });
        }

        const directApiUrl = `https://api.fish.audio/model/${voiceId}`;

        console.log(`📤 REQUISIÇÃO DIRETA PARA API FISH AUDIO:`, {
          url: directApiUrl,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${fishAudioApiKey.substring(0, 10)}...`,
            'Content-Type': 'application/json',
          },
          apiKeyUsed: fishAudioApiKey === 'demo' ? 'DEMO' : 'REAL'
        });

        const directFetchStart = Date.now();
        const directResponse = await fetch(directApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${fishAudioApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const directFetchDuration = Date.now() - directFetchStart;

        console.log(`📥 RESPOSTA DA API FISH AUDIO:`, {
          url: directApiUrl,
          status: directResponse.status,
          statusText: directResponse.statusText,
          ok: directResponse.ok,
          headers: Object.fromEntries(directResponse.headers.entries()),
          fetchDuration: `${directFetchDuration}ms`,
          responseSize: directResponse.headers.get('content-length')
        });

        if (!directResponse.ok) {
          let errorText = '';
          try {
            errorText = await directResponse.text();
          } catch (e) {
            errorText = 'Não foi possível ler o corpo da resposta de erro';
          }

          console.error(`🚨 ERRO NA API FISH AUDIO DIRETA:`, {
            url: directApiUrl,
            status: directResponse.status,
            statusText: directResponse.statusText,
            errorText,
            headers: Object.fromEntries(directResponse.headers.entries()),
            possiveisMotivos: {
              400: 'Parâmetros inválidos na requisição',
              401: 'API key inválida ou expirada',
              403: 'Acesso negado ou rate limit',
              404: 'Voice ID não encontrado',
              429: 'Rate limit excedido',
              500: 'Erro interno do servidor Fish Audio',
              503: 'Serviço indisponível'
            }[directResponse.status] || 'Erro desconhecido'
          });

          throw new Error(`Fish Audio API Error: ${directResponse.status} - ${errorText}`);
        }

        console.groupEnd(); // Fecha o grupo do fallback

        const rawVoiceData = await directResponse.json();

        console.log('📦 DADOS BRUTOS DA API FISH AUDIO:', {
          _id: rawVoiceData._id,
          title: rawVoiceData.title,
          description: rawVoiceData.description,
          author: rawVoiceData.author,
          like_count: rawVoiceData.like_count,
          languages: rawVoiceData.languages,
          tags: rawVoiceData.tags,
          created_at: rawVoiceData.created_at,
          updated_at: rawVoiceData.updated_at,
          temSamples: !!rawVoiceData.samples,
          quantidadeSamples: rawVoiceData.samples?.length || 0,
          samples: rawVoiceData.samples?.map((sample, index) => ({
            index,
            audio: sample.audio ? `${sample.audio.substring(0, 50)}...` : null,
            duration: sample.duration,
            type: sample.type
          })),
          dadosCompletos: rawVoiceData
        });

        // Processar dados raw para formato esperado
        // IMPORTANTE: Preservar URL completa com parâmetros de autenticação AWS S3
        const fullAudioUrl = rawVoiceData.samples?.[0]?.audio || '';

        // Validar URL obtida
        if (!fullAudioUrl) {
          console.warn('⚠️ Fish Audio: Nenhuma URL de áudio encontrada nos samples');
        }

        const processedData = {
          voice_id: rawVoiceData._id,
          nome_voz: rawVoiceData.title,
          plataforma: 'Fish-Audio',
          idioma: rawVoiceData.languages?.join(', ') || 'Não especificado',
          genero: 'Não especificado',
          preview_url: fullAudioUrl, // URL completa com todos os parâmetros AWS S3
          description: rawVoiceData.description || '',
          author: rawVoiceData.author?.nickname || 'Desconhecido',
          popularity: rawVoiceData.like_count || 0,
          samples: rawVoiceData.samples || [],
          raw_data: rawVoiceData
        };

        console.group('⚙️ PROCESSAMENTO DE DADOS');
        console.log('Dados processados (API direta):', {
          voice_id: processedData.voice_id,
          nome_voz: processedData.nome_voz,
          plataforma: processedData.plataforma,
          idioma: processedData.idioma,
          preview_url_presente: !!processedData.preview_url,
          preview_url_length: processedData.preview_url.length,
          author: processedData.author,
          popularity: processedData.popularity,
          samples_count: processedData.samples.length
        });
        console.groupEnd();

        const normalizedData = this.normalizeVoiceData(processedData);

        console.log('✅ FALLBACK CONCLUÍDO COM SUCESSO:', {
          voice_id: normalizedData.voice_id,
          nome_voz: normalizedData.nome_voz,
          tem_preview_url: !!normalizedData.preview_url,
          duracao_total: `${Date.now() - startTime}ms`
        });

        return normalizedData;
      }

      let responseBody;
      try {
        responseBody = await response.text();
        console.log('📄 Corpo da resposta (texto):', {
          length: responseBody.length,
          preview: responseBody.substring(0, 200) + (responseBody.length > 200 ? '...' : ''),
          isJson: responseBody.startsWith('{') || responseBody.startsWith('[')
        });
      } catch (e) {
        console.error('❌ Erro ao ler corpo da resposta:', e);
        throw new Error('Não foi possível ler a resposta da Edge Function');
      }

      let result;
      try {
        result = JSON.parse(responseBody);
        console.log('📦 DADOS PARSEADOS DA EDGE FUNCTION:', {
          hasSuccess: 'success' in result,
          hasData: 'data' in result,
          hasError: 'error' in result,
          success: result.success,
          error: result.error,
          dataKeys: result.data ? Object.keys(result.data) : [],
          resultKeys: Object.keys(result)
        });
      } catch (e) {
        console.error('❌ Erro ao parsear JSON da resposta:', e);
        throw new Error(`Resposta inválida da Edge Function: ${responseBody}`);
      }

      if (!result.success || !result.data) {
        console.error('❌ Edge Function retornou erro:', {
          success: result.success,
          error: result.error,
          data: result.data
        });
        throw new Error(result.error || 'Erro desconhecido da Edge Function');
      }

      const voiceData = result.data;

      console.group('📦 DADOS OBTIDOS VIA EDGE FUNCTION');
      console.log('Estrutura dos dados:', {
        voice_id: voiceData.voice_id,
        nome_voz: voiceData.nome_voz,
        plataforma: voiceData.plataforma,
        preview_url_presente: !!voiceData.preview_url,
        preview_url_length: voiceData.preview_url?.length || 0,
        temSamples: !!voiceData.samples,
        quantidadeSamples: voiceData.samples?.length || 0,
        temRawData: !!voiceData.raw_data,
        rawDataSamples: voiceData.raw_data?.samples?.length || 0,
        todasAsChaves: Object.keys(voiceData)
      });
      console.groupEnd();

      // Se não tiver preview_url, tentar extrair do raw_data
      if (!voiceData.preview_url && voiceData.raw_data?.samples?.[0]?.audio) {
        const extractedUrl = voiceData.raw_data.samples[0].audio;
        voiceData.preview_url = extractedUrl;
        console.log('🔄 Preview URL extraído do raw_data:', {
          url: extractedUrl,
          fonte: 'raw_data.samples[0].audio'
        });
      }

      const normalizedData = this.normalizeVoiceData(voiceData);

      console.group('✅ SUCESSO VIA EDGE FUNCTION');
      console.log('Dados normalizados:', {
        voice_id: normalizedData.voice_id,
        nome_voz: normalizedData.nome_voz,
        plataforma: normalizedData.plataforma,
        preview_url_presente: !!normalizedData.preview_url,
        preview_url_length: normalizedData.preview_url?.length || 0,
        duracao_total: `${Date.now() - startTime}ms`
      });
      console.groupEnd();

      console.groupEnd(); // Fecha o grupo principal
      return normalizedData;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`🚨 ERRO FINAL em fetchVoiceDetails:`, {
        voice_id: voiceId,
        error: error.message,
        errorType: error.name,
        stack: error.stack,
        duracao_ate_erro: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      console.groupEnd(); // Garante que o grupo seja fechado mesmo em erro
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
    const normalizeId = `normalize-${Date.now()}`;
    const logPrefix = `🔧 FishAudio.normalize[${normalizeId}]`;

    console.group(`${logPrefix}: NORMALIZANDO DADOS`);

    // Priorizar audio dos samples se disponível, senão usar preview_url direto
    // IMPORTANTE: URLs Fish Audio são temporárias com auth AWS S3 - preservar completas
    let extracted_preview_url = '';
    let url_source = 'nenhuma';

    console.log('📥 Dados de entrada:', {
      keys: Object.keys(rawData),
      voice_id: rawData.voice_id,
      _id: rawData._id,
      title: rawData.title,
      nome_voz: rawData.nome_voz,
      preview_url: rawData.preview_url,
      samples_length: rawData.samples?.length || 0,
      raw_data_samples_length: rawData.raw_data?.samples?.length || 0
    });

    // Primeira prioridade: samples[0].audio (mais comum e atual)
    if (rawData.samples && rawData.samples.length > 0 && rawData.samples[0].audio) {
      extracted_preview_url = rawData.samples[0].audio;
      url_source = 'samples[0].audio';
    }
    // Segunda prioridade: preview_url direto
    else if (rawData.preview_url) {
      extracted_preview_url = rawData.preview_url;
      url_source = 'preview_url';
    }
    // Terceira prioridade: raw_data.samples (fallback)
    else if (rawData.raw_data?.samples?.[0]?.audio) {
      extracted_preview_url = rawData.raw_data.samples[0].audio;
      url_source = 'raw_data.samples[0].audio';
    } else {
      console.warn('⚠️ Fish Audio: Nenhuma URL de áudio encontrada nos dados da voz');
    }

    console.log('🔗 EXTRAÇÃO DE URL:', {
      fonte: url_source,
      url_encontrada: !!extracted_preview_url,
      url_length: extracted_preview_url.length,
      url_valida: extracted_preview_url.startsWith('https://'),
      parametros_aws: {
        tem_x_amz: extracted_preview_url.includes('X-Amz-'),
        tem_signature: extracted_preview_url.includes('X-Amz-Signature'),
        tem_expires: extracted_preview_url.includes('X-Amz-Expires')
      },
      url_preview: extracted_preview_url ? `${extracted_preview_url.substring(0, 80)}...` : 'VAZIA'
    });

    // Construir objeto normalizado
    const normalized = {
      voice_id: rawData.voice_id || rawData._id,
      nome_voz: rawData.nome_voz || rawData.title,
      plataforma: 'Fish-Audio' as const,
      idioma: rawData.idioma || (rawData.languages ? rawData.languages.join(', ') : 'Não especificado'),
      genero: rawData.genero || 'Não especificado',
      preview_url: extracted_preview_url,
      description: rawData.description || '',
      // Campos específicos do Fish Audio
      author: rawData.author || rawData.author?.nickname || 'Desconhecido',
      popularity: rawData.popularity || rawData.like_count || 0,
      samples: rawData.samples || [],
      raw_data: rawData
    };

    console.log('✅ DADOS NORMALIZADOS:', {
      voice_id: normalized.voice_id,
      nome_voz: normalized.nome_voz,
      plataforma: normalized.plataforma,
      idioma: normalized.idioma,
      preview_url_presente: !!normalized.preview_url,
      preview_url_length: normalized.preview_url.length,
      author: normalized.author,
      popularity: normalized.popularity,
      samples_count: normalized.samples.length,
      url_source_used: url_source
    });

    // Validações finais
    if (!normalized.voice_id) {
      console.warn('⚠️ ATENÇÃO: voice_id não encontrado nos dados!');
    }

    if (!normalized.preview_url) {
      console.warn('⚠️ ATENÇÃO: preview_url não extraída - áudio não será reproduzível!');
    }

    console.groupEnd();
    return normalized;
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
    const audioId = `fish-audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const logPrefix = `🐟 FishAudio[${audioId}]`;

    console.group(`${logPrefix}: CONFIGURANDO ELEMENTO DE ÁUDIO`);

    // Configurar CORS para Fish Audio (muitas vezes necessário para URLs de CDN)
    audio.crossOrigin = 'anonymous';

    // Configurar preload para melhor performance
    audio.preload = 'metadata';

    // Configurar volume inicial
    audio.volume = 0.8;

    console.log('⚙️ Configurações iniciais:', {
      crossOrigin: audio.crossOrigin,
      preload: audio.preload,
      volume: audio.volume,
      muted: audio.muted,
      autoplay: audio.autoplay
    });

    // Log detalhado da URL
    console.group('🔗 ANÁLISE DA URL');
    console.log('URL de áudio:', {
      url: audio.src,
      urlLength: audio.src.length,
      urlValida: audio.src.startsWith('https://'),
      dominios: {
        cloudflare: audio.src.includes('cloudflarestorage.com'),
        amazonaws: audio.src.includes('amazonaws.com'),
        fishAudio: audio.src.includes('fish.audio')
      },
      parametrosAuth: {
        temXAmz: audio.src.includes('X-Amz-'),
        temSignature: audio.src.includes('X-Amz-Signature'),
        temExpires: audio.src.includes('X-Amz-Expires'),
        temCredential: audio.src.includes('X-Amz-Credential'),
        temAlgorithm: audio.src.includes('X-Amz-Algorithm')
      },
      urlPreview: audio.src ? `${audio.src.substring(0, 100)}...` : 'VAZIA'
    });
    console.groupEnd();

    // Event listeners com logs detalhados
    audio.addEventListener('loadstart', () => {
      console.log(`${logPrefix}: 📥 LOADSTART - Iniciando carregamento`, {
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('loadedmetadata', () => {
      console.log(`${logPrefix}: 📊 LOADEDMETADATA - Metadados carregados`, {
        duration: audio.duration,
        buffered: audio.buffered.length > 0 ? `${audio.buffered.end(0)}s` : '0s',
        networkState: audio.networkState,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('loadeddata', () => {
      console.log(`${logPrefix}: 💾 LOADEDDATA - Dados carregados`, {
        readyState: audio.readyState,
        networkState: audio.networkState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('canplay', () => {
      console.log(`${logPrefix}: ▶️ CANPLAY - Áudio pronto para reprodução`, {
        duration: audio.duration,
        readyState: audio.readyState,
        networkState: audio.networkState,
        buffered: audio.buffered.length > 0 ? `${audio.buffered.end(0)}s` : '0s',
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('canplaythrough', () => {
      console.log(`${logPrefix}: ✅ CANPLAYTHROUGH - Pode tocar sem interrupção`, {
        duration: audio.duration,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('play', () => {
      console.log(`${logPrefix}: ▶️ PLAY - Reprodução iniciada`, {
        currentTime: audio.currentTime,
        duration: audio.duration,
        paused: audio.paused,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('pause', () => {
      console.log(`${logPrefix}: ⏸️ PAUSE - Reprodução pausada`, {
        currentTime: audio.currentTime,
        duration: audio.duration,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('ended', () => {
      console.log(`${logPrefix}: ⏹️ ENDED - Reprodução finalizada`, {
        currentTime: audio.currentTime,
        duration: audio.duration,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('progress', () => {
      if (audio.buffered.length > 0) {
        console.log(`${logPrefix}: 📈 PROGRESS - Carregando`, {
          bufferedEnd: `${audio.buffered.end(0)}s`,
          duration: audio.duration,
          percentCarregado: audio.duration ? `${(audio.buffered.end(0) / audio.duration * 100).toFixed(1)}%` : '0%',
          networkState: audio.networkState
        });
      }
    });

    audio.addEventListener('stalled', () => {
      console.warn(`${logPrefix}: ⚠️ STALLED - Carregamento travou`, {
        networkState: audio.networkState,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('suspend', () => {
      console.log(`${logPrefix}: ⏸️ SUSPEND - Carregamento suspenso`, {
        networkState: audio.networkState,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('waiting', () => {
      console.log(`${logPrefix}: ⏳ WAITING - Aguardando dados`, {
        networkState: audio.networkState,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
    });

    audio.addEventListener('error', (e) => {
      const errorInfo = {
        event: e,
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
        errorCodes: {
          1: 'MEDIA_ERR_ABORTED - Download abortado',
          2: 'MEDIA_ERR_NETWORK - Erro de rede',
          3: 'MEDIA_ERR_DECODE - Erro de decodificação',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Formato não suportado'
        },
        timestamp: new Date().toISOString()
      };

      console.error(`${logPrefix}: 🚨 ERROR - Erro no áudio:`, errorInfo);

      // Diagnósticos adicionais baseados no código do erro
      if (audio.error?.code === 2) {
        console.error(`${logPrefix}: 🌐 DIAGNÓSTICO DE ERRO DE REDE:`, {
          urlValida: audio.src.startsWith('https://'),
          corsProblema: 'Possível problema de CORS',
          urlTemporaria: 'URLs Fish Audio expiram rapidamente',
          sugestao: 'Buscar nova URL da API'
        });
      } else if (audio.error?.code === 4) {
        console.error(`${logPrefix}: 📄 DIAGNÓSTICO DE FORMATO:`, {
          tipoArquivo: 'Verificar se é um arquivo de áudio válido',
          formatoSuportado: 'Browser pode não suportar o formato',
          sugestao: 'Verificar Content-Type da resposta'
        });
      }
    });

    console.log(`${logPrefix}: ✅ Event listeners configurados`);
    console.groupEnd();
  }

}