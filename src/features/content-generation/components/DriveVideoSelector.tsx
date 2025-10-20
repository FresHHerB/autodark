import React, { useState, useEffect } from 'react';
import { Loader2, CheckSquare, Square, AlertCircle } from 'lucide-react';
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

interface DriveVideoSelectorProps {
  driveUrl: string;
  onSelectionChange: (selectedVideoUrls: string[]) => void;
  initialSelectedUrls?: string[];
}

// ============================================
// COMPONENT
// ============================================

export const DriveVideoSelector: React.FC<DriveVideoSelectorProps> = ({
  driveUrl,
  onSelectionChange,
  initialSelectedUrls = []
}) => {
  const [videos, setVideos] = useState<DriveVideo[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');

  // ============================================
  // LOAD API KEY
  // ============================================

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'GDrive')
        .single();

      if (error) throw error;

      if (data?.api_key) {
        setApiKey(data.api_key);
      } else {
        setError('API Key do Google Drive não configurada');
      }
    } catch (err) {
      console.error('Erro ao carregar API Key:', err);
      setError('Erro ao carregar API Key do Google Drive');
    }
  };

  // ============================================
  // LOAD VIDEOS WHEN DRIVE URL OR API KEY CHANGES
  // ============================================

  useEffect(() => {
    if (driveUrl && apiKey) {
      loadDriveVideos();
    }
  }, [driveUrl, apiKey]);

  // ============================================
  // EXTRACT FOLDER ID
  // ============================================

  const extractFolderId = (url: string): string | null => {
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // ============================================
  // LOAD VIDEOS FROM DRIVE
  // ============================================

  const loadDriveVideos = async () => {
    setLoading(true);
    setError('');

    try {
      const folderId = extractFolderId(driveUrl);

      if (!folderId) {
        throw new Error('URL do Google Drive inválida');
      }

      const query = `'${folderId}' in parents and mimeType contains 'video/'`;
      const fields = 'files(id,name,thumbnailLink,size,mimeType,videoMediaMetadata,webViewLink)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=${fields}&pageSize=1000`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Erro ${response.status}`);
      }

      const data = await response.json();

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
      } else {
        setError('Nenhum vídeo encontrado nesta pasta');
      }
    } catch (err: any) {
      console.error('Erro ao carregar vídeos:', err);
      setError(err.message || 'Erro ao carregar vídeos do Google Drive');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE VIDEO SELECTION
  // ============================================

  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideoIds);

    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }

    setSelectedVideoIds(newSelection);

    // Generate URLs for selected videos
    const selectedUrls = Array.from(newSelection).map(id => {
      return `https://drive.google.com/file/d/${id}/view`;
    });

    onSelectionChange(selectedUrls);
  };

  // ============================================
  // SELECT/DESELECT ALL
  // ============================================

  const selectAll = () => {
    const allIds = new Set(videos.map(v => v.id));
    setSelectedVideoIds(allIds);

    const selectedUrls = videos.map(v => `https://drive.google.com/file/d/${v.id}/view`);
    onSelectionChange(selectedUrls);
  };

  const deselectAll = () => {
    setSelectedVideoIds(new Set());
    onSelectionChange([]);
  };

  // ============================================
  // FORMAT HELPERS
  // ============================================

  const formatFileSize = (bytes?: string): string => {
    if (!bytes) return 'N/A';
    const size = parseInt(bytes);
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ============================================
  // RENDER
  // ============================================

  if (!driveUrl) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        Configure a URL do Google Drive nas configurações do canal
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-4" />
        <p className="text-gray-400">Carregando vídeos do banco...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-medium">Erro ao carregar vídeos</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        Nenhum vídeo encontrado no banco do canal
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-white">
            Banco de Vídeos ({videos.length})
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {selectedVideoIds.size} vídeo(s) selecionado(s)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
          >
            Selecionar Todos
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            Limpar Seleção
          </button>
        </div>
      </div>

      {/* Video Grid - 10 per row, 4 rows visible with scroll */}
      <div
        className="grid grid-cols-10 gap-2 overflow-y-auto pr-2"
        style={{ maxHeight: '400px' }} // 4 rows approximately
      >
        {videos.map((video) => {
          const isSelected = selectedVideoIds.has(video.id);

          return (
            <div
              key={video.id}
              onClick={() => toggleVideoSelection(video.id)}
              className={`
                relative aspect-video bg-gray-700 rounded overflow-hidden cursor-pointer
                transition-all hover:ring-2 hover:ring-purple-500
                ${isSelected ? 'ring-2 ring-purple-500' : ''}
              `}
              title={video.name}
            >
              {/* Thumbnail */}
              {video.thumbnailLink ? (
                <img
                  src={video.thumbnailLink}
                  alt={video.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="30" text-anchor="middle" dy=".3em" fill="%239CA3AF"%3E📹%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  📹
                </div>
              )}

              {/* Checkbox Overlay */}
              <div className={`
                absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center
                ${isSelected ? 'bg-purple-600' : 'bg-black/50 hover:bg-black/70'}
                transition-colors
              `}>
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-white" />
                ) : (
                  <Square className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Duration Badge */}
              {video.duration && (
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                  {formatDuration(video.duration)}
                </div>
              )}

              {/* Selected Overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-purple-600/20 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          💡 Dica: Clique nos vídeos para selecionar/desselecionar
        </p>
      </div>
    </div>
  );
};
