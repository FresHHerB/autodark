// YouTube Data API v3 Service
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  publishedAt: string;
  description: string;
  channelId: string;
}

export interface YouTubeChannel {
  id: string;
  name: string;
  description: string;
  subscriberCount: string;
  videoCount: number;
  uploadsPlaylistId: string;
}

class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!this.apiKey) {
      throw new Error('YouTube API key is required. Please set VITE_YOUTUBE_API_KEY in your .env file');
    }
  }

  // Extract channel ID from various YouTube URL formats
  private extractChannelId(url: string): string | null {
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_.-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Extract video ID from various YouTube video URL formats
  private extractVideoId(url: string): string | null {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Get channel information by URL or handle
  async getChannelInfo(channelUrl: string): Promise<YouTubeChannel> {
    try {
      let channelIdentifier = this.extractChannelId(channelUrl);
      let isHandle = channelUrl.includes('/@');
      
      // If we couldn't extract channel ID, try to extract video ID and get channel from video
      if (!channelIdentifier) {
        const videoId = this.extractVideoId(channelUrl);
        if (videoId) {
          // Get video details to extract channel ID
          const videoDetails = await this.getVideoDetails([videoId]);
          if (videoDetails.length > 0) {
            channelIdentifier = videoDetails[0].channelId;
            isHandle = false; // Video-derived channel IDs are always channel IDs, not handles
          }
        }
        
        if (!channelIdentifier) {
          throw new Error('Invalid YouTube channel URL format');
        }
      }

      let response;
      let data;

      if (isHandle) {
        // For @handle format, use forHandle parameter (without the @ symbol)
        response = await fetch(
          `${this.baseUrl}/channels?part=snippet,contentDetails,statistics&forHandle=${channelIdentifier}&key=${this.apiKey}`
        );
        data = await response.json();
        
        // Log the response for debugging
        console.log('Handle API Response:', data);
      } else {
        // For channel IDs, use id parameter
        response = await fetch(
          `${this.baseUrl}/channels?part=snippet,contentDetails,statistics&id=${channelIdentifier}&key=${this.apiKey}`
        );
        data = await response.json();
      }

      // If no results and it's not a handle, try forUsername (legacy)
      if (!data.items || data.items.length === 0) {
        if (!isHandle) {
          // Try searching by username (legacy)
          response = await fetch(
            `${this.baseUrl}/channels?part=snippet,contentDetails,statistics&forUsername=${channelIdentifier}&key=${this.apiKey}`
          );
          data = await response.json();
        }
        else {
          // If handle search failed, log the error details
          console.error('Handle search failed:', data);
          if (data.error) {
            throw new Error(`YouTube API Error: ${data.error.message}`);
          }
        }
      }

      if (!response.ok || !data.items || data.items.length === 0) {
        const errorMessage = data?.error?.message || 'Canal não encontrado ou URL inválida';
        throw new Error(errorMessage);
      }

      const channel = data.items[0];
      
      return {
        id: channel.id,
        name: channel.snippet.title,
        description: channel.snippet.description,
        subscriberCount: this.formatCount(channel.statistics.subscriberCount),
        videoCount: parseInt(channel.statistics.videoCount),
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads
      };
    } catch (error) {
      console.error('Error fetching channel info:', error);
      throw error;
    }
  }

  // Get videos from channel's uploads playlist
  async getChannelVideos(
    uploadsPlaylistId: string, 
    maxResults: number = 50,
    pageToken?: string
  ): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
    try {
      const params = new URLSearchParams({
        part: 'contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(maxResults, 50).toString(),
        key: this.apiKey
      });

      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      const response = await fetch(
        `${this.baseUrl}/playlistItems?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Erro ao buscar vídeos do canal: ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return { videos: [] };
      }

      // Extract video IDs
      const videoIds = data.items.map((item: any) => item.contentDetails.videoId);
      
      // Get detailed video information
      const videos = await this.getVideoDetails(videoIds);

      return {
        videos,
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  }

  // Get detailed information for specific videos
  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
    try {
      const idsString = videoIds.join(',');
      
      const response = await fetch(
        `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${idsString}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes dos vídeos');
      }

      const data = await response.json();

      return data.items.map((video: any) => ({
        id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium?.url || 
                  video.snippet.thumbnails.default?.url ||
                  `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        duration: this.formatDuration(video.contentDetails.duration),
        views: this.formatCount(video.statistics.viewCount),
        publishedAt: video.snippet.publishedAt,
        description: video.snippet.description,
        channelId: video.snippet.channelId
      }));
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }

  // Format ISO 8601 duration to readable format (PT4M13S -> 4:13)
  private formatDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Format large numbers (1234567 -> 1.2M)
  private formatCount(count: string | number): string {
    const num = typeof count === 'string' ? parseInt(count) : count;
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Search channels by query
  async searchChannels(query: string, maxResults: number = 10): Promise<YouTubeChannel[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar canais');
      }

      const data = await response.json();

      // Get detailed channel information
      const channelIds = data.items.map((item: any) => item.snippet.channelId);
      const channelsResponse = await fetch(
        `${this.baseUrl}/channels?part=snippet,contentDetails,statistics&id=${channelIds.join(',')}&key=${this.apiKey}`
      );

      const channelsData = await channelsResponse.json();

      return channelsData.items.map((channel: any) => ({
        id: channel.id,
        name: channel.snippet.title,
        description: channel.snippet.description,
        subscriberCount: this.formatCount(channel.statistics.subscriberCount),
        videoCount: parseInt(channel.statistics.videoCount),
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads
      }));
    } catch (error) {
      console.error('Error searching channels:', error);
      throw error;
    }
  }
}

export const youtubeService = new YouTubeService();