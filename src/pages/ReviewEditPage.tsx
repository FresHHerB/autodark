import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Eye, Filter } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import VideoReviewModal from '../components/VideoReviewModal';

interface VideoToReview {
  id: string;
  title: string;
  script: string;
  thumbnail: string;
  status: 'pending' | 'approved' | 'needs-changes';
  generatedAt: string;
  channel: string;
  idea: string;
  estimatedDuration: string;
}

interface ChannelSection {
  id: string;
  name: string;
  description: string;
  color: string;
  videosToReview: VideoToReview[];
}

const mockChannelSections: ChannelSection[] = [
  {
    id: '1',
    name: 'ToonshineStudio',
    description: 'Canal de histórias infantis animadas',
    color: 'blue',
    videosToReview: [
      {
        id: '1',
        title: 'Como Fazer Slime Colorido em Casa - Você Precisa Ver Isso!',
        script: 'Olá pessoal! Hoje vamos falar sobre como fazer slime colorido em casa...',
        thumbnail: 'https://images.pexels.com/photos/1648377/pexels-photo-1648377.jpeg?auto=compress&cs=tinysrgb&w=400',
        status: 'pending',
        generatedAt: '2024-01-20T10:30:00Z',
        channel: 'ToonshineStudio',
        idea: 'Como fazer slime colorido em casa',
        estimatedDuration: '5:30'
      },
      {
        id: '2',
        title: 'A Verdade Sobre Brinquedos Educativos Que Ninguém Te Conta',
        script: 'Você já se perguntou sobre brinquedos educativos? Neste vídeo, vou te mostrar tudo...',
        thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
        status: 'approved',
        generatedAt: '2024-01-19T14:15:00Z',
        channel: 'ToonshineStudio',
        idea: 'Brinquedos educativos para crianças',
        estimatedDuration: '7:45'
      },
      {
        id: '3',
        title: 'Histórias de Animais: Tutorial Passo a Passo',
        script: 'Olá crianças! Hoje vamos contar uma história incrível sobre animais...',
        thumbnail: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=400',
        status: 'needs-changes',
        generatedAt: '2024-01-18T09:20:00Z',
        channel: 'ToonshineStudio',
        idea: 'Histórias de animais para crianças',
        estimatedDuration: '4:20'
      }
    ]
  },
  {
    id: '2',
    name: 'TechReviewBR',
    description: 'Reviews de tecnologia em português',
    color: 'green',
    videosToReview: [
      {
        id: '4',
        title: 'iPhone 15 Pro Max REVIEW - VALE A PENA? Análise Completa',
        script: 'E aí pessoal! Hoje vamos fazer o review completo do iPhone 15 Pro Max...',
        thumbnail: 'https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?auto=compress&cs=tinysrgb&w=400',
        status: 'pending',
        generatedAt: '2024-01-20T16:45:00Z',
        channel: 'TechReviewBR',
        idea: 'Review do iPhone 15 Pro Max',
        estimatedDuration: '12:30'
      },
      {
        id: '5',
        title: 'MacBook Air M3 - ANÁLISE COMPLETA após 30 dias de uso',
        script: 'Fala galera! Após 30 dias usando o MacBook Air M3, vou contar tudo...',
        thumbnail: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400',
        status: 'approved',
        generatedAt: '2024-01-19T11:30:00Z',
        channel: 'TechReviewBR',
        idea: 'Review MacBook Air M3',
        estimatedDuration: '15:20'
      }
    ]
  },
  {
    id: '3',
    name: 'CookingMaster',
    description: 'Receitas rápidas e fáceis',
    color: 'purple',
    videosToReview: [
      {
        id: '6',
        title: 'Bolo de Chocolate FÁCIL e RÁPIDO - 15 minutos no forno!',
        script: 'Oi gente! Hoje vou ensinar uma receita de bolo de chocolate super fácil...',
        thumbnail: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
        status: 'needs-changes',
        generatedAt: '2024-01-20T08:15:00Z',
        channel: 'CookingMaster',
        idea: 'Receita de bolo de chocolate fácil',
        estimatedDuration: '8:45'
      }
    ]
  }
];

