import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Calendar, Clock, Send, Eye, Play } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

interface ApprovedVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  approvedAt: string;
  idea: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  approvedVideos: ApprovedVideo[];
}

const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'ToonshineStudio',
    description: 'Canal de histórias infantis animadas',
    approvedVideos: [
      {
        id: '2',
        title: 'A Verdade Sobre Brinquedos Educativos Que Ninguém Te Conta',
        thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '7:45',
        approvedAt: '2024-01-19T14:15:00Z',
        idea: 'Brinquedos educativos para crianças'
      },
      {
        id: '7',
        title: 'Como Ensinar Cores Para Crianças - Método Divertido!',
        thumbnail: 'https://images.pexels.com/photos/1648377/pexels-photo-1648377.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '6:20',
        approvedAt: '2024-01-18T10:30:00Z',
        idea: 'Ensinar cores para crianças'
      },
      {
        id: '8',
        title: 'Histórias de Princesas Modernas - Valores Importantes',
        thumbnail: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '9:15',
        approvedAt: '2024-01-17T16:45:00Z',
        idea: 'Histórias de princesas com valores modernos'
      }
    ]
  },
  {
    id: '2',
    name: 'TechReviewBR',
    description: 'Reviews de tecnologia em português',
    approvedVideos: [
      {
        id: '5',
        title: 'MacBook Air M3 - ANÁLISE COMPLETA após 30 dias de uso',
        thumbnail: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '15:20',
        approvedAt: '2024-01-19T11:30:00Z',
        idea: 'Review MacBook Air M3'
      },
      {
        id: '9',
        title: 'Galaxy S24 Ultra vs iPhone 15 Pro Max - COMPARATIVO ÉPICO',
        thumbnail: 'https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '18:45',
        approvedAt: '2024-01-16T14:20:00Z',
        idea: 'Comparativo Galaxy S24 vs iPhone 15'
      }
    ]
  },
  {
    id: '3',
    name: 'CookingMaster',
    description: 'Receitas rápidas e fáceis',
    approvedVideos: [
      {
        id: '10',
        title: 'Lasanha de Berinjela SEM MASSA - Receita Fit e Deliciosa!',
        thumbnail: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '12:30',
        approvedAt: '2024-01-15T09:15:00Z',
        idea: 'Lasanha de berinjela fit'
      }
    ]
  }
];

