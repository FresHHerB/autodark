import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Play, Clock, Eye, Check, AlertCircle, Users, Video as VideoIcon, Plus, ChevronDown, Minus } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import VideoCard from '../components/VideoCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import { useChannelSearch, useChannelVideos } from '../hooks/useYouTube';
import { YouTubeVideo, YouTubeChannel } from '../services/youtube';
import { supabase, Canal } from '../lib/supabase';

export default function CloneChannelPage() {
  const navigate = useNavigate();
  const [channelUrl, setChannelUrl] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'recent' | 'views'>('recent');
  const [maxVideos, setMaxVideos] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [lastAction, setLastAction] = useState<'collect' | 'transcribe' | null>(null);

  // Canal management states
  const [canais, setCanais] = useState<Canal[]>([]);
  const [selectedCanalId, setSelectedCanalId] = useState<string>('');
  const [newCanalName, setNewCanalName] = useState('');
  const [isCreatingCanal, setIsCreatingCanal] = useState(false);
  const [loadingCanais, setLoadingCanais] = useState(true);

  // YouTube API hooks
  const { 
    data: channelData, 
    loading: channelLoading, 
    error: channelError, 
    searchChannel 
  } = useChannelSearch();
  
  const { 
    videos, 
    loading: videosLoading, 
    error: videosError, 
    hasMore,
    fetchVideos, 
    loadMore,
    reset: resetVideos 
  } = useChannelVideos();

  // Load canais on component mount
  useEffect(() => {
    loadCanais();
  }, []);

  // Auto-select or suggest canal when channel data is loaded
  useEffect(() => {
    if (channelData && canais.length > 0) {
      const existingCanal = canais.find(canal => 
        canal.nome_canal.toLowerCase() === channelData.name.toLowerCase()
      );
      
      if (existingCanal) {
        setSelectedCanalId(existingCanal.id.toString());
        setNewCanalName('');
      } else {
        setSelectedCanalId('');
        setNewCanalName(channelData.name);
      }
    }
  }, [channelData, canais]);

  const loadCanais = async () => {
    try {
      setLoadingCanais(true);
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('nome_canal', { ascending: true });

      if (error) throw error;
      setCanais(data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    } finally {
      setLoadingCanais(false);
    }
  };

  const handleSearch = async () => {
    if (!channelUrl.trim()) return;
    
    try {
      // Reset previous data
      resetVideos();
      setSelectedVideos(new Set());
      
      // Search for channel
      const channel = await searchChannel(channelUrl);
      
      // Fetch channel videos
      if (channel) {
        await fetchVideos(channel.uploadsPlaylistId, maxVideos);
      }
    } catch (error) {
      console.error('Error searching channel:', error);
    }
  };

  const handleVideoSelect = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const handleRemoveSelectedVideo = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    newSelected.delete(videoId);
    setSelectedVideos(newSelected);
  };

  const handleLoadMore = () => {
    if (channelData && hasMore) {
      loadMore(channelData.uploadsPlaylistId, 50);
    }
  };

  const handleSelectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map(v => v.id)));
    }
  };

  const handleCreateCanal = async () => {
    if (!newCanalName.trim()) return;
    
    setIsCreatingCanal(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const webhookPath = import.meta.env.VITE_WEBHOOK_CLONE_CHANNEL;
      const webhookUrl = `${apiBaseUrl}${webhookPath}`;
      
      // Call webhook to create canal
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_canal: newCanalName.trim(),
          tipo_treino: 'criar_canal'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const result = await response.json();
      console.log('Canal criado via webhook:', result);

      // Update canais list and select the new canal
      await loadCanais();
      
      // Find the newly created canal and select it
      const updatedCanais = await supabase
        .from('canais')
        .select('*')
        .eq('nome_canal', newCanalName.trim())
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (updatedCanais.data && updatedCanais.data.length > 0) {
        setSelectedCanalId(updatedCanais.data[0].id.toString());
      }
      
      setNewCanalName('');
    } catch (error) {
      console.error('Erro ao criar canal:', error);
      alert(`Erro ao criar canal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsCreatingCanal(false);
    }
  };

  const handleCollectTitles = async () => {
    if (!selectedCanalId || selectedVideos.size === 0) return;
    
    setIsProcessing(true);
    setProcessingComplete(false);
    setLastAction('collect');
    
    try {
      const selectedCanal = canais.find(c => c.id.toString() === selectedCanalId);
      if (!selectedCanal) throw new Error('Canal não encontrado');

      // Get selected video titles
      const selectedVideoTitles = Array.from(selectedVideos).map(videoId => {
        const video = videos.find(v => v.id === videoId);
        return video?.title || 'Título não encontrado';
      });
      
      console.log('Coletando títulos:', {
        nome_canal: selectedCanal.nome_canal,
        titulos: selectedVideoTitles,
        tipo_treino: 'treinar_titulo'
      });
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const webhookPath = import.meta.env.VITE_WEBHOOK_TREINAR_CANAL;
      const webhookUrl = `${apiBaseUrl}${webhookPath}`;
      
      // Call the webhook API
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_canal: selectedCanal.nome_canal,
          titulos: selectedVideoTitles,
          tipo_treino: 'treinar_titulo'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const result = await response.json();
      console.log('Webhook response:', result);
      
      setIsProcessing(false);
      setProcessingComplete(true);
    } catch (error) {
      console.error('Error collecting titles:', error);
      setIsProcessing(false);
      alert(`Erro ao coletar títulos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleTranscribeVideos = async () => {
    if (!selectedCanalId || selectedVideos.size === 0) return;
    
    setIsProcessing(true);
    setProcessingComplete(false);
    setLastAction('transcribe');
    
    try {
      const selectedCanal = canais.find(c => c.id.toString() === selectedCanalId);
      if (!selectedCanal) throw new Error('Canal não encontrado');

      // Get selected video links
      const selectedVideoLinks = Array.from(selectedVideos).map(videoId => {
        return `https://www.youtube.com/watch?v=${videoId}`;
      });
      
      console.log('Transcrevendo vídeos:', {
        nome_canal: selectedCanal.nome_canal,
        videos: selectedVideoLinks,
        tipo_treino: 'treinar_roteiro'
      });
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const webhookPath = import.meta.env.VITE_WEBHOOK_TREINAR_CANAL;
      const webhookUrl = `${apiBaseUrl}${webhookPath}`;
      
      // Call the webhook API
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_canal: selectedCanal.nome_canal,
          videos: selectedVideoLinks,
          tipo_treino: 'treinar_roteiro'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const result = await response.json();
      console.log('Webhook response:', result);
      
      setIsProcessing(false);
      setProcessingComplete(true);
    } catch (error) {
      console.error('Error transcribing videos:', error);
      setIsProcessing(false);
      alert(`Erro ao transcrever vídeos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    } else {
      return parseInt(b.views.replace(/[^\d]/g, '')) - parseInt(a.views.replace(/[^\d]/g, ''));
    }
  });

  const selectedVideosList = Array.from(selectedVideos).map(videoId => {
    return videos.find(v => v.id === videoId);
  }).filter(Boolean);

  const isSearching = channelLoading || videosLoading;
  const hasSearched = !!channelData;

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-light text-white">Clonar Canal</h1>
            <p className="text-gray-400 text-sm">
              Analise e replique a estrutura de canais existentes
            </p>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-light text-white mb-4">
            1. Listar Vídeos do Canal
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                URL do Canal do YouTube:
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://www.youtube.com/@NomeDoCanal ou https://www.youtube.com/channel/UC..."
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 focus:outline-none focus:border-gray-600 transition-colors"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !channelUrl.trim()}
                  className="bg-white text-black px-6 py-3 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {(channelError || videosError) && (
              <div className="bg-red-900/20 border border-red-500/30 p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 text-sm">{channelError || videosError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Máx. Vídeos:
                </label>
                <div className="flex items-center bg-gray-800 border border-gray-700">
                  <button
                    onClick={() => setMaxVideos(Math.max(1, maxVideos - 1))}
                    className="px-3 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={maxVideos}
                    onChange={(e) => setMaxVideos(parseInt(e.target.value) || 1)}
                    className="flex-1 bg-transparent text-white text-center py-3 focus:outline-none"
                    min="1"
                    max="100"
                  />
                  <button
                    onClick={() => setMaxVideos(Math.min(100, maxVideos + 1))}
                    className="px-3 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Ordenar Por:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'views')}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="views">Mais Vistos</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Filtrar Por Tipo:
                </label>
                <select className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600">
                  <option value="all">Todos</option>
                  <option value="shorts">Shorts</option>
                  <option value="long">Vídeos Longos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center">
            <LoadingSpinner />
            <p className="text-gray-400 mt-4">Buscando vídeos do canal...</p>
          </div>
        )}

        {/* Channel Info */}
        {channelData && (
          <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
            <h3 className="text-lg font-light text-white mb-4">Informações do Canal</h3>
            <div className="bg-gray-800 border border-gray-700 p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="text-white font-medium text-lg mb-2">{channelData.name}</h4>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{channelData.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="w-4 h-4" />
                      {channelData.subscriberCount} inscritos
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <VideoIcon className="w-4 h-4" />
                      {channelData.videoCount} vídeos
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {hasSearched && !isSearching && (
          <div className="flex gap-8">
            {/* Videos List */}
            <div className="flex-1">
              <div className="bg-gray-900 border border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-light text-white">
                    Vídeos Encontrados: {videos.length}
                  </h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {selectedVideos.size === videos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {sortedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isSelected={selectedVideos.has(video.id)}
                      onSelect={() => handleVideoSelect(video.id)}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && !videosLoading && (
                  <div className="mt-6 text-center">
                    <button onClick={handleLoadMore} className="bg-gray-800 text-white px-6 py-3 hover:bg-gray-700 transition-colors">
                      Carregar Mais Vídeos
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Panel */}
            <div className="w-80 space-y-6">
              {/* Canal Selection */}
              <div className="bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-light text-white mb-4">
                  2. Selecionar Canal
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Canal Existente:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCanalId}
                        onChange={(e) => setSelectedCanalId(e.target.value)}
                        disabled={loadingCanais}
                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 focus:outline-none focus:border-gray-600 appearance-none"
                      >
                        <option value="">Selecione um canal...</option>
                        {canais.map((canal) => (
                          <option key={canal.id} value={canal.id.toString()}>
                            {canal.nome_canal}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Criar Novo Canal:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCanalName}
                        onChange={(e) => setNewCanalName(e.target.value)}
                        placeholder="Nome do novo canal"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600"
                      />
                      <button
                        onClick={handleCreateCanal}
                        disabled={!newCanalName.trim() || isCreatingCanal}
                        className="bg-blue-600 text-white px-4 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isCreatingCanal ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training Actions */}
              <div className="bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-light text-white mb-4">
                  3. Ações de Treinamento
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-4">
                      {selectedVideos.size} vídeo{selectedVideos.size !== 1 ? 's' : ''} selecionado{selectedVideos.size !== 1 ? 's' : ''}
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={handleCollectTitles}
                        disabled={selectedVideos.size === 0 || !selectedCanalId || isProcessing}
                        className="w-full bg-yellow-600 text-white py-3 px-4 hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        📝 Coletar Títulos
                      </button>

                      <button
                        onClick={handleTranscribeVideos}
                        disabled={selectedVideos.size === 0 || !selectedCanalId || isProcessing}
                        className="w-full bg-white text-black py-3 px-4 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🎬 Transcrever - Treinar Roteiro
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Videos List */}
              {selectedVideosList.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 p-6">
                  <h4 className="text-white font-medium mb-4">
                    Vídeos Selecionados ({selectedVideosList.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedVideosList.map((video) => (
                      <div key={video.id} className="bg-gray-800 border border-gray-700 p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium line-clamp-2">
                            {video.title}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveSelectedVideo(video.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title="Remover vídeo"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="bg-gray-900 border border-yellow-500 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <LoadingSpinner size="sm" />
                    <h4 className="text-white font-medium">Processando...</h4>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {lastAction === 'collect' 
                      ? 'Enviando títulos para treinamento. Aguardando resposta do servidor...' 
                      : 'Enviando vídeos para transcrição e treinamento. Aguardando resposta do servidor...'
                    } 
                    Por favor, aguarde.
                  </p>
                </div>
              )}

              {/* Success Status */}
              {processingComplete && !isProcessing && (
                <div className="bg-gray-900 border border-green-500 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium">Concluído com Sucesso!</h4>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {lastAction === 'collect' 
                      ? `Títulos coletados com sucesso! ${selectedVideos.size} título${selectedVideos.size !== 1 ? 's' : ''} enviado${selectedVideos.size !== 1 ? 's' : ''} para treinamento.`
                      : `Vídeos enviados para transcrição com sucesso! ${selectedVideos.size} vídeo${selectedVideos.size !== 1 ? 's' : ''} processado${selectedVideos.size !== 1 ? 's' : ''}.`
                    }
                  </p>
                  <button
                    onClick={() => setProcessingComplete(false)}
                    className="mt-3 text-green-400 hover:text-green-300 text-sm transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}