import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Settings, Wand2, FileText, Loader2, Calendar, FileCheck, Image as ImageIcon, Volume2, CheckCircle } from 'lucide-react';
import { DashboardHeader } from '@features/dashboard/components';
import { PromptModal } from '@shared/components/modals';
import { supabase } from '@shared/lib/supabase';

interface Channel {
  id: number;
  nome_canal: string;
  prompt_roteiro: string;
  prompt_titulo: string;
  voz_prefereida?: number;
  media_chars?: number;
  prompt_thumb?: string;
  url_canal?: string;
  caption_style?: any;
}

interface Roteiro {
  id: number;
  roteiro: string;
  canal_id: number;
  created_at: string;
  titulo: string | null;
  audio_path: string | null;
  text_thumb: string | null;
  images_path: string[] | null;
  transcricao_timestamp: string | null;
}

const voiceOptions = [
  { value: 'feminina-suave', label: 'Feminina Suave' },
  { value: 'masculina-grave', label: 'Masculina Grave' },
  { value: 'feminina-energetica', label: 'Feminina Energética' },
  { value: 'masculina-jovem', label: 'Masculina Jovem' },
  { value: 'infantil-feminina', label: 'Infantil Feminina' },
  { value: 'infantil-masculina', label: 'Infantil Masculina' }
];

