import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Play, Square, Music, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '@shared/lib';

// ============================================
// INTERFACES
// ============================================

export interface DriveAudio {
  id: string;
  name: string;
  size?: string;
  duration?: number;
  mimeType: string;
  webViewLink?: string;
}

interface DriveAudioSelectorProps {
  driveUrl: string;
  onSelectionChange: (selectedAudioUrl: string | null) => void;
  initialSelectedUrl?: string | null;
  onAudiosLoaded?: (audios: DriveAudio[]) => void;
  dbOffset?: number;
  onDbOffsetChange?: (dbOffset: number) => void;
}

// ============================================
// COMPONENT
// ============================================

export const DriveAudioSelector: React.FC<DriveAudioSelectorProps> = ({
  driveUrl,
  onSelectionChange,
  initialSelectedUrl = null,
  onAudiosLoaded,
  dbOffset = 30,
  onDbOffsetChange
}) => {
  const [audios, setAudios] = useState<DriveAudio[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');

  // Track if audios were already loaded for this driveUrl
  const loadedDriveUrlRef = useRef<string>('');

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

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
  // SYNC INITIAL SELECTED URL WITH SELECTED ID
  // ============================================

  useEffect(() => {
    if (audios.length > 0 && initialSelectedUrl) {
      // Extract audio ID from URL
      const match = initialSelectedUrl.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        setSelectedAudioId(match[1]);
      }
    } else if (!initialSelectedUrl) {
      setSelectedAudioId(null);
    }
  }, [initialSelectedUrl, audios]);

  // ============================================
  // LOAD AUDIOS WHEN DRIVE URL OR API KEY CHANGES
  // ============================================

  useEffect(() => {
    if (driveUrl && apiKey && loadedDriveUrlRef.current !== driveUrl) {
      loadDriveAudios();
      loadedDriveUrlRef.current = driveUrl;
    }
  }, [driveUrl, apiKey]);

  // ============================================
  // CLEANUP AUDIO ON UNMOUNT
  // ============================================

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, [currentAudio]);

  // ============================================
  // EXTRACT FOLDER ID
  // ============================================

  const extractFolderId = (url: string): string | null => {
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // ============================================
  // LOAD AUDIOS FROM DRIVE
  // ============================================

  const loadDriveAudios = async () => {
    setLoading(true);
    setError('');

    try {
      const folderId = extractFolderId(driveUrl);

      if (!folderId) {
        throw new Error('URL do Google Drive inválida');
      }

      const query = `'${folderId}' in parents and mimeType contains 'audio/'`;
      const fields = 'files(id,name,size,mimeType,webViewLink)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=${fields}&pageSize=1000`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Erro ${response.status}`);
      }

      const data = await response.json();

      if (data.files && data.files.length > 0) {
        const audioList: DriveAudio[] = data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink
        }));

        setAudios(audioList);

        // Notify parent component about loaded audios
        if (onAudiosLoaded) {
          onAudiosLoaded(audioList);
        }
      } else {
        setError('Nenhuma trilha sonora encontrada nesta pasta');
      }
    } catch (err: any) {
      console.error('Erro ao carregar trilhas:', err);
      setError(err.message || 'Erro ao carregar trilhas do Google Drive');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE AUDIO SELECTION
  // ============================================

  const selectAudio = (audioId: string) => {
    setSelectedAudioId(audioId);

    // Generate URL for selected audio
    const selectedUrl = `https://drive.google.com/file/d/${audioId}/view`;
    onSelectionChange(selectedUrl);
  };

  // ============================================
  // HANDLE AUDIO PREVIEW
  // ============================================

  const toggleAudioPreview = async (audio: DriveAudio) => {
    // If this audio is already playing, pause it
    if (playingAudioId === audio.id) {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setPlayingAudioId(null);
      setCurrentAudio(null);
      return;
    }

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }

    // Start loading
    setLoadingAudioId(audio.id);

    try {
      const audioUrl = `https://www.googleapis.com/drive/v3/files/${audio.id}?alt=media&key=${apiKey}`;
      const newAudio = new Audio(audioUrl);

      newAudio.addEventListener('canplay', () => {
        setLoadingAudioId(null);
        setPlayingAudioId(audio.id);
        setCurrentAudio(newAudio);
        newAudio.play().catch(err => {
          console.error('Erro ao reproduzir áudio:', err);
          setPlayingAudioId(null);
          setLoadingAudioId(null);
        });
      });

      newAudio.addEventListener('ended', () => {
        setPlayingAudioId(null);
        setCurrentAudio(null);
      });

      newAudio.addEventListener('error', () => {
        console.error('Erro ao carregar áudio');
        setPlayingAudioId(null);
        setLoadingAudioId(null);
        setCurrentAudio(null);
      });

      newAudio.load();
    } catch (err) {
      console.error('Erro ao iniciar preview:', err);
      setLoadingAudioId(null);
    }
  };

  // ============================================
  // CLEAR SELECTION
  // ============================================

  const clearSelection = () => {
    setSelectedAudioId(null);
    onSelectionChange(null);
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

  const formatAudioName = (fileName: string): string => {
    // Remove extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // Truncate to 20 characters if longer
    if (nameWithoutExt.length > 20) {
      return nameWithoutExt.substring(0, 20) + '...';
    }

    return nameWithoutExt;
  };

  // ============================================
  // RENDER
  // ============================================

  if (!driveUrl) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400 text-sm">
        Configure a URL da pasta de trilhas nas configurações do canal
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 mb-3" />
        <p className="text-gray-400 text-sm">Carregando trilhas sonoras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-medium text-sm">Erro ao carregar trilhas</p>
          <p className="text-red-300 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (audios.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400 text-sm">
        Nenhuma trilha sonora encontrada na pasta
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
      {/* Header - Ultra Compact */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Music className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-white">
            Trilhas ({audios.length})
          </h3>

          {/* DB Offset Input - Destacado */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-3 py-1.5 rounded-lg border border-blue-500/40 shadow-sm">
            <label className="text-xs font-semibold text-blue-300 whitespace-nowrap">
              Diferença db:
            </label>
            <input
              type="number"
              value={dbOffset}
              onChange={(e) => onDbOffsetChange?.(parseInt(e.target.value) || 30)}
              className="w-16 bg-gray-800 border-2 border-blue-500/50 text-white text-sm font-bold px-2 py-1 rounded-md focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 text-center transition-all"
              min="0"
              max="100"
            />
            <span className="text-[10px] text-blue-400 font-medium">dB</span>
          </div>
        </div>

        {selectedAudioId && (
          <button
            onClick={clearSelection}
            className="px-2 py-1 bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 text-white text-[10px] rounded-md transition-all"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Audio Grid - 6 per row with 3 full rows visible */}
      <div
        className="grid grid-cols-6 gap-3 overflow-y-auto pr-1 custom-scrollbar"
        style={{ maxHeight: '280px' }}
      >
        {audios.map((audio) => {
          const isSelected = selectedAudioId === audio.id;
          const isPlaying = playingAudioId === audio.id;
          const isLoading = loadingAudioId === audio.id;

          return (
            <div
              key={audio.id}
              className={`
                relative rounded-lg cursor-pointer overflow-hidden
                transition-all duration-200 group
                ${isSelected
                  ? 'bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500 shadow-md shadow-purple-500/30 ring-1 ring-purple-500'
                  : 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 border border-gray-700/50 hover:border-purple-500/50 hover:shadow-md hover:shadow-purple-500/20'
                }
              `}
              onClick={() => selectAudio(audio.id)}
              title={audio.name.replace(/\.[^/.]+$/, '')}
            >
              {/* Selection Indicator - Minimal */}
              <div
                className={`
                  absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center
                  transition-all duration-200
                  ${isSelected
                    ? 'border-purple-400 bg-purple-600 shadow-sm shadow-purple-500/50'
                    : 'border-gray-500/50 bg-gray-800/50'
                  }
                `}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="p-3 pt-4">
                {/* Audio Name */}
                <p className={`
                  text-[11px] font-medium truncate text-center mb-2.5 px-0.5 leading-snug
                  transition-colors duration-200
                  ${isSelected ? 'text-purple-200' : 'text-gray-300 group-hover:text-white'}
                `}>
                  {formatAudioName(audio.name)}
                </p>

                {/* Play/Pause Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAudioPreview(audio);
                  }}
                  className={`
                    w-full py-1.5 rounded-md transition-all duration-200 flex items-center justify-center
                    text-[10px] font-medium
                    ${isPlaying
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    }
                    ${isLoading ? 'opacity-50 cursor-wait' : ''}
                  `}
                  disabled={isLoading}
                  title={isPlaying ? 'Parar preview' : 'Preview da trilha'}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : isPlaying ? (
                    <Square className="w-3.5 h-3.5 text-white" fill="white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-white" fill="white" />
                  )}
                </button>
              </div>

              {/* Hover Glow Effect - Subtle */}
              {!isSelected && (
                <div className="absolute inset-0 bg-gradient-to-t from-purple-600/0 to-purple-600/0 group-hover:from-purple-600/5 transition-all duration-200 pointer-events-none rounded-lg" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info - Minimal */}
      {selectedAudioId && (
        <div className="mt-3 pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-md px-2 py-1">
            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
            <p className="text-[10px] text-green-300 truncate font-medium">
              {audios.find(a => a.id === selectedAudioId)?.name.replace(/\.[^/.]+$/, '')}
            </p>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #9333ea, #6366f1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #a855f7, #818cf8);
        }
      `}</style>
    </div>
  );
};
