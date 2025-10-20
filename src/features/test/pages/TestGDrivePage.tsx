import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@features/dashboard/components';
import { Loader2, Play, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@shared/lib';

// ============================================
// INTERFACES
// ============================================

interface DriveVideo {
  id: string;
  name: string;
  thumbnailLink?: string;
  size?: string;
  duration?: number;
  mimeType: string;
  webViewLink?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TestGDrivePage() {
  const [folderUrl, setFolderUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingApiKey, setLoadingApiKey] = useState<boolean>(true);
  const [videos, setVideos] = useState<DriveVideo[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // ============================================
  // LOAD API KEY FROM SUPABASE
  // ============================================

  useEffect(() => {
    loadGDriveApiKey();
  }, []);

  const loadGDriveApiKey = async () => {
    try {
      setLoadingApiKey(true);
      const { data, error } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'GDrive')
        .single();

      if (error) throw error;

      if (data?.api_key) {
        setApiKey(data.api_key);
        console.log('✅ Google Drive API Key carregada');
      } else {
        setError('API Key do Google Drive não encontrada na tabela apis');
      }
    } catch (err) {
      console.error('Erro ao carregar API Key:', err);
      setError('Erro ao carregar API Key do Google Drive');
    } finally {
      setLoadingApiKey(false);
    }
  };

  // ============================================
  // EXTRACT FOLDER ID FROM URL
  // ============================================

  const extractFolderId = (url: string): string | null => {
    // URL format: https://drive.google.com/drive/folders/FOLDER_ID
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // ============================================
  // FETCH VIDEOS FROM GOOGLE DRIVE
  // ============================================

  const fetchDriveVideos = async () => {
    if (!folderUrl.trim()) {
      setError('Por favor, cole a URL da pasta do Google Drive');
      return;
    }

    if (!apiKey) {
      setError('API Key do Google Drive não está configurada');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    setVideos([]);

    try {
      const folderId = extractFolderId(folderUrl);

      if (!folderId) {
        throw new Error('URL inválida. Use o formato: https://drive.google.com/drive/folders/...');
      }

      console.log('📂 Folder ID extraído:', folderId);

      // Google Drive API v3 - List files
      const query = `'${folderId}' in parents and mimeType contains 'video/'`;
      const fields = 'files(id,name,thumbnailLink,size,mimeType,videoMediaMetadata,webViewLink)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=${fields}&pageSize=100`;

      console.log('🔗 Chamando Google Drive API...');

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro da API:', errorData);
        throw new Error(errorData.error?.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('📦 Resposta da API:', data);

      if (data.files && data.files.length > 0) {
        const videoList: DriveVideo[] = data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          thumbnailLink: file.thumbnailLink,
          size: file.size,
          duration: file.videoMediaMetadata?.durationMillis,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink
        }));

        setVideos(videoList);
        setSuccess(`${videoList.length} vídeo(s) encontrado(s)!`);
        console.log('✅ Vídeos carregados:', videoList);
      } else {
        setError('Nenhum vídeo encontrado nesta pasta. Certifique-se de que a pasta está pública e contém vídeos.');
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar vídeos:', err);
      setError(err.message || 'Erro ao buscar vídeos do Google Drive');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FORMAT FILE SIZE
  // ============================================

  const formatFileSize = (bytes?: string): string => {
    if (!bytes) return 'N/A';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // ============================================
  // FORMAT DURATION
  // ============================================

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Teste - Google Drive API</h1>
          <p className="text-gray-400">Teste de listagem de vídeos de pastas públicas do Google Drive</p>
        </div>

        {/* API Key Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-light text-white mb-4">Status da API Key</h2>
          {loadingApiKey ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando API Key...</span>
            </div>
          ) : apiKey ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>API Key do Google Drive carregada com sucesso</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>API Key não encontrada. Configure na tabela apis (plataforma: GDrive)</span>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-light text-white mb-4">URL da Pasta do Google Drive</h2>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Cole a URL da pasta (deve ser pública - "Anyone with the link")
            </label>
            <input
              type="text"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={fetchDriveVideos}
            disabled={loading || !apiKey || !folderUrl.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Buscando vídeos...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Buscar Vídeos
              </>
            )}
          </button>

          {/* Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-600/20 border border-red-600/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Erro</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-600/20 border border-green-600/50 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-400 font-medium">{success}</p>
            </div>
          )}
        </div>

        {/* Videos Grid */}
        {videos.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-light text-white mb-4">
              Vídeos Encontrados ({videos.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-700 relative group">
                    {video.thumbnailLink ? (
                      <img
                        src={video.thumbnailLink}
                        alt={video.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="%239CA3AF"%3E📹%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        📹
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>

                    {/* Duration badge */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-medium text-sm mb-2 line-clamp-2" title={video.name}>
                      {video.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{formatFileSize(video.size)}</span>
                      {video.webViewLink && (
                        <a
                          href={video.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Abrir
                        </a>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 truncate" title={video.id}>
                      ID: {video.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-600/10 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-blue-400 font-medium mb-2">📋 Instruções:</h3>
          <ol className="text-blue-300 text-sm space-y-2">
            <li>1. Certifique-se de que a pasta do Google Drive está pública (Anyone with the link can view)</li>
            <li>2. Cole a URL completa da pasta no campo acima</li>
            <li>3. Clique em "Buscar Vídeos" para listar os arquivos de vídeo</li>
            <li>4. A API Key é carregada automaticamente da tabela "apis" (plataforma: GDrive)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
