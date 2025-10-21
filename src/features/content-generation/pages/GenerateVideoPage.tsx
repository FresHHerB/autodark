import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Loader2, Calendar, FileCheck, Image as ImageIcon, Volume2, CheckCircle, Clock, Play, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@features/dashboard/components';
import { supabase } from '@shared/lib/supabase';
import { apiService } from '@shared/services';

interface Channel {
  id: number;
  nome_canal: string;
  url_canal?: string;
  media_chars?: number;
  caption_style?: any;
}

interface Roteiro {
  id: number;
  roteiro: string;
  canal_id: number;
  created_at: string;
  titulo: string | null;
  audio_path: string | null;
  images_path: string[] | null;
  transcricao_timestamp: string | null;
}

interface VideoSchedule {
  id: number;
  data: string;
  hora: string;
}

interface VideoZoomTypes {
  id: number;
  zoomTypes: string[];
}

const ZOOM_OPTIONS = [
  { value: 'zoomin', label: 'Zoom In' },
  { value: 'zoomout', label: 'Zoom Out' },
  { value: 'zoompanright', label: 'Zoom Pan Right' }
] as const;

export default function GenerateVideoPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [isLoadingRoteiros, setIsLoadingRoteiros] = useState(false);
  const [selectedRoteiros, setSelectedRoteiros] = useState<Set<number>>(new Set());
  const [generateCaption, setGenerateCaption] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Buscar canais ao carregar a página
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setIsLoadingChannels(true);
      const { data, error } = await supabase
        .from('canais')
        .select('id, nome_canal, url_canal, media_chars, caption_style')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar canais:', error);
        return;
      }

      if (data) {
        setChannels(data);
      }
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const fetchRoteiros = async (canalId: number) => {
    try {
      setIsLoadingRoteiros(true);

      // Buscar roteiros com status 'conteudo_gerado'
      const { data: roteirosData, error: roteirosError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('canal_id', canalId)
        .eq('status', 'conteudo_gerado')
        .not('audio_path', 'is', null)
        .not('images_path', 'is', null)
        .not('transcricao_timestamp', 'is', null)
        .order('created_at', { ascending: false });

      if (roteirosError) {
        console.error('Erro ao buscar roteiros:', roteirosError);
        return;
      }

      // Buscar todos os IDs de roteiros que já possuem vídeos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id');

      if (videosError) {
        console.error('Erro ao buscar vídeos:', videosError);
        return;
      }

      // Criar Set com IDs de roteiros que já têm vídeos
      const videosIds = new Set(videosData?.map(v => v.id) || []);

      if (roteirosData) {
        // Filtrar apenas roteiros que:
        // 1. Têm arrays de imagens não vazios
        // 2. NÃO possuem vídeo gerado (id não está na tabela videos)
        const filteredRoteiros = roteirosData.filter(roteiro =>
          roteiro.images_path &&
          Array.isArray(roteiro.images_path) &&
          roteiro.images_path.length > 0 &&
          !videosIds.has(roteiro.id) // ✅ Exclui roteiros que já têm vídeos
        );
        setRoteiros(filteredRoteiros);
      }
    } catch (error) {
      console.error('Erro ao buscar roteiros:', error);
    } finally {
      setIsLoadingRoteiros(false);
    }
  };

  const handleChannelSelect = (channelId: string) => {
    const id = parseInt(channelId);
    setSelectedChannelId(id || null);
    setRoteiros([]);
    setSelectedRoteiros(new Set());

    if (id) {
      fetchRoteiros(id);
    }
  };

  const toggleRoteiroSelection = (roteiroId: number) => {
    setSelectedRoteiros(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roteiroId)) {
        newSet.delete(roteiroId);
      } else {
        newSet.add(roteiroId);
      }
      return newSet;
    });
  };

  const handleGenerateVideos = async () => {
    if (selectedRoteiros.size === 0) {
      alert('Selecione pelo menos um roteiro para gerar vídeo');
      return;
    }

    try {
      setIsGenerating(true);

      // Build payload with global video config
      const payload = {
        id_roteiro: Array.from(selectedRoteiros),
        video: {
          type: "imagem",
          generate: true,
          caption: generateCaption
        }
      };

      console.log('Enviando payload:', payload);

      // Call webhook
      await apiService.generateVideos(payload);

      alert(`${selectedRoteiros.size} vídeo(s) enviado(s) para geração com sucesso!`);

      // Reset selections
      setSelectedRoteiros(new Set());
    } catch (error) {
      console.error('Erro ao gerar vídeos:', error);
      alert('Erro ao gerar vídeos. Verifique o console para mais detalhes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedRoteirosArray = Array.from(selectedRoteiros);

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />

      <main className="w-[90%] mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-light text-white">Gerar Vídeos</h1>
            <p className="text-gray-400 text-sm">
              Selecione roteiros prontos e agende a geração dos vídeos
            </p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-light text-white mb-4">
            Selecionar Canal
          </h2>

          <div className="relative">
            <select
              value={selectedChannelId || ''}
              onChange={(e) => handleChannelSelect(e.target.value)}
              disabled={isLoadingChannels}
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 focus:outline-none focus:border-gray-600 appearance-none disabled:opacity-50"
            >
              <option value="">
                {isLoadingChannels ? 'Carregando canais...' : 'Selecione um canal...'}
              </option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.nome_canal}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          {selectedChannel && (
            <div className="mt-4">
              <div className="p-4 bg-gray-800 border border-gray-700 rounded">
                <h3 className="text-white font-medium mb-1">{selectedChannel.nome_canal}</h3>
                {selectedChannel.url_canal && (
                  <p className="text-gray-400 text-sm mb-2">{selectedChannel.url_canal}</p>
                )}
              </div>

              {/* Caption Style Warning */}
              {!selectedChannel.caption_style && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-red-400 font-medium mb-1">Tipo de legenda não definido</h4>
                    <p className="text-red-300 text-sm mb-2">
                      Configure o estilo de legendas na página de gerenciamento de canais antes de gerar vídeos.
                    </p>
                    <button
                      onClick={() => navigate('/manage-channel')}
                      className="text-sm text-red-400 hover:text-red-300 underline transition-colors"
                    >
                      Ir para configurações de canais
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Roteiros Section */}
        {selectedChannel && selectedChannel.caption_style && (
          <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-white mb-1">
                  Roteiros Prontos para Geração
                </h2>
                <p className="text-sm text-gray-400">
                  Apenas roteiros com áudio, imagens e legendas completos
                </p>
              </div>
              {selectedRoteiros.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-500/50 rounded">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-sm font-medium">
                    {selectedRoteiros.size} selecionado{selectedRoteiros.size > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {isLoadingRoteiros ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : roteiros.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 p-12 text-center rounded">
                <Play className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">
                  Nenhum roteiro pronto encontrado
                </p>
                <p className="text-gray-500 text-sm">
                  Roteiros precisam ter áudio, imagens e legendas gerados
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roteiros.map((roteiro) => {
                  const isSelected = selectedRoteiros.has(roteiro.id);

                  return (
                    <div
                      key={roteiro.id}
                      onClick={() => toggleRoteiroSelection(roteiro.id)}
                      className={`bg-gray-800 border p-4 rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        {/* Header with checkbox */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 pt-0.5">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-600'
                              }`}
                            >
                              {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium text-sm mb-1 truncate" title={roteiro.titulo || 'Sem título'}>
                              {roteiro.titulo ? (roteiro.titulo.length > 40 ? `${roteiro.titulo.substring(0, 40)}...` : roteiro.titulo) : 'Sem título'}
                            </h3>
                          </div>
                        </div>

                        {/* Content preview */}
                        <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                          {roteiro.roteiro.substring(0, 100)}...
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(roteiro.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Volume2 className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-blue-400">
                            <ImageIcon className="w-3 h-3" />
                            <span>{roteiro.images_path?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-purple-400">
                            <FileCheck className="w-3 h-3" />
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Generate Section - Modern Design */}
        {selectedRoteiros.size > 0 && (
          <div className="sticky bottom-4 z-10">
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900 border border-gray-800 rounded-xl shadow-2xl backdrop-blur-sm">
              <div className="p-6">
                <div className="flex items-center gap-6">
                  {/* Left: Selection Summary Card */}
                  <div className="flex items-center gap-4 px-5 py-3 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {selectedRoteiros.size} {selectedRoteiros.size === 1 ? 'Roteiro' : 'Roteiros'}
                      </p>
                      <p className="text-xs text-blue-300">
                        Pronto{selectedRoteiros.size > 1 ? 's' : ''} para geração
                      </p>
                    </div>
                  </div>

                  {/* Center: Caption Toggle Card */}
                  <div className="px-6 py-3 bg-gray-800/60 border border-gray-700 rounded-lg hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Legendas</span>
                        <span className="text-xs text-gray-400">
                          {generateCaption ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>
                      <button
                        onClick={() => setGenerateCaption(!generateCaption)}
                        className={`
                          relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner
                          ${generateCaption
                            ? 'bg-purple-600 shadow-purple-600/50'
                            : 'bg-gray-600'
                          }
                        `}
                      >
                        <div className={`
                          absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300
                          ${generateCaption ? 'translate-x-7' : 'translate-x-0'}
                        `} />
                      </button>
                    </div>
                  </div>

                  {/* Right: Generate Button */}
                  <button
                    onClick={handleGenerateVideos}
                    disabled={isGenerating}
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 group"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>
                          Gerar {selectedRoteiros.size === 1 ? 'Vídeo' : `${selectedRoteiros.size} Vídeos`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedChannel && !isLoadingChannels && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center rounded">
            <p className="text-gray-400">
              Selecione um canal para visualizar os roteiros prontos
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
