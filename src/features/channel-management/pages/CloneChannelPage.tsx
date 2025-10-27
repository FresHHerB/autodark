import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Check, AlertCircle, Users, Video as VideoIcon, Plus, ChevronDown, Minus } from 'lucide-react';
import { DashboardHeader } from '@features/dashboard/components';
import { VideoCard } from '@features/channel-management/components';
import { LoadingSpinner } from '@shared/components/ui';
import { useChannelSearch, useChannelVideos } from '@features/channel-management/hooks';
import { supabase, Canal } from '@shared/lib';

interface ScriptData {
  title: string;
  thumbText: string;
  text: string;
}

export default function CloneChannelPage() {
  const navigate = useNavigate();

  // Mode toggle
  const [cloneMode, setCloneMode] = useState<'youtube' | 'manual'>('youtube');

  // YouTube clone states
  const [channelUrl, setChannelUrl] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'recent' | 'views'>('recent');
  const [maxVideos, setMaxVideos] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [lastAction, setLastAction] = useState<'collect' | 'transcribe' | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Manual clone states
  const [scripts, setScripts] = useState<ScriptData[]>([
    { title: '', thumbText: '', text: '' }
  ]);
  const [isTraining, setIsTraining] = useState(false);
  const [draggedOver, setDraggedOver] = useState<number | null>(null);
  const [trainingSuccessMessage, setTrainingSuccessMessage] = useState<string>('');

  // Canal management states
  const [canais, setCanais] = useState<Canal[]>([]);
  const [selectedCanalId, setSelectedCanalId] = useState<string>('');
  const [newCanalName, setNewCanalName] = useState('');
  const [isCreatingCanal, setIsCreatingCanal] = useState(false);
  const [loadingCanais, setLoadingCanais] = useState(true);
  const [showYoutubeChannelDropdown, setShowYoutubeChannelDropdown] = useState(false);
  const [showManualChannelDropdown, setShowManualChannelDropdown] = useState(false);

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
          tipo_treino: 'criar_canal',
          link_canal: channelUrl
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
      
      // Show success message for 5 seconds
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
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
      const webhookPath = import.meta.env.VITE_WEBHOOK_CLONE_CHANNEL;
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
      const webhookPath = import.meta.env.VITE_WEBHOOK_CLONE_CHANNEL;
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

  // Manual clone handlers
  const addScript = () => {
    setScripts(prev => [...prev, { title: '', thumbText: '', text: '' }]);
  };

  const removeScript = (index: number) => {
    if (scripts.length <= 1) return;
    setScripts(prev => prev.filter((_, i) => i !== index));
  };

  const updateScript = (index: number, data: Partial<ScriptData>) => {
    setScripts(prev => prev.map((script, i) =>
      i === index ? { ...script, ...data } : script
    ));
  };

  const handleFileUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      updateScript(index, {
        text: content,
        title: fileName // Auto-fill title with filename
      });
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOver(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOver(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        handleFileUpload(index, file);
      } else {
        alert('Apenas arquivos .txt e .md são suportados.');
      }
    }
  };

  const handleManualTraining = async () => {
    if (!selectedCanalId) {
      alert('Selecione ou crie um canal primeiro');
      return;
    }

    const hasValidScript = scripts.some(script => script.text.trim().length > 0);
    if (!hasValidScript) {
      alert('Pelo menos um roteiro deve ter conteúdo');
      return;
    }

    setIsTraining(true);

    try {
      const selectedCanal = canais.find(c => c.id.toString() === selectedCanalId);
      if (!selectedCanal) throw new Error('Canal não encontrado');

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const webhookPath = import.meta.env.VITE_WEBHOOK_CLONE_CHANNEL;
      const webhookUrl = `${apiBaseUrl}${webhookPath}`;

      const payload = {
        nome_canal: selectedCanal.nome_canal,
        tipo_treino: 'clonar_manual',
        roteiros: scripts
          .filter(script => script.text.trim())
          .map((script, index) => ({
            title: script.title || `Roteiro ${index + 1}`,
            text_thumb: script.thumbText || '',
            roteiro: script.text
          }))
      };

      console.log('Enviando treinamento manual:', payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const result = await response.json();
      console.log('Treinamento concluído:', result);

      // Show success toast
      setTrainingSuccessMessage(`Canal "${selectedCanal.nome_canal}" Treinado com sucesso!`);
      setTimeout(() => {
        setTrainingSuccessMessage('');
      }, 5000);

      // Reset form
      setScripts([{ title: '', thumbText: '', text: '' }]);
    } catch (error) {
      console.error('Erro no treinamento:', error);
      alert(`Erro ao treinar canal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsTraining(false);
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

      {/* Toast Success Message */}
      {trainingSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fade-in">
          <div className="bg-green-900/90 border border-green-500 p-4 rounded-lg shadow-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <p className="text-green-300 font-medium">{trainingSuccessMessage}</p>
          </div>
        </div>
      )}

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

        {/* Mode Toggle */}
        <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCloneMode('youtube')}
              className={`px-6 py-3 font-medium transition-all ${
                cloneMode === 'youtube'
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Clonar Canal Youtube
            </button>
            <button
              onClick={() => setCloneMode('manual')}
              className={`px-6 py-3 font-medium transition-all ${
                cloneMode === 'manual'
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Clonar Manualmente
            </button>
          </div>
        </div>

        {/* YouTube Clone Mode */}
        {cloneMode === 'youtube' && (
          <>
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
                      <button
                        onClick={() => setShowYoutubeChannelDropdown(!showYoutubeChannelDropdown)}
                        disabled={loadingCanais}
                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 flex items-center justify-between hover:border-gray-600 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          {selectedCanalId ? (
                            (() => {
                              const selectedCanal = canais.find(c => c.id.toString() === selectedCanalId);
                              return selectedCanal ? (
                                <>
                                  {selectedCanal.profile_image ? (
                                    <img
                                      src={selectedCanal.profile_image}
                                      alt={selectedCanal.nome_canal}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                      {selectedCanal.nome_canal.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span>{selectedCanal.nome_canal}</span>
                                </>
                              ) : (
                                <span>Selecione um canal...</span>
                              );
                            })()
                          ) : (
                            <span className="text-gray-400">Selecione um canal...</span>
                          )}
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showYoutubeChannelDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showYoutubeChannelDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                          <button
                            onClick={() => {
                              setSelectedCanalId('');
                              setShowYoutubeChannelDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-300"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-xs">✕</span>
                            </div>
                            <span>Nenhum canal</span>
                          </button>
                          {canais.map((canal) => (
                            <button
                              key={canal.id}
                              onClick={() => {
                                setSelectedCanalId(canal.id.toString());
                                setShowYoutubeChannelDropdown(false);
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                                selectedCanalId === canal.id.toString() ? 'bg-gray-700/50 text-white' : 'text-gray-300'
                              }`}
                            >
                              {canal.profile_image ? (
                                <img
                                  src={canal.profile_image}
                                  alt={canal.nome_canal}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                  {canal.nome_canal.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span>{canal.nome_canal}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
                  
                  {/* Success Message */}
                  {showSuccessMessage && (
                    <div className="bg-green-900/20 border border-green-500/30 p-3 text-green-300 text-sm text-center">
                      Canal criado com sucesso!
                    </div>
                  )}
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
          </>
        )}

        {/* Manual Clone Mode */}
        {cloneMode === 'manual' && (
          <>
            {/* Canal Selection */}
            <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
              <h2 className="text-lg font-light text-white mb-4">
                1. Selecionar ou Criar Canal
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Canal Existente:
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowManualChannelDropdown(!showManualChannelDropdown)}
                      disabled={loadingCanais}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 flex items-center justify-between hover:border-gray-600 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        {selectedCanalId ? (
                          (() => {
                            const selectedCanal = canais.find(c => c.id.toString() === selectedCanalId);
                            return selectedCanal ? (
                              <>
                                {selectedCanal.profile_image ? (
                                  <img
                                    src={selectedCanal.profile_image}
                                    alt={selectedCanal.nome_canal}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                    {selectedCanal.nome_canal.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span>{selectedCanal.nome_canal}</span>
                              </>
                            ) : (
                              <span>Selecione um canal...</span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400">Selecione um canal...</span>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showManualChannelDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showManualChannelDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedCanalId('');
                            setShowManualChannelDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-300"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-xs">✕</span>
                          </div>
                          <span>Nenhum canal</span>
                        </button>
                        {canais.map((canal) => (
                          <button
                            key={canal.id}
                            onClick={() => {
                              setSelectedCanalId(canal.id.toString());
                              setShowManualChannelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                              selectedCanalId === canal.id.toString() ? 'bg-gray-700/50 text-white' : 'text-gray-300'
                            }`}
                          >
                            {canal.profile_image ? (
                              <img
                                src={canal.profile_image}
                                alt={canal.nome_canal}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                {canal.nome_canal.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{canal.nome_canal}</span>
                          </button>
                        ))}
                      </div>
                    )}
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

                {showSuccessMessage && (
                  <div className="bg-green-900/20 border border-green-500/30 p-3 text-green-300 text-sm text-center">
                    Canal criado com sucesso!
                  </div>
                )}
              </div>
            </div>

            {/* Scripts Section */}
            <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-light text-white">
                  2. Roteiros de Exemplo
                </h2>
                <button
                  onClick={addScript}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Roteiro
                </button>
              </div>

              <div className="space-y-6">
                {scripts.map((script, index) => (
                  <div key={index} className="bg-gray-800 border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium">Roteiro {index + 1}</h3>
                      {scripts.length > 1 && (
                        <button
                          onClick={() => removeScript(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">
                          Título:
                        </label>
                        <input
                          type="text"
                          value={script.title}
                          onChange={(e) => updateScript(index, { title: e.target.value })}
                          placeholder="Título do roteiro..."
                          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 focus:outline-none focus:border-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">
                          Texto da Thumb:
                        </label>
                        <input
                          type="text"
                          value={script.thumbText}
                          onChange={(e) => updateScript(index, { thumbText: e.target.value })}
                          placeholder="Texto que aparece na thumbnail..."
                          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 focus:outline-none focus:border-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">
                          Conteúdo do Roteiro:
                        </label>
                        <div
                          className={`relative ${
                            draggedOver === index
                              ? 'ring-2 ring-blue-500 ring-opacity-50'
                              : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          <textarea
                            value={script.text}
                            onChange={(e) => updateScript(index, { text: e.target.value })}
                            rows={8}
                            placeholder="Digite, cole ou arraste um arquivo .txt/.md aqui..."
                            className={`w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 focus:outline-none focus:border-gray-500 resize-none ${
                              draggedOver === index
                                ? 'border-blue-500 bg-blue-900/10'
                                : ''
                            }`}
                          />
                          {draggedOver === index && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500 rounded pointer-events-none">
                              <div className="text-blue-400 text-center">
                                <Plus className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-medium">Solte o arquivo aqui</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-400">
                            {script.text.length.toLocaleString()} caracteres
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">
                              Arraste arquivos .txt/.md aqui
                            </span>
                            <input
                              type="file"
                              accept=".txt,.md"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(index, file);
                              }}
                              className="hidden"
                              id={`file-upload-${index}`}
                            />
                            <label
                              htmlFor={`file-upload-${index}`}
                              className="cursor-pointer text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>ou clique aqui</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-gray-900 border border-gray-800 p-6">
              <button
                onClick={handleManualTraining}
                disabled={isTraining || !selectedCanalId}
                className={`w-full py-4 px-6 font-medium transition-all ${
                  isTraining || !selectedCanalId
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isTraining ? 'Treinando Canal...' : 'Treinar Canal'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}