export default function GenerateVideoPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [isLoadingRoteiros, setIsLoadingRoteiros] = useState(false);
  const [selectedRoteiroId, setSelectedRoteiroId] = useState<number | null>(null);
  const [idea, setIdea] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedModel, setSelectedModel] = useState('sonnet-4');
  const [selectedVoice, setSelectedVoice] = useState('feminina-suave');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'title' | 'script' | 'description' | null;
    content: string;
  }>({
    isOpen: false,
    type: null,
    content: ''
  });

  const modelOptions = [
    { value: 'sonnet-4', label: 'Sonnet-4' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gemini-2.5-pro', label: 'Gemini-2.5-Pro' }
  ];

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Buscar canais do Supabase ao carregar a página
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setIsLoadingChannels(true);
      const { data, error } = await supabase
        .from('canais')
        .select('*')
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
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('canal_id', canalId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar roteiros:', error);
        return;
      }

      if (data) {
        setRoteiros(data);
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
    setGeneratedTitle('');
    setGeneratedScript('');
    setIdea('');
    setRoteiros([]);
    setSelectedRoteiroId(null);

    if (id) {
      fetchRoteiros(id);
    }
  };

  const handleSelectRoteiro = (roteiro: Roteiro) => {
    setSelectedRoteiroId(roteiro.id);
    setGeneratedTitle(roteiro.titulo || '');
    setGeneratedScript(roteiro.roteiro);
    setIdea(''); // Clear the idea input as we're using an existing script
  };

  const handleGenerateTitle = async () => {
    if (!idea.trim() || !selectedChannel) return;

    setIsGeneratingTitle(true);

    // Simular geração de título
    setTimeout(() => {
      const titles = [
        `${idea} - Você Precisa Ver Isso!`,
        `A Verdade Sobre ${idea} Que Ninguém Te Conta`,
        `${idea}: O Guia Completo Para Iniciantes`,
        `Como ${idea} Mudou Minha Vida (INCRÍVEL!)`,
        `${idea} - Tutorial Passo a Passo`
      ];
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      setGeneratedTitle(randomTitle);
      setIsGeneratingTitle(false);
    }, 3000);
  };

  const handleGenerateScript = async () => {
    if (!idea.trim() || !selectedChannel) return;

    setIsGeneratingScript(true);

    // Simular geração de roteiro
    setTimeout(() => {
      const script = `Olá pessoal! Hoje vamos falar sobre ${idea}.

[INTRODUÇÃO]
Você já se perguntou sobre ${idea}? Neste vídeo, vou te mostrar tudo que você precisa saber!

[DESENVOLVIMENTO]
Primeiro, vamos entender o básico sobre ${idea}...
Em seguida, vou te mostrar as principais características...
E por fim, algumas dicas práticas que você pode aplicar hoje mesmo!

[CONCLUSÃO]
Espero que tenham gostado do conteúdo sobre ${idea}! Se inscreva no canal e ative o sininho para não perder nenhum vídeo!`;

      setGeneratedScript(script);
      setIsGeneratingScript(false);
    }, 4000);
  };

  const openModal = (type: 'title' | 'script' | 'description') => {
    if (!selectedChannel) return;

    const contentMap = {
      title: selectedChannel.prompt_titulo || '',
      script: selectedChannel.prompt_roteiro || '',
      description: selectedChannel.prompt_thumb || ''
    };

    setModalState({
      isOpen: true,
      type,
      content: contentMap[type]
    });
  };

  const handleModalSave = (content: string) => {
    if (!modalState.type || !selectedChannel) return;

    // Atualizar o canal com o novo prompt
    // TODO: Implementar atualização no Supabase
    console.log('Salvando prompt:', modalState.type, content);
  };

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
            <h1 className="text-2xl font-light text-white">Gerar Vídeo</h1>
            <p className="text-gray-400 text-sm">
              Crie vídeos automaticamente usando IA baseada nos dados coletados
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
            <div className="mt-4 p-4 bg-gray-800 border border-gray-700">
              <h3 className="text-white font-medium mb-1">{selectedChannel.nome_canal}</h3>
              {selectedChannel.url_canal && (
                <p className="text-gray-400 text-sm mb-2">{selectedChannel.url_canal}</p>
              )}
              <div className="flex gap-2 text-xs text-gray-500">
                {selectedChannel.media_chars && (
                  <span>Média de caracteres: {selectedChannel.media_chars}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Roteiros Section */}
        {selectedChannel && (
          <div className="bg-gray-900 border border-gray-800 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-white">
                Roteiros do Canal
              </h2>
              {selectedRoteiroId && (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Roteiro selecionado</span>
                </div>
              )}
            </div>

            {isLoadingRoteiros ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : roteiros.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 p-8 text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  Nenhum roteiro encontrado para este canal
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roteiros.map((roteiro) => (
                  <div
                    key={roteiro.id}
                    onClick={() => handleSelectRoteiro(roteiro)}
                    className={`bg-gray-800 border p-4 hover:border-gray-600 transition-all cursor-pointer relative ${
                      selectedRoteiroId === roteiro.id
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-gray-700'
                    }`}
                  >
                    {selectedRoteiroId === roteiro.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white font-medium text-sm line-clamp-2 flex-1 pr-6">
                        {roteiro.titulo || 'Sem título'}
                      </h3>
                    </div>

                    <p className="text-gray-400 text-xs line-clamp-3 mb-4">
                      {roteiro.roteiro.substring(0, 150)}...
                    </p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(roteiro.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {roteiro.audio_path && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <Volume2 className="w-3 h-3" />
                          <span>Áudio</span>
                        </div>
                      )}
                      {roteiro.images_path && roteiro.images_path.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <ImageIcon className="w-3 h-3" />
                          <span>{roteiro.images_path.length} img</span>
                        </div>
                      )}
                      {roteiro.transcricao_timestamp && (
                        <div className="flex items-center gap-1 text-xs text-purple-400">
                          <FileCheck className="w-3 h-3" />
                          <span>Legendas</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Generation Section */}
        {selectedChannel && (
          <div className="space-y-8">
            {/* Info banner when roteiro is selected */}
            {selectedRoteiroId && (
              <div className="bg-blue-900/20 border border-blue-500/50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-300 text-sm font-medium mb-1">
                      Trabalhando com roteiro existente
                    </p>
                    <p className="text-blue-400/80 text-xs">
                      O título e roteiro foram carregados do roteiro selecionado. Você pode editá-los abaixo ou gerar um novo conteúdo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Idea Input and Title Generation */}
            <div className="bg-gray-900 border border-gray-800 p-6">
              <h3 className="text-lg font-light text-white mb-4">
                1. Inserir Ideia e Gerar Título
              </h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Ex: Como fazer slime colorido em casa"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 focus:outline-none focus:border-gray-600 transition-colors"
                  />
                  <button
                    onClick={handleGenerateTitle}
                    disabled={!idea.trim() || isGeneratingTitle}
                    className="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {isGeneratingTitle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    Gerar Título
                  </button>
                </div>

                {/* Generated Title */}
                {generatedTitle && (
                  <div className="bg-gray-800 border border-gray-700 p-4">
                    <label className="block text-gray-400 text-sm mb-2">
                      Título Gerado:
                    </label>
                    <input
                      type="text"
                      value={generatedTitle}
                      onChange={(e) => setGeneratedTitle(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 focus:outline-none focus:border-gray-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Script Generation */}
            <div className="bg-gray-900 border border-gray-800 p-6">
              <h3 className="text-lg font-light text-white mb-4">
                2. Gerar Roteiro
              </h3>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Modelo de IA:
                </label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 focus:outline-none focus:border-gray-600 appearance-none"
                  >
                    {modelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleGenerateScript}
                disabled={!idea.trim() || isGeneratingScript}
                className="w-full bg-green-600 text-white py-4 px-6 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingScript ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando Roteiro com {modelOptions.find(m => m.value === selectedModel)?.label}...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Gerar Roteiro
                  </>
                )}
              </button>

              {/* Generated Script */}
              {generatedScript && (
                <div className="mt-4 bg-gray-800 border border-gray-700 p-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Roteiro Gerado:
                  </label>
                  <textarea
                    value={generatedScript}
                    onChange={(e) => setGeneratedScript(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 focus:outline-none focus:border-gray-500 resize-none"
                    rows={12}
                  />
                </div>
              )}
            </div>

            {/* Advanced Settings (Collapsible) */}
            <div className="bg-gray-900 border border-gray-800">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-850 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-light text-white">
                    Configurações Avançadas
                  </h3>
                </div>
                {showAdvanced ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showAdvanced && selectedChannel && (
                <div className="border-t border-gray-800 p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prompt Gerador de Título */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Prompt Gerador de Título</h4>
                      <div className="bg-gray-700 border border-gray-600 p-3">
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                          {selectedChannel.prompt_titulo || 'Nenhum prompt definido'}
                        </p>
                        <button
                          onClick={() => openModal('title')}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          Mostrar mais
                        </button>
                      </div>
                    </div>

                    {/* Prompt Roteiro */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Prompt Roteiro</h4>
                      <div className="bg-gray-700 border border-gray-600 p-3">
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                          {selectedChannel.prompt_roteiro || 'Nenhum prompt definido'}
                        </p>
                        <button
                          onClick={() => openModal('script')}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          Mostrar mais
                        </button>
                      </div>
                    </div>

                    {/* Prompt Thumbnail */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Prompt Thumbnail</h4>
                      <div className="bg-gray-700 border border-gray-600 p-3">
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                          {selectedChannel.prompt_thumb || 'Nenhum prompt definido'}
                        </p>
                        <button
                          onClick={() => openModal('description')}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          Mostrar mais
                        </button>
                      </div>
                    </div>

                    {/* Voz */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Voz</h4>
                      <div className="relative">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm pr-8 focus:outline-none focus:border-gray-500 appearance-none"
                        >
                          {voiceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>

                    {/* Média de Caracteres */}
                    {selectedChannel.media_chars && (
                      <div className="bg-gray-800 border border-gray-700 p-4">
                        <h4 className="text-white font-medium mb-3">Média de Caracteres</h4>
                        <input
                          type="number"
                          value={selectedChannel.media_chars}
                          readOnly
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        />
                      </div>
                    )}

                    {/* URL do Canal */}
                    {selectedChannel.url_canal && (
                      <div className="bg-gray-800 border border-gray-700 p-4">
                        <h4 className="text-white font-medium mb-3">URL do Canal</h4>
                        <input
                          type="text"
                          value={selectedChannel.url_canal}
                          readOnly
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Next Steps */}
            {generatedTitle && generatedScript && (
              <div className="bg-gray-900 border border-green-500 p-6">
                <h3 className="text-lg font-light text-white mb-4">
                  ✅ Conteúdo Gerado com Sucesso!
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Título e roteiro foram gerados. Próximos passos disponíveis:
                </p>
                <div className="flex gap-3">
                  <button className="bg-white text-black px-6 py-3 hover:bg-gray-200 transition-colors">
                    Gerar Imagem
                  </button>
                  <button className="bg-purple-600 text-white px-6 py-3 hover:bg-purple-700 transition-colors">
                    Gerar Áudio
                  </button>
                  <button className="bg-orange-600 text-white px-6 py-3 hover:bg-orange-700 transition-colors">
                    Revisar/Editar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedChannel && !isLoadingChannels && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center">
            <p className="text-gray-400">
              Selecione um canal para começar a gerar vídeos
            </p>
          </div>
        )}
      </main>

      {/* Modal */}
      <PromptModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        title={
          modalState.type === 'title' ? 'Prompt Gerador de Título' :
          modalState.type === 'script' ? 'Prompt Roteiro' :
          'Prompt Thumbnail'
        }
        content={modalState.content}
        onSave={handleModalSave}
      />
    </div>
  );
}