const statusOptions = [
  { value: 'pending', label: 'Pendente', color: 'yellow' },
  { value: 'approved', label: 'Aprovado', color: 'green' },
  { value: 'needs-changes', label: 'Precisa Alterações', color: 'red' }
];

const channelColors = {
  blue: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5'
  },
  green: {
    border: 'border-green-500/20',
    bg: 'bg-green-500/5'
  },
  purple: {
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5'
  },
  orange: {
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/5'
  }
};

export default function ReviewEditPage() {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<VideoToReview | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(['pending', 'approved', 'needs-changes']));

  const handleVideoClick = (video: VideoToReview) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
  };

  const handleGenerateVideo = (videoId: string) => {
    console.log(`Generating video for ID: ${videoId}`);
    handleCloseModal();
  };

  const handleApprove = (videoId: string) => {
    console.log(`Approving video ID: ${videoId}`);
  };

  const handleRequestChanges = (videoId: string) => {
    console.log(`Requesting changes for video ID: ${videoId}`);
  };

  const handleFilterToggle = (status: string) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setSelectedFilters(newFilters);
  };

  const getStatusIcon = (status: VideoToReview['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-changes':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: VideoToReview['status']) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'needs-changes':
        return 'Precisa Alterações';
    }
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

  // Filter videos based on selected filters
  const filteredChannelSections = mockChannelSections.map(channel => ({
    ...channel,
    videosToReview: channel.videosToReview.filter(video => selectedFilters.has(video.status))
  })).filter(channel => channel.videosToReview.length > 0);

  const totalVideos = filteredChannelSections.reduce((total, channel) => total + channel.videosToReview.length, 0);

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
            <h1 className="text-2xl font-light text-white">Revisar/Editar</h1>
            <p className="text-gray-400 text-sm">
              Revise e edite o conteúdo gerado antes da publicação final ({totalVideos} vídeos)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-light text-white">Filtros</h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {statusOptions.map((option) => {
              const isSelected = selectedFilters.has(option.value);
              const colorClasses = {
                yellow: isSelected ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50',
                green: isSelected ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50',
                red: isSelected ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50'
              };
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleFilterToggle(option.value)}
                  className={`
                    px-4 py-2 border text-sm transition-all duration-200
                    ${colorClasses[option.color as keyof typeof colorClasses]}
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Channel Sections */}
        <div className="space-y-8">
          {filteredChannelSections.map((channel) => {
            const channelColorClasses = channelColors[channel.color as keyof typeof channelColors];
            
            return (
              <div key={channel.id} className={`bg-gray-900 border ${channelColorClasses.border} ${channelColorClasses.bg} p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-light text-white mb-1">
                      {channel.name}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {channel.description}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {channel.videosToReview.length} vídeo{channel.videosToReview.length !== 1 ? 's' : ''} para revisar
                  </div>
                </div>

                {/* Videos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channel.videosToReview.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => handleVideoClick(video)}
                      className="group bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gray-700 overflow-hidden">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        
                        {/* Status Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-2 py-1 text-xs text-white">
                          {getStatusIcon(video.status)}
                          {getStatusLabel(video.status)}
                        </div>

                        {/* Duration */}
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1">
                          {video.estimatedDuration}
                        </div>

                        {/* View Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 p-3 rounded-full">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h4 className="text-white text-sm font-medium leading-tight mb-2 line-clamp-2">
                          {video.title}
                        </h4>
                        
                        <div className="text-xs text-gray-500 mb-3">
                          Gerado em {formatDate(video.generatedAt)}
                        </div>

                        <div className="text-xs text-gray-400 line-clamp-2">
                          Ideia: {video.idea}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {totalVideos === 0 && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center">
            <p className="text-gray-400">
              Nenhum vídeo encontrado com os filtros selecionados
            </p>
          </div>
        )}
      </main>

      {/* Review Modal */}
      <VideoReviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        video={selectedVideo}
        onGenerateVideo={handleGenerateVideo}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
      />
    </div>
  );
}