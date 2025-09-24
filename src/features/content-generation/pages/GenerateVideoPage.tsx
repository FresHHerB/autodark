import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Settings, Wand2, FileText, Loader2 } from 'lucide-react';
import { DashboardHeader } from '@features/dashboard/components';
import { PromptModal } from '@shared/components/modals';

interface Channel {
  id: string;
  name: string;
  description: string;
  videoCount: number;
  config: {
    titlePrompt: string;
    scriptPrompt: string;
    mainTheme: string;
    tags: string;
    descriptionPrompt: string;
    imageStyle: string;
    wordCount: number;
    voice: string;
  };
}

const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'ToonshineStudio',
    description: 'Canal de histórias infantis animadas',
    videoCount: 47,
    config: {
      titlePrompt: 'Crie um título envolvente para um vídeo sobre [TEMA]. O título deve ser chamativo, usar palavras-chave relevantes e despertar curiosidade. Mantenha entre 50-60 caracteres para otimização no YouTube.',
      scriptPrompt: 'Escreva um roteiro envolvente para um vídeo de [DURAÇÃO] minutos sobre [TEMA]. Inclua: introdução cativante, desenvolvimento claro do conteúdo, exemplos práticos e conclusão memorável. Use linguagem conversacional e inclua momentos para engajamento.',
      mainTheme: 'Histórias infantis educativas',
      tags: 'histórias infantis, educação, animação, crianças, contos, moral',
      descriptionPrompt: 'Escreva uma descrição completa para um vídeo sobre [TEMA]. Inclua: resumo do conteúdo, benefícios para o espectador, call-to-action para inscrição e hashtags relevantes. Mantenha tom amigável e profissional.',
      imageStyle: 'Ilustração colorida estilo cartoon',
      wordCount: 150,
      voice: 'feminina-suave'
    }
  },
  {
    id: '2',
    name: 'TechReviewBR',
    description: 'Reviews de tecnologia em português',
    videoCount: 23,
    config: {
      titlePrompt: 'Crie um título técnico e atrativo para review de [PRODUTO]. Use termos como "REVIEW", "VALE A PENA?" ou "ANÁLISE COMPLETA". Mantenha entre 50-60 caracteres.',
      scriptPrompt: 'Escreva um roteiro de review técnico para [PRODUTO]. Inclua: especificações, prós e contras, comparações, preço e veredicto final. Use linguagem técnica mas acessível.',
      mainTheme: 'Reviews de tecnologia',
      tags: 'tecnologia, review, análise, gadgets, eletrônicos, tech',
      descriptionPrompt: 'Escreva uma descrição técnica para review de [PRODUTO]. Inclua especificações, links de compra e timestamps do vídeo.',
      imageStyle: 'Fotografia profissional de produto',
      wordCount: 200,
      voice: 'masculina-grave'
    }
  },
  {
    id: '3',
    name: 'CookingMaster',
    description: 'Receitas rápidas e fáceis',
    videoCount: 156,
    config: {
      titlePrompt: 'Crie um título apetitoso para receita de [PRATO]. Use palavras como "FÁCIL", "RÁPIDO", "DELICIOSO". Inclua tempo de preparo se relevante.',
      scriptPrompt: 'Escreva um roteiro de culinária para [PRATO]. Inclua: ingredientes, modo de preparo passo a passo, dicas importantes e apresentação final.',
      mainTheme: 'Receitas culinárias',
      tags: 'culinária, receitas, cozinha, comida, gastronomia, chef',
      descriptionPrompt: 'Escreva uma descrição saborosa para receita de [PRATO]. Inclua lista de ingredientes, tempo de preparo e dicas extras.',
      imageStyle: 'Fotografia gastronômica profissional',
      wordCount: 120,
      voice: 'feminina-energetica'
    }
  },
  {
    id: '4',
    name: 'FitnessLife',
    description: 'Exercícios e vida saudável',
    videoCount: 89,
    config: {
      titlePrompt: 'Crie um título motivacional para treino de [TIPO]. Use palavras energéticas como "QUEIME", "TONIFIQUE", "TRANSFORME". Inclua duração do treino.',
      scriptPrompt: 'Escreva um roteiro de treino para [TIPO]. Inclua: aquecimento, exercícios principais com repetições, dicas de execução e alongamento final.',
      mainTheme: 'Fitness e exercícios',
      tags: 'fitness, exercícios, treino, saúde, musculação, cardio',
      descriptionPrompt: 'Escreva uma descrição motivacional para treino de [TIPO]. Inclua benefícios, equipamentos necessários e avisos de segurança.',
      imageStyle: 'Fotografia fitness dinâmica',
      wordCount: 180,
      voice: 'masculina-jovem'
    }
  },
  {
    id: '5',
    name: 'GameplayZone',
    description: 'Gameplays e análises de jogos',
    videoCount: 234,
    config: {
      titlePrompt: 'Crie um título gamer para [JOGO]. Use termos como "GAMEPLAY", "PRIMEIRA VEZ", "REAÇÃO" ou "ANÁLISE". Seja empolgante e use caps quando apropriado.',
      scriptPrompt: 'Escreva um roteiro de gameplay para [JOGO]. Inclua: introdução do jogo, comentários durante a gameplay, reações autênticas e conclusão com rating.',
      mainTheme: 'Gaming e entretenimento',
      tags: 'games, gameplay, jogos, gaming, entretenimento, diversão',
      descriptionPrompt: 'Escreva uma descrição gamer para [JOGO]. Inclua informações do jogo, plataforma, onde comprar e sua opinião pessoal.',
      imageStyle: 'Screenshot do jogo com overlay gamer',
      wordCount: 160,
      voice: 'masculina-jovem'
    }
  },
  {
    id: '6',
    name: 'TravelVlog',
    description: 'Vlogs de viagem pelo mundo',
    videoCount: 67,
    config: {
      titlePrompt: 'Crie um título inspirador para vlog de [DESTINO]. Use palavras como "EXPLORANDO", "DESCOBRINDO", "AVENTURA EM". Desperte wanderlust.',
      scriptPrompt: 'Escreva um roteiro de vlog para [DESTINO]. Inclua: chegada, principais atrações, experiências locais, dicas de viagem e reflexões pessoais.',
      mainTheme: 'Viagens e turismo',
      tags: 'viagem, turismo, destinos, aventura, cultura, vlog',
      descriptionPrompt: 'Escreva uma descrição inspiradora para vlog de [DESTINO]. Inclua roteiro da viagem, custos aproximados e dicas práticas.',
      imageStyle: 'Fotografia de viagem cinematográfica',
      wordCount: 140,
      voice: 'feminina-suave'
    }
  }
];

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
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [idea, setIdea] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedModel, setSelectedModel] = useState('sonnet-4');
  const [config, setConfig] = useState<Channel['config'] | null>(null);
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

  const selectedChannel = mockChannels.find(c => c.id === selectedChannelId);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    const channel = mockChannels.find(c => c.id === channelId);
    if (channel) {
      setConfig({ ...channel.config });
    }
    setGeneratedTitle('');
    setGeneratedScript('');
    setIdea('');
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
    if (!config) return;
    
    const contentMap = {
      title: config.titlePrompt,
      script: config.scriptPrompt,
      description: config.descriptionPrompt
    };
    
    setModalState({
      isOpen: true,
      type,
      content: contentMap[type]
    });
  };

  const handleModalSave = (content: string) => {
    if (!modalState.type || !config) return;
    
    const updates = {
      title: { titlePrompt: content },
      script: { scriptPrompt: content },
      description: { descriptionPrompt: content }
    };
    
    setConfig(prev => prev ? { ...prev, ...updates[modalState.type!] } : null);
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
              value={selectedChannelId}
              onChange={(e) => handleChannelSelect(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 focus:outline-none focus:border-gray-600 appearance-none"
            >
              <option value="">Selecione um canal...</option>
              {mockChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} ({channel.videoCount} vídeos)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          {selectedChannel && (
            <div className="mt-4 p-4 bg-gray-800 border border-gray-700">
              <h3 className="text-white font-medium mb-1">{selectedChannel.name}</h3>
              <p className="text-gray-400 text-sm mb-2">{selectedChannel.description}</p>
              <p className="text-gray-500 text-xs">{selectedChannel.videoCount} vídeos clonados</p>
            </div>
          )}
        </div>

        {/* Main Generation Section */}
        {selectedChannel && (
          <div className="space-y-8">
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

              {showAdvanced && config && (
                <div className="border-t border-gray-800 p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prompt Gerador de Título */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Prompt Gerador de Título</h4>
                      <div className="bg-gray-700 border border-gray-600 p-3">
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                          {config.titlePrompt}
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
                          {config.scriptPrompt}
                        </p>
                        <button
                          onClick={() => openModal('script')}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          Mostrar mais
                        </button>
                      </div>
                    </div>

                    {/* Tema Principal */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Tema Principal</h4>
                      <input
                        type="text"
                        value={config.mainTheme}
                        onChange={(e) => setConfig(prev => prev ? { ...prev, mainTheme: e.target.value } : null)}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                      />
                    </div>

                    {/* Tags do Canal */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Tags do Canal</h4>
                      <textarea
                        value={config.tags}
                        onChange={(e) => setConfig(prev => prev ? { ...prev, tags: e.target.value } : null)}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Estilo de Imagem */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Estilo de Imagem</h4>
                      <input
                        type="text"
                        value={config.imageStyle}
                        onChange={(e) => setConfig(prev => prev ? { ...prev, imageStyle: e.target.value } : null)}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                      />
                    </div>

                    {/* Quantidade de Palavras */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Quantidade de Palavras</h4>
                      <input
                        type="number"
                        value={config.wordCount}
                        onChange={(e) => setConfig(prev => prev ? { ...prev, wordCount: parseInt(e.target.value) || 0 } : null)}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        min="50"
                        max="1000"
                      />
                    </div>

                    {/* Voz */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Voz</h4>
                      <div className="relative">
                        <select
                          value={config.voice}
                          onChange={(e) => setConfig(prev => prev ? { ...prev, voice: e.target.value } : null)}
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

                    {/* Prompt Descrição */}
                    <div className="bg-gray-800 border border-gray-700 p-4">
                      <h4 className="text-white font-medium mb-3">Prompt Descrição</h4>
                      <div className="bg-gray-700 border border-gray-600 p-3">
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                          {config.descriptionPrompt}
                        </p>
                        <button
                          onClick={() => openModal('description')}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          Mostrar mais
                        </button>
                      </div>
                    </div>
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

        {!selectedChannel && (
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
          'Prompt Descrição'
        }
        content={modalState.content}
        onSave={handleModalSave}
      />
    </div>
  );
}