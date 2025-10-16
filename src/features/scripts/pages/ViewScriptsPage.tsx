import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@features/dashboard/components';
import { supabase } from '@shared/lib';
import { apiService } from '@shared/services';
import { FileText, Calendar, Mic, Image as ImageIcon, Video, X, Play, Download, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Loader2, RefreshCw } from 'lucide-react';
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
  created_at: string;
  audio_path: string | null;
  text_thumb: string | null;
  images_path: string[] | null;
  transcricao_timestamp: string | null;
  images_info: ImageInfo[] | null;
  video_id: number | null;
  video_status: string | null;
  video_path: string | null;
  data_publicar: string | null;
  thumb_path: string | null;
}

export default function ViewScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [channels, setChannels] = useState<{id: number, nome_canal: string}[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'with_audio' | 'with_images' | 'with_video'>('all');

  // Image regeneration states
  const [editingImagePrompt, setEditingImagePrompt] = useState<{id_roteiro: number, index: number, prompt: string} | null>(null);
  const [regeneratingImage, setRegeneratingImage] = useState<{id_roteiro: number, index: number} | null>(null);
  const [imageReloadTrigger, setImageReloadTrigger] = useState<{[key: string]: number}>({});

  // Lightbox and video player states
  const [lightboxImage, setLightboxImage] = useState<{url: string, alt: string} | null>(null);
  const [videoPlayer, setVideoPlayer] = useState<{url: string, title: string} | null>(null);

  useEffect(() => {
    loadChannels();
    loadScripts();
  }, []);

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('id, nome_canal')
        .order('nome_canal', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    }
  };

  const loadScripts = async () => {
    try {
      setLoading(true);

      const { data: scriptsData, error: scriptsError } = await supabase
        .from('roteiros')
        .select(`
          id,
          titulo,
          roteiro,
          canal_id,
          created_at,
          audio_path,
          text_thumb,
          images_path,
          transcricao_timestamp,
          images_info
        `)
        .order('created_at', { ascending: false });

      if (scriptsError) throw scriptsError;

      // Load channel names
      const { data: channelsData } = await supabase
        .from('canais')
        .select('id, nome_canal');

      // Load videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('id, status, video_path, data_publicar, thumb_path');

      const channelsMap = new Map(channelsData?.map(c => [c.id, c.nome_canal]) || []);
      const videosMap = new Map(videosData?.map(v => [v.id, v]) || []);

      const enrichedScripts: Script[] = (scriptsData || []).map(script => ({
        ...script,
        canal_nome: channelsMap.get(script.canal_id) || 'Desconhecido',
        video_id: videosMap.has(script.id) ? script.id : null,
        video_status: videosMap.get(script.id)?.status || null,
        video_path: videosMap.get(script.id)?.video_path || null,
        data_publicar: videosMap.get(script.id)?.data_publicar || null,
        thumb_path: videosMap.get(script.id)?.thumb_path || null,
      }));

      setScripts(enrichedScripts);
    } catch (error) {
      console.error('Erro ao carregar roteiros:', error);
      alert('Erro ao carregar roteiros. Verifique o console.');
    } finally {
      setLoading(false);
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

      alert(`Imagem ${index} regenerada com sucesso!`);
      setEditingImagePrompt(null);
    } catch (error) {
      console.error('Error regenerating image:', error);
      alert('Erro ao regenerar imagem. Tente novamente.');
    } finally {
      setRegeneratingImage(null);
    }
  };

  const filteredScripts = scripts.filter(script => {
    if (filterChannel && script.canal_id.toString() !== filterChannel) return false;

    if (filterStatus === 'with_audio' && !script.audio_path) return false;
    if (filterStatus === 'with_images' && (!script.images_path || script.images_path.length === 0)) return false;
    if (filterStatus === 'with_video' && !script.video_id) return false;

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

  const getStatusBadge = (script: Script) => {
    if (script.video_id) {
      const statusMap: {[key: string]: {color: string, icon: any, text: string}} = {
        'publicado': { color: 'green', icon: CheckCircle, text: 'Publicado' },
        'agendado': { color: 'blue', icon: Clock, text: 'Agendado' },
        'processando': { color: 'yellow', icon: AlertCircle, text: 'Processando' },
        'erro': { color: 'red', icon: XCircle, text: 'Erro' },
      };

      const status = statusMap[script.video_status || 'processando'] || statusMap['processando'];
      const Icon = status.icon;

      return (
        <span className={`flex items-center space-x-1 px-2 py-1 bg-${status.color}-500/20 text-${status.color}-200 text-xs rounded-full`}>
          <Icon className="w-3 h-3" />
          <span>{status.text}</span>
        </span>
      );
    }

    if (script.images_path && script.images_path.length > 0) {
      return (
        <span className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded-full">
          <ImageIcon className="w-3 h-3" />
          <span>Com Imagens</span>
        </span>
      );
    }

    if (script.audio_path) {
      return (
        <span className="flex items-center space-x-1 px-2 py-1 bg-indigo-500/20 text-indigo-200 text-xs rounded-full">
          <Mic className="w-3 h-3" />
          <span>Com Áudio</span>
        </span>
      );
    }

    return (
      <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader />

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Visualizar Roteiros</h1>
          <p className="text-gray-400">Gerencie e visualize todos os roteiros criados</p>
        </div>

        {/* Filters */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filtrar por Canal
              </label>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Canais</option>
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id.toString()}>
                    {channel.nome_canal}
                  </option>
                ))}
              </select>
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
                <option value="with_audio">Com Áudio</option>
                <option value="with_images">Com Imagens</option>
                <option value="with_video">Com Vídeo</option>
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
            {channelNames.map(channelName => (
              <div key={channelName}>
                {/* Channel Header */}
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <div className="w-1 h-6 bg-blue-500 rounded-full mr-3"></div>
                      {channelName}
                    </h2>
                    <p className="text-gray-400 text-sm ml-6 mt-1">
                      {scriptsByChannel[channelName].length} {scriptsByChannel[channelName].length === 1 ? 'roteiro' : 'roteiros'}
                    </p>
                  </div>
                </div>

                {/* Scripts Grid for this Channel */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {scriptsByChannel[channelName].map(script => (
                    <div
                      key={script.id}
                      onClick={() => setSelectedScript(script)}
                      className="bg-black/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
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
                    <FileText className="w-16 h-16 text-gray-600" />
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold mb-1 line-clamp-2">
                        {script.titulo || 'Sem título'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {script.canal_nome}
                      </p>
                    </div>
                    {getStatusBadge(script)}
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {script.roteiro}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {script.audio_path && (
                      <span className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded">
                        <Mic className="w-3 h-3" />
                        <span>Áudio</span>
                      </span>
                    )}
                    {script.images_path && script.images_path.length > 0 && (
                      <span className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded">
                        <ImageIcon className="w-3 h-3" />
                        <span>{script.images_path.length} imgs</span>
                      </span>
                    )}
                    {script.video_id && (
                      <span className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-200 text-xs rounded">
                        <Video className="w-3 h-3" />
                        <span>Vídeo</span>
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(script.created_at)}</span>
                    </div>
                    <span className="text-gray-600">ID: {script.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
        </div>
      )}

        {/* Modal */}
        {selectedScript && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedScript(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-start justify-between z-10">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-2xl font-bold text-white mb-2 line-clamp-2">
                    {selectedScript.titulo || 'Sem título'}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">{selectedScript.canal_nome}</span>
                    {getStatusBadge(selectedScript)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScript(null)}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                </div>

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
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-purple-400" />
                    Roteiro Completo
                  </h3>
                  <div className="text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                    {selectedScript.roteiro}
                  </div>
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
                {selectedScript.images_info && selectedScript.images_info.length > 0 && !selectedScript.video_id && (
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
                              <div className="aspect-video relative group cursor-pointer" onClick={() => setLightboxImage({ url: imageItem.image_url, alt: `Imagem ${imageItem.index} - ${selectedScript.titulo}` })}>
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

                                {/* Prompt Editor */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Status</div>
                        <div className="text-white">{selectedScript.video_status || 'Não definido'}</div>
                      </div>
                      {selectedScript.data_publicar && (
                        <div>
                          <div className="text-gray-400 text-sm mb-1">Data de Publicação</div>
                          <div className="text-white">{formatDate(selectedScript.data_publicar)}</div>
                        </div>
                      )}
                    </div>
                    {selectedScript.video_path && (
                      <div className="mt-4">
                        <button
                          onClick={() => setVideoPlayer({ url: selectedScript.video_path!, title: selectedScript.titulo || 'Vídeo' })}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span>Assistir Vídeo</span>
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
