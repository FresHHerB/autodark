import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Square, Volume2 } from 'lucide-react';
import { VoiceData, audioService } from '@features/content-generation/services/audio';
import { supabase } from '@shared/lib';

interface VoiceSelectorProps {
  selectedVoiceId?: number;
  onVoiceSelect: (voiceId: number) => void;
  label?: string;
  className?: string;
}

interface API {
  id: number;
  plataforma: string;
  api_key: string;
}

export default function VoiceSelector({
  selectedVoiceId,
  onVoiceSelect,
  label = "Selecionar Voz",
  className = ""
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<VoiceData[]>([]);
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoices();
    loadApis();
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

  const loadApis = async () => {
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*');

      if (error) throw error;
      setApis(data || []);
    } catch (err) {
      console.error('Erro ao carregar APIs:', err);
    }
  };

  const generateVoiceTest = async (voice: VoiceData): Promise<string> => {
    try {
      if (voice.plataforma === 'ElevenLabs') {
        const apiData = apis.find(api => api.plataforma.toLowerCase() === voice.plataforma.toLowerCase());
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        let voiceData;
        try {
          // Primeira tentativa: Edge Function
          const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-elevenlabs-voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voice_id: voice.voice_id,
              api_key: apiData.api_key
            })
          });

          if (!response.ok) {
            throw new Error(`Edge Function falhou: ${response.status}`);
          }

          const result = await response.json();
          voiceData = result.data;
        } catch (edgeFunctionError) {
          // Fallback: Chamada direta à API ElevenLabs
          const directResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}`, {
            method: 'GET',
            headers: {
              'xi-api-key': apiData.api_key,
              'Content-Type': 'application/json',
            },
          });

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Erro ElevenLabs API: ${directResponse.status} - ${errorText}`);
          }

          const rawData = await directResponse.json();

          voiceData = {
            preview_url: rawData.preview_url || '',
            raw_data: rawData
          };
        }

        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }

        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
        const apiData = apis.find(api => api.plataforma.toLowerCase() === voice.plataforma.toLowerCase());
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        let voiceData;
        try {
          // Primeira tentativa: Edge Function
          const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-fish-audio-voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voice_id: voice.voice_id,
              api_key: apiData.api_key
            })
          });

          if (!response.ok) {
            throw new Error(`Edge Function falhou: ${response.status}`);
          }

          const result = await response.json();
          voiceData = result.data;
        } catch (edgeFunctionError) {
          // Fallback: Chamada direta à API Fish-Audio
          const directResponse = await fetch(`https://api.fish.audio/model/${voice.voice_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiData.api_key}`,
              'Content-Type': 'application/json',
            },
          });

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Erro Fish-Audio API: ${directResponse.status} - ${errorText}`);
          }

          const rawData = await directResponse.json();

          voiceData = {
            preview_url: rawData.samples?.[0]?.audio || '',
            raw_data: rawData
          };
        }

        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz Fish-Audio');
        }

        return voiceData.preview_url;
      }

      if (voice.plataforma === 'Minimax') {
        throw new Error('Teste de voz não disponível para Minimax');
      }

      throw new Error('Plataforma não suportada para teste');
    } catch (error) {
      console.error('Erro ao gerar teste de voz:', error);
      throw error;
    }
  };

  const handlePlayPreview = async (voice: VoiceData, event: React.MouseEvent) => {
    event.stopPropagation();

    // Se já está tocando esta voz, parar
    if (playingVoiceId === voice.voice_id && playingAudio) {
      playingAudio.pause();
      playingAudio.currentTime = 0;
      setPlayingAudio(null);
      setPlayingVoiceId(null);
      return;
    }

    // Parar qualquer áudio tocando
    if (playingAudio) {
      playingAudio.pause();
      playingAudio.currentTime = 0;
    }

    try {
      const audioUrl = await generateVoiceTest(voice);
      const audio = new Audio(audioUrl);

      audio.addEventListener('ended', () => {
        setPlayingVoiceId(null);
        setPlayingAudio(null);
      });

      audio.addEventListener('error', () => {
        setPlayingVoiceId(null);
        setPlayingAudio(null);
      });

      await audio.play();
      setPlayingVoiceId(voice.voice_id);
      setPlayingAudio(audio);
    } catch (error) {
      console.error('Erro ao reproduzir preview:', error);
      alert(`Erro ao reproduzir preview da voz ${voice.nome_voz}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setPlayingVoiceId(null);
      setPlayingAudio(null);
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
            {(selectedVoice.preview_url || selectedVoice.plataforma === 'Fish-Audio' || selectedVoice.plataforma === 'ElevenLabs') ? (
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