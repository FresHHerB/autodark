import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Square, Volume2 } from 'lucide-react';
import { VoiceData } from '../services/audio';
import { audioService } from '../services/audio';

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

  console.log('🎨 VoiceSelector renderizado:', { selectedVoiceId, label });

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

    console.log('🎵 Reproduzindo preview:', voice.nome_voz, `(${voice.plataforma})`);

    console.log('🎵 VoiceSelector: Iniciando preview de voz', {
      voice_id: voice.voice_id,
      nome_voz: voice.nome_voz,
      plataforma: voice.plataforma,
      preview_url: voice.preview_url,
      temPreviewUrl: !!voice.preview_url,
      jaEstaTocando: playingVoiceId === voice.voice_id
    });
    
    // Se já está tocando esta voz, parar
    if (playingVoiceId === voice.voice_id) {
      console.log('🎵 VoiceSelector: Parando áudio atual');
      audioService.stopCurrentAudio();
      setPlayingVoiceId(null);
      return;
    }

    try {
      console.log('🎵 VoiceSelector: Chamando audioService.playVoicePreview...');
      const audio = await audioService.playVoicePreview(voice);
      
      console.log('🎵 VoiceSelector: Resultado do playVoicePreview:', {
        audioElement: !!audio,
        src: audio?.src,
        readyState: audio?.readyState
      });
      
      if (audio) {
        setPlayingVoiceId(voice.voice_id);

        // Limpar estado quando o áudio terminar
        audio.addEventListener('ended', () => {
          console.log('🎵 VoiceSelector: Áudio finalizado');
          setPlayingVoiceId(null);
        });
        
        audio.addEventListener('error', () => {
          console.log('🎵 VoiceSelector: Erro no áudio');
          setPlayingVoiceId(null);
        });
      } else {
        console.warn('🎵 VoiceSelector: Não foi possível criar o elemento de áudio', {
          voice: voice.nome_voz,
          plataforma: voice.plataforma
        });
      }
    } catch (error) {
      console.error('🎵 VoiceSelector: Erro ao reproduzir preview:', {
        voice: voice.nome_voz,
        plataforma: voice.plataforma,
        error: error.message,
        stack: error.stack
      });
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

  console.log('🔍 VoiceSelector RENDER DEBUG:', {
    voices_total: voices.length,
    selectedVoiceId,
    selectedVoice: selectedVoice ? {
      id: selectedVoice.id,
      nome_voz: selectedVoice.nome_voz,
      plataforma: selectedVoice.plataforma,
      preview_url: selectedVoice.preview_url
    } : null,
    temSelectedVoice: !!selectedVoice,
    podeTocarPreview: selectedVoice ? (selectedVoice.preview_url || selectedVoice.plataforma === 'Fish-Audio') : false,
    primeiras_3_voices: voices.slice(0, 3).map(v => ({ id: v.id, nome: v.nome_voz, plataforma: v.plataforma }))
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
          {console.log('🎵 VoiceSelector: Renderizando preview section para:', {
            voice_id: selectedVoice.voice_id,
            nome_voz: selectedVoice.nome_voz,
            plataforma: selectedVoice.plataforma,
            preview_url: selectedVoice.preview_url,
            temPreviewUrl: !!selectedVoice.preview_url
          })}
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