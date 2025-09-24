import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Square, Volume2 } from 'lucide-react';
import { VoiceData, audioService } from '@features/content-generation/services/audio';

interface VoiceSelectorProps {
  selectedVoiceId?: number;
  onVoiceSelect: (voiceId: number) => void;
  label?: string;
  className?: string;
}

export default function VoiceSelector({
  selectedVoiceId,
  onVoiceSelect,
  label = "Selecionar Voz",
  className = ""
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<VoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);


  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const voicesData = await audioService.getAllVoicesFromDatabase();
      setVoices(voicesData);
    } catch (err) {
      console.error('Erro ao carregar vozes:', err);
      setError('Erro ao carregar vozes');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = async (voice: VoiceData, event: React.MouseEvent) => {
    event.stopPropagation();

    
    // Se já está tocando esta voz, parar
    if (playingVoiceId === voice.voice_id) {
      audioService.stopCurrentAudio();
      setPlayingVoiceId(null);
      return;
    }

    try {
      const audio = await audioService.playVoicePreview(voice);
      
      if (audio) {
        setPlayingVoiceId(voice.voice_id);

        // Limpar estado quando o áudio terminar
        audio.addEventListener('ended', () => {
          setPlayingVoiceId(null);
        });

        audio.addEventListener('error', () => {
          setPlayingVoiceId(null);
        });
      }
    } catch (error) {
      console.error('Erro ao reproduzir preview:', error);
      // Mostrar mensagem de erro para o usuário
      alert(`Erro ao reproduzir preview da voz ${voice.nome_voz}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Encontrar voz selecionada (convertendo ID do banco para voice_id)
  const selectedVoice = voices.find(v => {
    // Se temos um ID numérico do banco, precisamos encontrar a voz correspondente
    // Por enquanto, vamos usar o primeiro match por nome ou usar o voice_id diretamente
    return v.id === selectedVoiceId;
  });


  const groupedVoices = voices.reduce((acc, voice) => {
    if (!acc[voice.plataforma]) {
      acc[voice.plataforma] = [];
    }
    acc[voice.plataforma].push(voice);
    return acc;
  }, {} as Record<string, VoiceData[]>);

  if (loading) {
    return (
      <div className={className}>
        <label className="block text-gray-400 text-sm mb-2">{label}</label>
        <div className="bg-gray-800 border border-gray-700 px-4 py-3 text-gray-400">
          Carregando vozes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <label className="block text-gray-400 text-sm mb-2">{label}</label>
        <div className="bg-red-900/20 border border-red-500/30 px-4 py-3 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-gray-400 text-sm mb-2">{label}</label>
      <div className="relative">
        <select
          value={selectedVoiceId || ''}
          onChange={(e) => {
            const voiceId = parseInt(e.target.value);
            if (voiceId) {
              onVoiceSelect(voiceId);
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 focus:outline-none focus:border-gray-600 appearance-none"
        >
          <option value="">Selecione uma voz...</option>
          {Object.entries(groupedVoices).map(([platform, platformVoices]) => (
            <optgroup key={platform} label={platform}>
              {platformVoices.map((voice) => (
                <option key={voice.voice_id} value={voice.id}>
                  {voice.nome_voz} - {voice.idioma} ({voice.genero || 'N/A'})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
      </div>

      {/* Voice Preview Section */}
      {selectedVoice && (
        <div className="mt-3 bg-gray-800 border border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-white text-sm font-medium mb-1">
                {selectedVoice.nome_voz}
              </div>
              <div className="text-gray-400 text-xs">
                {selectedVoice.plataforma} • {selectedVoice.idioma} • {selectedVoice.genero || 'N/A'}
              </div>
            </div>
            
            {/* Preview Button */}
            {(selectedVoice.preview_url || selectedVoice.plataforma === 'Fish-Audio') ? (
              <button
                onClick={(e) => handlePlayPreview(selectedVoice, e)}
                className={`
                  p-2 rounded transition-colors flex items-center gap-1
                  ${playingVoiceId === selectedVoice.voice_id
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                `}
                title={playingVoiceId === selectedVoice.voice_id ? 'Parar preview' : 'Reproduzir preview'}
              >
                {playingVoiceId === selectedVoice.voice_id ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="p-2 bg-gray-700 rounded text-gray-400 flex items-center gap-1">
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">Sem preview</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}