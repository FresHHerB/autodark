import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@features/dashboard/components';
import { supabase } from '@shared/lib';
import { apiService } from '@shared/services';
import { FileText, Calendar, Mic, Image as ImageIcon, Video, X, Play, Download, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Loader2, RefreshCw, Trash2, ChevronDown, Check, Copy } from 'lucide-react';
import ImageLightbox from '@shared/components/modals/ImageLightbox';
import VideoPlayer from '@shared/components/modals/VideoPlayer';

interface ImageInfo {
  index: number;
  image_url: string;
  image_info: {
    altura: number;
    largura: number;
    modelo: string;
    prompt: string;
  };
}

interface Script {
  id: number;
  titulo: string;
  roteiro: string;
  canal_id: number;
  canal_nome: string;
  canal_profile_image: string | null;
  created_at: string;
  updated_at: string | null;
  status: string | null;
  audio_path: string | null;
  text_thumb: string | null;
  images_path: string[] | null;
  transcricao_timestamp: string | null;
  images_info: ImageInfo[] | null;
  video_id: number | null;
  video_status: string | null;
  video_path: string | null;
  thumb_path: string | null;
}

export default function ViewScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [channels, setChannels] = useState<{id: number, nome_canal: string, profile_image: string | null}[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'with_audio' | 'with_images' | 'with_video' | 'gerando_roteiro' | 'roteiro_gerado' | 'gerando_audio' | 'audio_gerado' | 'gerando_imagens' | 'imagens_geradas' | 'conteudo_gerado' | 'gerando_video' | 'video_gerado'>('all');
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  // Image regeneration states
  const [editingImagePrompt, setEditingImagePrompt] = useState<{id_roteiro: number, index: number, prompt: string} | null>(null);
  const [regeneratingImage, setRegeneratingImage] = useState<{id_roteiro: number, index: number} | null>(null);
  const [imageReloadTrigger, setImageReloadTrigger] = useState<{[key: string]: number}>({});

  // Lightbox and video player states
  const [lightboxImage, setLightboxImage] = useState<{url: string, alt: string} | null>(null);
  const [videoPlayer, setVideoPlayer] = useState<{url: string, title: string} | null>(null);

  // Delete confirmation state
  const [deletingScript, setDeletingScript] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id: number, title: string} | null>(null);

  // Success notification state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Script editing state
  const [editingScript, setEditingScript] = useState<{titulo: string, roteiro: string} | null>(null);
  const [savingScript, setSavingScript] = useState(false);

  // Collapsed channels state
  const [collapsedChannels, setCollapsedChannels] = useState<Set<string>>(new Set());

  // Auto-update countdown state
  const [nextUpdateIn, setNextUpdateIn] = useState(10);

  useEffect(() => {
    loadChannels();
    loadScripts();
  }, []);

  // Auto-update every 10 seconds (pause when tab is inactive)
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (countdownInterval) return; // Already running

      // Reset countdown
      setNextUpdateIn(10);

      // Single interval (every second) - handles both countdown and update
      countdownInterval = setInterval(() => {
        setNextUpdateIn(prev => {
          const newValue = prev - 1;

          // When countdown reaches 0, trigger update and reset
          if (newValue <= 0) {
            console.log('🔄 Auto-atualizando roteiros...');
            loadScripts(true); // Silent refresh
            return 10; // Reset to 10
          }

          return newValue; // Decrement normally
        });
      }, 1000);
    };

    const stopInterval = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    // Only update when tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Aba inativa - pausando auto-update de roteiros');
        stopInterval();
      } else {
        console.log('👁️ Aba ativa - retomando auto-update de roteiros');
        loadScripts(true); // Update immediately when returning (silent)
        startInterval();
      }
    };

    // Start interval
    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close channel dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && !target.closest('.channel-dropdown-container')) {
        setShowChannelDropdown(false);
      }
    };

    if (showChannelDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChannelDropdown]);

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('id, nome_canal, profile_image')
        .order('nome_canal', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    }
  };

  const loadScripts = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const { data: scriptsData, error: scriptsError } = await supabase
        .from('roteiros')
        .select(`
          id,
          titulo,
          roteiro,
          canal_id,
          created_at,
          updated_at,
          status,
          audio_path,
          text_thumb,
          images_path,
          transcricao_timestamp,
          images_info
        `)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (scriptsError) throw scriptsError;

      // Load channel names and profile images
      const { data: channelsData } = await supabase
        .from('canais')
        .select('id, nome_canal, profile_image');

      // Load videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('id, status, video_path, thumb_path');

      const channelsMap = new Map(channelsData?.map(c => [c.id, { nome: c.nome_canal, profileImage: c.profile_image }]) || []);
      const videosMap = new Map(videosData?.map(v => [v.id, v]) || []);

      const enrichedScripts: Script[] = (scriptsData || []).map(script => ({
        ...script,
        canal_nome: channelsMap.get(script.canal_id)?.nome || 'Desconhecido',
        canal_profile_image: channelsMap.get(script.canal_id)?.profileImage || null,
        video_id: videosMap.has(script.id) ? script.id : null,
        video_status: videosMap.get(script.id)?.status || null,
        video_path: videosMap.get(script.id)?.video_path || null,
        thumb_path: videosMap.get(script.id)?.thumb_path || null,
      }));

      setScripts(enrichedScripts);
    } catch (error) {
      console.error('Erro ao carregar roteiros:', error);
      if (!silent) {
        alert('Erro ao carregar roteiros. Verifique o console.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadScripts();
      setNextUpdateIn(10); // Reset countdown when manually refreshing
    } catch (error) {
      console.error('Erro ao recarregar roteiros:', error);
      alert('Erro ao recarregar roteiros. Tente novamente.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRegenerateImage = async (id_roteiro: number, index: number, updatedImageInfo: ImageInfo['image_info']) => {
    try {
      setRegeneratingImage({ id_roteiro, index });

      const payload = {
        id_roteiro,
        index,
        image_info: updatedImageInfo,
        tipo_geracao: 'regen_image'
      };

      await apiService.generateContent(payload);

      // Webhook retorna qualquer resposta indicando sucesso
      // A imagem foi atualizada no S3 no mesmo caminho
      // Forçamos reload da imagem específica para garantir atualização

      const timestamp = Date.now();
      const imageKey = `${id_roteiro}_${index}`;

      // Atualiza o trigger de reload para forçar re-render da imagem
      setImageReloadTrigger(prev => ({
        ...prev,
        [imageKey]: timestamp
      }));

      // Recarrega os scripts para atualizar images_info do database
      await loadScripts();

      // Mostra mensagem de sucesso por 3 segundos
      setSuccessMessage(`Imagem ${index} regenerada com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);

      setEditingImagePrompt(null);
    } catch (error) {
      console.error('Error regenerating image:', error);
      alert('Erro ao regenerar imagem. Tente novamente.');
    } finally {
      setRegeneratingImage(null);
    }
  };

  const handleDeleteScript = async (id: number) => {
    const scriptTitle = confirmDelete?.title || `#${id}`;

    try {
      setDeletingScript(id);

      // Mostra mensagem de loading
      setSuccessMessage('Excluindo roteiro...');

      await apiService.deleteContent({
        id,
        deleteType: 'deleteScript'
      });

      // Recarrega os roteiros do banco de dados
      await loadScripts();
      setConfirmDelete(null);

      // Mostra mensagem de sucesso
      setSuccessMessage(`Roteiro "${scriptTitle}" excluído com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Erro ao deletar roteiro:', error);
      setSuccessMessage('Erro ao excluir roteiro. Tente novamente.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setDeletingScript(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedScript(null);
    setEditingScript(null);
  };

  const toggleChannelCollapse = (channelName: string) => {
    setCollapsedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelName)) {
        newSet.delete(channelName);
      } else {
        newSet.add(channelName);
      }
      return newSet;
    });
  };

  const handleSaveScript = async () => {
    if (!selectedScript || !editingScript) return;

    try {
      setSavingScript(true);
      setSuccessMessage('Salvando alterações...');

      await apiService.updateScript({
        id_roteiro: selectedScript.id,
        titulo: editingScript.titulo,
        roteiro: editingScript.roteiro,
      });

      // Recarregar dados do roteiro atualizado do banco
      const { data: updatedScript, error } = await supabase
        .from('roteiros')
        .select(`
          id,
          titulo,
          roteiro,
          canal_id,
          created_at,
          updated_at,
          status,
          audio_path,
          text_thumb,
          images_path,
          transcricao_timestamp,
          images_info
        `)
        .eq('id', selectedScript.id)
        .single();

      if (error) throw error;

      // Buscar dados do canal
      const { data: channelData } = await supabase
        .from('canais')
        .select('id, nome_canal, profile_image')
        .eq('id', updatedScript.canal_id)
        .single();

      // Buscar dados do vídeo
      const { data: videoData } = await supabase
        .from('videos')
        .select('id, status, video_path, thumb_path')
        .eq('id', updatedScript.id)
        .single();

      // Atualizar o script selecionado com os dados atualizados
      const enrichedScript: Script = {
        ...updatedScript,
        canal_nome: channelData?.nome_canal || 'Desconhecido',
        canal_profile_image: channelData?.profile_image || null,
        video_id: videoData?.id || null,
        video_status: videoData?.status || null,
        video_path: videoData?.video_path || null,
        thumb_path: videoData?.thumb_path || null,
      };

      setSelectedScript(enrichedScript);

      // Atualizar também a lista de scripts
      await loadScripts();

      // Limpar modo de edição e mostrar sucesso
      setEditingScript(null);
      setSuccessMessage('Dados atualizados!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Erro ao salvar roteiro:', error);
      setSuccessMessage('Erro ao salvar alterações. Tente novamente.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSavingScript(false);
    }
  };

  const filteredScripts = scripts.filter(script => {
    if (filterChannel && script.canal_id.toString() !== filterChannel) return false;

    // Legacy filters (based on content)
    if (filterStatus === 'with_audio' && !script.audio_path) return false;
    if (filterStatus === 'with_images' && (!script.images_path || script.images_path.length === 0)) return false;
    if (filterStatus === 'with_video' && !script.video_id) return false;

    // Status-based filters
    if (filterStatus !== 'all' && filterStatus !== 'with_audio' && filterStatus !== 'with_images' && filterStatus !== 'with_video') {
      if (script.status !== filterStatus) return false;
    }

    return true;
  });

  // Group scripts by channel
  const scriptsByChannel = filteredScripts.reduce((acc, script) => {
    const channelName = script.canal_nome;
    if (!acc[channelName]) {
      acc[channelName] = [];
    }
    acc[channelName].push(script);
    return acc;
  }, {} as Record<string, Script[]>);

  const channelNames = Object.keys(scriptsByChannel).sort();

  // Calculate relative time (há X minutos, Y horas, N dias...)
  const getRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '';

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'agora mesmo';
    if (diffMinutes < 60) return `há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 30) return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;

    const diffYears = Math.floor(diffDays / 365);
    return `há ${diffYears} ${diffYears === 1 ? 'ano' : 'anos'}`;
  };

  // Sanitize and format status labels
  const getStatusLabel = (status: string | null): { text: string; bgClass: string; textClass: string; icon: any } => {
    const statusMap: {[key: string]: { text: string; bgClass: string; textClass: string; icon: any }} = {
      'gerando_roteiro': { text: 'Gerando Roteiro', bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-300', icon: Loader2 },
      'roteiro_gerado': { text: 'Roteiro Gerado', bgClass: 'bg-green-500/20', textClass: 'text-green-300', icon: CheckCircle },
      'gerando_audio': { text: 'Gerando Áudio', bgClass: 'bg-blue-500/20', textClass: 'text-blue-300', icon: Loader2 },
      'audio_gerado': { text: 'Áudio Gerado', bgClass: 'bg-blue-500/20', textClass: 'text-blue-300', icon: Mic },
      'gerando_imagens': { text: 'Gerando Imagens', bgClass: 'bg-purple-500/20', textClass: 'text-purple-300', icon: Loader2 },
      'imagens_geradas': { text: 'Imagens Geradas', bgClass: 'bg-purple-500/20', textClass: 'text-purple-300', icon: ImageIcon },
      'conteudo_gerado': { text: 'Conteúdo Gerado', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-300', icon: CheckCircle },
      'gerando_video': { text: 'Gerando Vídeo', bgClass: 'bg-orange-500/20', textClass: 'text-orange-300', icon: Loader2 },
      'video_gerado': { text: 'Vídeo Gerado', bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-300', icon: Video },
    };

    return statusMap[status || ''] || { text: 'Status Desconhecido', bgClass: 'bg-gray-500/20', textClass: 'text-gray-300', icon: AlertCircle };
  };

  const getStatusBadge = (script: Script) => {
    // Show video badge ONLY when video is completed (status = video_gerado)
    if (script.status === 'video_gerado') {
      return (
        <span className="flex items-center space-x-0.5 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-200 text-[10px] rounded-full">
          <Video className="w-2.5 h-2.5" />
          <span>Com Vídeo</span>
        </span>
      );
    }

    // Show images badge when images are available (but video is not completed yet)
    if (script.images_path && script.images_path.length > 0) {
      return (
        <span className="flex items-center space-x-0.5 px-1.5 py-0.5 bg-purple-500/20 text-purple-200 text-[10px] rounded-full">
          <ImageIcon className="w-2.5 h-2.5" />
          <span>Com Imagens</span>
        </span>
      );
    }

    // Show audio badge when audio is available (but no images)
    if (script.audio_path) {
      return (
        <span className="flex items-center space-x-0.5 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-200 text-[10px] rounded-full">
          <Mic className="w-2.5 h-2.5" />
          <span>Com Áudio</span>
        </span>
      );
    }

    return (
      <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-300 text-[10px] rounded-full">
        Apenas Roteiro
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Copy functions
  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title).then(() => {
      setSuccessMessage('Título copiado!');
      setTimeout(() => setSuccessMessage(null), 2000);
    }).catch(err => {
      console.error('Erro ao copiar título:', err);
      alert('Erro ao copiar título');
    });
  };

  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script).then(() => {
      setSuccessMessage('Roteiro copiado!');
      setTimeout(() => setSuccessMessage(null), 2000);
    }).catch(err => {
      console.error('Erro ao copiar roteiro:', err);
      alert('Erro ao copiar roteiro');
    });
  };

  const handleCopyTextThumb = (textThumb: string) => {
    navigator.clipboard.writeText(textThumb).then(() => {
      setSuccessMessage('Text Thumb copiado!');
      setTimeout(() => setSuccessMessage(null), 2000);
    }).catch(err => {
      console.error('Erro ao copiar text thumb:', err);
      alert('Erro ao copiar text thumb');
    });
  };

  const handleCopyAll = (title: string, script: string, textThumb?: string | null) => {
    let formattedText = `#TITULO:\n${title}\n\n`;

    if (textThumb) {
      formattedText += `\n------\n\n#TEXT_THUMB:\n${textThumb}\n\n`;
    }

    formattedText += `\n----------\n\n#ROTEIRO\n${script}`;

    navigator.clipboard.writeText(formattedText).then(() => {
      setSuccessMessage('Título, text thumb e roteiro copiados!');
      setTimeout(() => setSuccessMessage(null), 2000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      alert('Erro ao copiar');
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader />

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Visualizar Roteiros</h1>
            <p className="text-gray-400">Gerencie e visualize todos os roteiros criados</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Countdown Timer */}
            {!loading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  Próxima atualização em: <span className="font-semibold text-blue-400">{nextUpdateIn}s</span>
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              title="Atualizar lista de roteiros"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="relative z-50 bg-black/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
            <div className="channel-dropdown-container relative z-[100]">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filtrar por Canal
              </label>
              <button
                onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {filterChannel ? (
                    (() => {
                      const selectedChannel = channels.find(c => c.id.toString() === filterChannel);
                      return selectedChannel ? (
                        <>
                          {selectedChannel.profile_image ? (
                            <img
                              src={`${selectedChannel.profile_image}?t=${Date.now()}`}
                              alt={selectedChannel.nome_canal}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                              {selectedChannel.nome_canal.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{selectedChannel.nome_canal}</span>
                        </>
                      ) : (
                        <span>Todos os Canais</span>
                      );
                    })()
                  ) : (
                    <span className="text-gray-400">Todos os Canais</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showChannelDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showChannelDropdown && (
                <div className="absolute z-[100] w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => {
                      setFilterChannel('');
                      setShowChannelDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2.5 text-gray-300"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-xs">✕</span>
                    </div>
                    <span>Todos os Canais</span>
                  </button>
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setFilterChannel(channel.id.toString());
                        setShowChannelDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2.5 ${
                        filterChannel === channel.id.toString() ? 'bg-gray-700/50 text-white' : 'text-gray-300'
                      }`}
                    >
                      {channel.profile_image ? (
                        <img
                          src={`${channel.profile_image}?t=${Date.now()}`}
                          alt={channel.nome_canal}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          {channel.nome_canal.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{channel.nome_canal}</span>
                      {filterChannel === channel.id.toString() && (
                        <Check className="w-4 h-4 ml-auto text-green-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filtrar por Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <optgroup label="Status de Processamento">
                  <option value="gerando_roteiro">🔄 Gerando Roteiro</option>
                  <option value="roteiro_gerado">✅ Roteiro Gerado</option>
                  <option value="gerando_audio">🔄 Gerando Áudio</option>
                  <option value="audio_gerado">🎵 Áudio Gerado</option>
                  <option value="gerando_imagens">🔄 Gerando Imagens</option>
                  <option value="imagens_geradas">🖼️ Imagens Geradas</option>
                  <option value="conteudo_gerado">✅ Conteúdo Gerado</option>
                  <option value="gerando_video">🔄 Gerando Vídeo</option>
                  <option value="video_gerado">🎬 Vídeo Gerado</option>
                </optgroup>
                <optgroup label="Por Conteúdo">
                  <option value="with_audio">Com Áudio</option>
                  <option value="with_images">Com Imagens</option>
                  <option value="with_video">Com Vídeo</option>
                </optgroup>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-gray-300">
                <div className="text-sm mb-1">Total de Roteiros</div>
                <div className="text-2xl font-bold text-white">{filteredScripts.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scripts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando roteiros...</p>
            </div>
          </div>
        ) : filteredScripts.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Nenhum roteiro encontrado</p>
            <p className="text-gray-500 text-sm">Ajuste os filtros ou crie novos roteiros</p>
          </div>
        ) : (
          <div className="space-y-8">
            {channelNames.map(channelName => {
              const isCollapsed = collapsedChannels.has(channelName);

              return (
              <div key={channelName}>
                {/* Channel Header - Clickable */}
                <button
                  onClick={() => toggleChannelCollapse(channelName)}
                  className="flex items-center mb-4 w-full text-left hover:opacity-80 transition-opacity group"
                >
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <div className="w-1 h-6 bg-blue-500 rounded-full mr-3"></div>
                      <ChevronDown className={`w-5 h-5 mr-2 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                      {channelName}
                    </h2>
                    <p className="text-gray-400 text-sm ml-11 mt-1">
                      {scriptsByChannel[channelName].length} {scriptsByChannel[channelName].length === 1 ? 'roteiro' : 'roteiros'}
                    </p>
                  </div>
                </button>

                {/* Scripts Grid for this Channel - Conditionally rendered */}
                {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {scriptsByChannel[channelName].map(script => (
                    <div
                      key={script.id}
                      className="bg-black/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 group relative"
                    >
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ id: script.id, title: script.titulo || 'Sem título' });
                        }}
                        className="absolute top-3 right-3 z-10 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Excluir roteiro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div
                        onClick={() => setSelectedScript(script)}
                        className="cursor-pointer"
                      >
                {/* Thumbnail */}
                {script.thumb_path ? (
                  <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <img
                      src={script.thumb_path}
                      alt={script.titulo || 'Thumbnail'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all"></div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                    <FileText className="w-12 h-12 text-gray-600" />
                  </div>
                )}

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-xs mb-1 line-clamp-2">
                        {script.titulo || 'Sem título'}
                      </h3>
                      <div className="flex items-center gap-1">
                        {script.canal_profile_image ? (
                          <img
                            src={`${script.canal_profile_image}?t=${Date.now()}`}
                            alt={script.canal_nome}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <Video className="w-4 h-4 text-gray-600" />
                        )}
                        <p className="text-xs text-gray-300 font-medium">
                          {script.canal_nome}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(script)}
                  </div>

                  <p className="text-gray-300 text-[11px] mb-2 line-clamp-2">
                    {script.roteiro}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {script.audio_path && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-200 text-[10px] rounded">
                        <Mic className="w-2.5 h-2.5" />
                        <span>Áudio</span>
                      </span>
                    )}
                    {script.images_path && script.images_path.length > 0 && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-200 text-[10px] rounded">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>{script.images_path.length} imgs</span>
                      </span>
                    )}
                    {script.status === 'video_gerado' && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-200 text-[10px] rounded">
                        <Video className="w-2.5 h-2.5" />
                        <span>Vídeo</span>
                      </span>
                    )}
                  </div>

                  {/* Status Tag */}
                  {script.status && (
                    <div className="mb-2">
                      {(() => {
                        const statusInfo = getStatusLabel(script.status);
                        const Icon = statusInfo.icon;
                        return (
                          <span className={`flex items-center space-x-1 px-2 py-1 ${statusInfo.bgClass} ${statusInfo.textClass} text-[10px] rounded-full font-medium`}>
                            <Icon className={`w-3 h-3 ${statusInfo.text.includes('Gerando') ? 'animate-spin' : ''}`} />
                            <span>{statusInfo.text}</span>
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{script.updated_at ? getRelativeTime(script.updated_at) : getRelativeTime(script.created_at)}</span>
                    </div>
                    <span className="text-gray-600">ID: {script.id}</span>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
                )}
        </div>
              );
            })}
        </div>
      )}

        {/* Modal */}
        {selectedScript && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCloseModal}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <h2 className="text-2xl font-bold text-white mb-2 line-clamp-2">
                      {selectedScript.titulo || 'Sem título'}
                    </h2>
                    <div className="flex items-center space-x-3">
                      {selectedScript.canal_profile_image ? (
                        <img
                          src={`${selectedScript.canal_profile_image}?t=${Date.now()}`}
                          alt={selectedScript.canal_nome}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <Video className="w-8 h-8 text-gray-600" />
                      )}
                      <span className="text-base text-gray-300 font-medium">{selectedScript.canal_nome}</span>
                      {getStatusBadge(selectedScript)}
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Copy Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopyTitle(selectedScript.titulo || 'Sem título')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Título</span>
                  </button>
                  {selectedScript.text_thumb && (
                    <button
                      onClick={() => handleCopyTextThumb(selectedScript.text_thumb!)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar Text Thumb</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyScript(selectedScript.roteiro)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Roteiro</span>
                  </button>
                  <button
                    onClick={() => handleCopyAll(selectedScript.titulo || 'Sem título', selectedScript.roteiro, selectedScript.text_thumb)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Tudo</span>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Thumbnail Image in Modal */}
                {selectedScript.thumb_path && (
                  <div className="bg-black/40 rounded-xl overflow-hidden">
                    <img
                      src={selectedScript.thumb_path}
                      alt={selectedScript.titulo || 'Thumbnail'}
                      className="w-full max-h-96 object-contain"
                    />
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-gray-400 text-xs mb-1">ID do Roteiro</div>
                    <div className="text-white font-semibold">#{selectedScript.id}</div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-gray-400 text-xs mb-1">Canal</div>
                    <div className="text-white font-semibold">{selectedScript.canal_nome}</div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-gray-400 text-xs mb-1">Criado em</div>
                    <div className="text-white font-semibold text-sm">{formatDate(selectedScript.created_at)}</div>
                  </div>
                  {selectedScript.status && (
                    <div className="bg-black/40 rounded-lg p-4">
                      <div className="text-gray-400 text-xs mb-1">Status Atual</div>
                      {(() => {
                        const statusInfo = getStatusLabel(selectedScript.status);
                        const Icon = statusInfo.icon;
                        return (
                          <div className={`flex items-center gap-1.5 ${statusInfo.textClass}`}>
                            <Icon className={`w-4 h-4 ${statusInfo.text.includes('Gerando') ? 'animate-spin' : ''}`} />
                            <span className="font-semibold text-sm">{statusInfo.text}</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Updated At */}
                {selectedScript.updated_at && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-300">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        Última atualização: <span className="font-semibold">{getRelativeTime(selectedScript.updated_at)}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Thumbnail */}
                {selectedScript.text_thumb && (
                  <div className="bg-black/40 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-400" />
                      Thumbnail de Texto
                    </h3>
                    <p className="text-gray-300">{selectedScript.text_thumb}</p>
                  </div>
                )}

                {/* Script Text */}
                <div className="bg-black/40 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-400" />
                      Roteiro Completo
                    </h3>
                    {!editingScript ? (
                      <>
                        {/* Regra: roteiro só pode ser editado se:
                            - audio_path = NULL
                            - images_path = NULL
                            - status = 'roteiro_gerado'
                            - Não existe vídeo (video_id = null)
                        */}
                        {selectedScript.audio_path || selectedScript.images_path || selectedScript.status !== 'roteiro_gerado' || selectedScript.video_id ? (
                          <div className="text-xs text-gray-500 italic">
                            {selectedScript.video_id
                              ? 'Roteiro já convertido em vídeo'
                              : selectedScript.audio_path || selectedScript.images_path
                              ? 'Roteiro com mídia gerada não pode ser editado'
                              : 'Roteiro só pode ser editado com status "roteiro_gerado"'}
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingScript({ titulo: selectedScript.titulo || '', roteiro: selectedScript.roteiro })}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingScript(null)}
                          disabled={savingScript}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveScript}
                          disabled={savingScript}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                        >
                          {savingScript ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Salvar
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {editingScript ? (
                    <textarea
                      value={editingScript.roteiro}
                      onChange={(e) => setEditingScript({ ...editingScript, roteiro: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-96 font-mono text-sm"
                      placeholder="Digite o roteiro..."
                    />
                  ) : (
                    <div className="text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                      {selectedScript.roteiro}
                    </div>
                  )}
                </div>

                {/* Audio */}
                {selectedScript.audio_path && (
                  <div className="bg-black/40 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Mic className="w-5 h-5 mr-2 text-blue-400" />
                      Áudio
                    </h3>
                    <audio controls className="w-full">
                      <source src={selectedScript.audio_path} type="audio/mpeg" />
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                    <a
                      href={selectedScript.audio_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm mt-3"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir em nova aba</span>
                    </a>
                  </div>
                )}

                {/* Images Info */}
                {selectedScript.images_info && selectedScript.images_info.length > 0 && (
                  <div className="bg-black/40 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-700">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Imagens Geradas ({selectedScript.images_info.length})
                        </label>
                      </div>
                    </div>

                    {/* Scrollable Images Grid */}
                    <div className="p-6 overflow-y-auto custom-scrollbar max-h-[600px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedScript.images_info.map((imageItem) => {
                          const isEditing = editingImagePrompt?.id_roteiro === selectedScript.id && editingImagePrompt?.index === imageItem.index;
                          const isRegenerating = regeneratingImage?.id_roteiro === selectedScript.id && regeneratingImage?.index === imageItem.index;
                          const imageKey = `${selectedScript.id}_${imageItem.index}`;
                          const reloadKey = imageReloadTrigger[imageKey] || 0;

                          return (
                            <div
                              key={imageItem.index}
                              className="bg-gray-800/50 border border-green-600/30 rounded-lg overflow-hidden flex flex-col"
                            >
                              {/* Image Preview */}
                              <div
                                className="aspect-video relative group cursor-pointer"
                                onClick={() => {
                                  const imageUrl = reloadKey > 0 ? `${imageItem.image_url}?t=${reloadKey}` : imageItem.image_url;
                                  setLightboxImage({ url: imageUrl, alt: `Imagem ${imageItem.index} - ${selectedScript.titulo}` });
                                }}
                              >
                                <img
                                  key={reloadKey}
                                  src={reloadKey > 0 ? `${imageItem.image_url}?t=${reloadKey}` : imageItem.image_url}
                                  alt={`Imagem ${imageItem.index} - ${selectedScript.titulo}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik04MCA4MEw5MCA5MEwxMTAgODBMMTMwIDEwMEg4MFY4MFoiIGZpbGw9IiM2QjczODAiLz4KPGNpcmNsZSBjeD0iOTAiIGN5PSI4MCIgcj0iOCIgZmlsbD0iIzZCNzM4MCIvPgo8L3N2Zz4K';
                                  }}
                                />

                                {/* Image overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                      <span className="text-white text-sm">🔍</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Image number */}
                                <div className="absolute top-2 left-2">
                                  <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full">
                                    #{imageItem.index}
                                  </span>
                                </div>

                                {/* Regenerating overlay */}
                                {isRegenerating && (
                                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <div className="text-center">
                                      <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-2" />
                                      <p className="text-white text-sm">Gerando...</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Image Info */}
                              <div className="p-4 flex-1 flex flex-col space-y-3">
                                {/* Metadata */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Dimensões:</span>
                                    <span className="text-green-300">{imageItem.image_info.largura} x {imageItem.image_info.altura}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Modelo:</span>
                                    <span className="text-green-300">{imageItem.image_info.modelo}</span>
                                  </div>
                                </div>

                                {/* Prompt Section */}
                                {!selectedScript.video_id ? (
                                  // Roteiro SEM vídeo - permite editar e regenerar
                                  <>
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-300">
                                          Editar Prompt:
                                        </label>
                                        <textarea
                                          value={editingImagePrompt.prompt}
                                          onChange={(e) => setEditingImagePrompt({ ...editingImagePrompt, prompt: e.target.value })}
                                          className="w-full px-3 py-2 bg-black/50 border border-green-600 rounded-lg text-white text-xs resize-none"
                                          rows={4}
                                          placeholder="Digite o novo prompt..."
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              handleRegenerateImage(
                                                selectedScript.id,
                                                imageItem.index,
                                                { ...imageItem.image_info, prompt: editingImagePrompt.prompt }
                                              );
                                            }}
                                            disabled={isRegenerating}
                                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                                          >
                                            {isRegenerating ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Gerando...
                                              </>
                                            ) : (
                                              <>
                                                <Download className="w-3 h-3" />
                                                Gerar Novamente
                                              </>
                                            )}
                                          </button>
                                          <button
                                            onClick={() => setEditingImagePrompt(null)}
                                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-400 line-clamp-2">
                                          {imageItem.image_info.prompt}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingImagePrompt({
                                              id_roteiro: selectedScript.id,
                                              index: imageItem.index,
                                              prompt: imageItem.image_info.prompt
                                            });
                                          }}
                                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          Editar e Regenerar
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // Roteiro COM vídeo - apenas visualização colapsada
                                  <div className="text-xs text-gray-500 line-clamp-2 italic">
                                    {imageItem.image_info.prompt}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Info */}
                {selectedScript.video_id && (
                  <div className="bg-black/40 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center">
                      <Video className="w-5 h-5 mr-2 text-green-400" />
                      Informações do Vídeo
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Status</div>
                        <div className="text-white">{selectedScript.video_status || 'Não definido'}</div>
                      </div>
                    </div>
                    {selectedScript.video_path && (
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => setVideoPlayer({ url: selectedScript.video_path!, title: selectedScript.titulo || 'Vídeo' })}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span>Assistir Vídeo</span>
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(selectedScript.video_path!);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              const sanitizedTitle = (selectedScript.titulo || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                              a.download = `${sanitizedTitle}.mp4`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Erro ao baixar vídeo:', error);
                              alert('Erro ao baixar vídeo. Tente novamente.');
                            }
                          }}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>Baixar Vídeo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Transcription */}
                {selectedScript.transcricao_timestamp && (
                  <div className="bg-black/40 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-yellow-400" />
                      Transcrição com Timestamps
                    </h3>
                    <div className="text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar text-sm font-mono">
                      {selectedScript.transcricao_timestamp}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage?.url || ''}
        imageAlt={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />

      {/* Video Player */}
      <VideoPlayer
        isOpen={!!videoPlayer}
        videoUrl={videoPlayer?.url || ''}
        videoTitle={videoPlayer?.title}
        onClose={() => setVideoPlayer(null)}
      />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmar Exclusão</h2>
            </div>

            <p className="text-gray-300 mb-2">
              Tem certeza que deseja excluir o roteiro:
            </p>
            <p className="text-white font-semibold mb-6">
              "{confirmDelete.title}"
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                disabled={deletingScript !== null}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteScript(confirmDelete.id)}
                disabled={deletingScript !== null}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {deletingScript === confirmDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 border border-green-500">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 100, 100, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(120, 120, 120, 0.7);
        }
      `}</style>
    </div>
  );
}