export default function PublishSchedulePage() {
  const navigate = useNavigate();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const selectedChannel = mockChannels.find(c => c.id === selectedChannelId);
  const selectedVideo = selectedChannel?.approvedVideos.find(v => v.id === selectedVideoId);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedVideoId('');
    setScheduleDate('');
    setScheduleTime('');
  };

  const handlePublishNow = async () => {
    if (!selectedVideo) return;
    
    setIsPublishing(true);
    
    // Simular publicação
    setTimeout(() => {
      setIsPublishing(false);
      alert(`Vídeo "${selectedVideo.title}" publicado com sucesso!`);
    }, 3000);
  };

  const handleSchedule = async () => {
    if (!selectedVideo || !scheduleDate || !scheduleTime) return;
    
    setIsScheduling(true);
    
    // Simular agendamento
    setTimeout(() => {
      setIsScheduling(false);
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      alert(`Vídeo "${selectedVideo.title}" agendado para ${scheduledDateTime.toLocaleString('pt-BR')}!`);
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isScheduleValid = scheduleDate && scheduleTime;

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
            <h1 className="text-2xl font-light text-white">Publicar/Agendar</h1>
            <p className="text-gray-400 text-sm">
              Publique imediatamente ou agende seus vídeos aprovados
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
              value={selectedChannelId}
              onChange={(e) => handleChannelSelect(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 focus:outline-none focus:border-gray-600 appearance-none"
            >
              <option value="">Selecione um canal...</option>
              {mockChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} ({channel.approvedVideos.length} vídeos aprovados)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          {selectedChannel && (
            <div className="mt-4 p-4 bg-gray-800 border border-gray-700">
              <h3 className="text-white font-medium mb-1">{selectedChannel.name}</h3>
              <p className="text-gray-400 text-sm">{selectedChannel.description}</p>
            </div>
          )}
        </div>

        {/* Videos Section */}
        {selectedChannel && (
          <div className="space-y-8">
            {/* Video Selector */}
            <div className="bg-gray-900 border border-gray-800 p-6">
              <h3 className="text-lg font-light text-white mb-4">
                Vídeos Aprovados ({selectedChannel.approvedVideos.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedChannel.approvedVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideoId(video.id)}
                    className={`
                      group cursor-pointer bg-gray-800 border transition-all duration-200
                      ${selectedVideoId === video.id 
                        ? 'border-white shadow-lg shadow-white/10' 
                        : 'border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    {/* Selection Indicator */}
                    <div className={`
                      absolute top-2 right-2 z-10 w-5 h-5 border-2 flex items-center justify-center transition-all
                      ${selectedVideoId === video.id 
                        ? 'bg-white border-white' 
                        : 'border-gray-500 group-hover:border-gray-400'
                      }
                    `}>
                      {selectedVideoId === video.id && <div className="w-2 h-2 bg-black rounded-full"></div>}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-700 overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 p-3 rounded-full">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {video.duration}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h4 className="text-white text-xs font-medium leading-tight mb-2 line-clamp-2">
                        {video.title}
                      </h4>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        Aprovado em {formatDate(video.approvedAt)}
                      </div>

                      <div className="text-xs text-gray-400 line-clamp-1">
                        Ideia: {video.idea}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Publishing Options */}
            {selectedVideo && (
              <div className="bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-light text-white mb-6">
                  Opções de Publicação
                </h3>

                {/* Selected Video Preview */}
                <div className="bg-gray-800 border border-gray-700 p-4 mb-6">
                  <h4 className="text-white font-medium mb-2">Vídeo Selecionado:</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-12 bg-gray-700 rounded overflow-hidden">
                      <img
                        src={selectedVideo.thumbnail}
                        alt={selectedVideo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium line-clamp-1">
                        {selectedVideo.title}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Duração: {selectedVideo.duration}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Publish Now */}
                  <div className="bg-gray-800 border border-gray-700 p-6">
                    <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Publicar Agora
                    </h4>
                    <p className="text-gray-400 text-sm mb-6">
                      O vídeo será publicado imediatamente no canal selecionado.
                    </p>
                    <button
                      onClick={handlePublishNow}
                      disabled={isPublishing}
                      className="w-full bg-red-600 text-white py-3 px-4 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isPublishing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Publicando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Publicar Agora
                        </>
                      )}
                    </button>
                  </div>

                  {/* Schedule */}
                  <div className="bg-gray-800 border border-gray-700 p-6">
                    <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Agendar Publicação
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">
                          Data:
                        </label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:outline-none focus:border-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">
                          Horário:
                        </label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:outline-none focus:border-gray-500"
                        />
                      </div>

                      <button
                        onClick={handleSchedule}
                        disabled={!isScheduleValid || isScheduling}
                        className="w-full bg-blue-600 text-white py-3 px-4 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isScheduling ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Agendando...
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            Agendar
                          </>
                        )}
                      </button>

                      {isScheduleValid && (
                        <div className="bg-gray-700 border border-gray-600 p-3 text-center">
                          <p className="text-gray-300 text-sm">
                            Será publicado em: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedChannel && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center">
            <p className="text-gray-400">
              Selecione um canal para ver os vídeos aprovados
            </p>
          </div>
        )}

        {selectedChannel && selectedChannel.approvedVideos.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center">
            <p className="text-gray-400">
              Nenhum vídeo aprovado encontrado para este canal
            </p>
          </div>
        )}
      </main>
    </div>
  );
}