// API Configuration Service
class ApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://n8n-n8n.gpqg9h.easypanel.host';
  }

  // Get endpoint URLs from environment
  getEndpoint(key: string): string {
    const endpoints = {
      youtube: import.meta.env.VITE_YOUTUBE_API_ENDPOINT,
      aiGeneration: import.meta.env.VITE_AI_GENERATION_ENDPOINT,
      videoProcessing: import.meta.env.VITE_VIDEO_PROCESSING_ENDPOINT,
      upload: import.meta.env.VITE_UPLOAD_ENDPOINT,
      models: import.meta.env.VITE_AI_MODELS_ENDPOINT,
    };
    
    return `${this.baseUrl}${endpoints[key as keyof typeof endpoints] || ''}`;
  }

  // Get webhook URLs from environment
  getWebhook(key: string): string {
    const webhooks = {
      cloneChannel: import.meta.env.VITE_WEBHOOK_CLONE_CHANNEL || '/webhook/treinarCanal',
      generateTitle: import.meta.env.VITE_WEBHOOK_GENERATE_TITLE,
      generateScript: import.meta.env.VITE_WEBHOOK_GENERATE_SCRIPT,
      processVideo: import.meta.env.VITE_WEBHOOK_PROCESS_VIDEO,
      publishVideo: import.meta.env.VITE_WEBHOOK_PUBLISH_VIDEO,
    };
    
    return `${this.baseUrl}${webhooks[key as keyof typeof webhooks] || ''}`;
  }

  // Generic API call method
  async call(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    };

    try {
      console.log('Making API call to:', url);
      console.log('Request options:', { ...defaultOptions, ...options });
      
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log('Response body:', responseText);
      
      // Try to parse as JSON, fallback to text if it fails
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        return responseText;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o serviço está rodando e se há problemas de CORS.');
      }
      throw error;
    }
  }

  // YouTube API methods
  async searchChannel(channelUrl: string) {
    return this.call(this.getEndpoint('youtube'), {
      method: 'POST',
      body: JSON.stringify({ channelUrl }),
    });
  }

  // AI Generation methods
  async generateTitle(idea: string, prompt: string, model: string = 'sonnet-4') {
    return this.call(this.getWebhook('generateTitle'), {
      method: 'POST',
      body: JSON.stringify({ idea, prompt, model }),
    });
  }

  async generateScript(idea: string, title: string, prompt: string, model: string = 'sonnet-4') {
    return this.call(this.getWebhook('generateScript'), {
      method: 'POST',
      body: JSON.stringify({ idea, title, prompt, model }),
    });
  }

  // Video processing methods
  async cloneChannel(channelUrl: string, selectedVideos: Array<{id: string, title: string}>, channelName: string, action: 'coleta_titulo' | 'transcrever') {
    // Convert video data to the required format
    const videos = selectedVideos.map(video => ({
      title: video.title,
      link: `https://www.youtube.com/watch?v=${video.id}`
    }));
    
    return this.call(this.getWebhook('cloneChannel'), {
      method: 'POST',
      body: JSON.stringify({ 
        channelUrl, 
        videos,
        channelName,
        selectedVideoCount: videos.length,
        action
      }),
    });
  }

  async processVideo(videoId: string) {
    return this.call(this.getWebhook('processVideo'), {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
  }

  async publishVideo(videoId: string, scheduleDate?: string) {
    return this.call(this.getWebhook('publishVideo'), {
      method: 'POST',
      body: JSON.stringify({ videoId, scheduleDate }),
    });
  }
}

export const apiService = new ApiService();