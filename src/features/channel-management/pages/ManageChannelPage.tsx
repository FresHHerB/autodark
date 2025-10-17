import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Video as VideoIcon, ExternalLink, X, Edit, Trash2, Loader2 } from 'lucide-react';
import { DashboardHeader } from '@features/dashboard/components';
import { VoiceSelector } from '@features/content-generation/components';
import { CaptionStyleEditor, CaptionStyleConfig, CompactImageUpload } from '../components';
import { supabase, Canal } from '@shared/lib';
import { apiService } from '@shared/services';

export default function ManageChannelPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Canal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChannelForModal, setSelectedChannelForModal] = useState<Canal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | undefined>();
  const [captionStyleConfig, setCaptionStyleConfig] = useState<CaptionStyleConfig>({
    type: 'highlight',
    style: {},
  });
  const [activeTab, setActiveTab] = useState<'general' | 'captions'>('general');
  const [imageUpdateSuccess, setImageUpdateSuccess] = useState(false);

  // Delete confirmation state
  const [deletingChannel, setDeletingChannel] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id: number, name: string} | null>(null);

  // Fetch channels from Supabase
  React.useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setChannels(data || []);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar canais');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelClick = async (canal: Canal) => {
    setSelectedChannelForModal(canal);
    setSelectedVoiceId(canal.voz_prefereida || undefined);
    setSaveSuccess(false);
    setImageUpdateSuccess(false);

    // Load caption style if exists, otherwise use empty config
    // The CaptionStyleEditor will initialize with defaults via useEffect
    if (canal.caption_style) {
      setCaptionStyleConfig(canal.caption_style as CaptionStyleConfig);
    } else {
      // Initialize with empty style - CaptionStyleEditor will populate defaults
      setCaptionStyleConfig({
        type: 'highlight',
        style: {},
      });
    }

    setModalOpen(true);
  };

  const handleSavePrompts = async () => {
    if (!selectedChannelForModal) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Call API webhook to update channel
      await apiService.updateChannel({
        update_type: 'updateChannel',
        id_canal: selectedChannelForModal.id,
        voice_id: selectedVoiceId || null,
        prompt_titulo: selectedChannelForModal.prompt_titulo,
        prompt_roteiro: selectedChannelForModal.prompt_roteiro,
        caption_style: captionStyleConfig,
        media_chars: selectedChannelForModal.media_chars || null,
      });

      // Also update in Supabase for local persistence
      const { error } = await supabase
        .from('canais')
        .update({
          prompt_titulo: selectedChannelForModal.prompt_titulo,
          prompt_roteiro: selectedChannelForModal.prompt_roteiro,
          voz_prefereida: selectedVoiceId || null,
          caption_style: captionStyleConfig,
          media_chars: selectedChannelForModal.media_chars || null,
        })
        .eq('id', selectedChannelForModal.id);

      if (error) {
        throw error;
      }

      // Update local state
      setChannels(prev => prev.map(channel =>
        channel.id === selectedChannelForModal.id
          ? {
              ...selectedChannelForModal,
              voz_prefereida: selectedVoiceId || null,
              caption_style: captionStyleConfig as any,
            }
          : channel
      ));

      // Show success message
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving channel settings:', error);
      alert('Erro ao salvar configurações do canal. Verifique o console para mais detalhes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChannelForModal(null);
    setSelectedVoiceId(undefined);
    setImageUpdateSuccess(false);
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const handleImageUpload = async (imageData: { type: string; base64: string }) => {
    if (!selectedChannelForModal) return;

    try {
      console.log('📤 Sending image to webhook...', { id_canal: selectedChannelForModal.id, type: imageData.type });

      // Send webhook with only necessary data: update_type: 'imageChannel', id_canal, image_data { type, base64 }
      const response = await apiService.updateChannelImage(selectedChannelForModal.id, imageData);

      console.log('📥 Webhook response:', response);

      // Check webhook response: can be {"success": true} or [{"success": true}]
      const isSuccess = response && (
        response.success === true ||
        (Array.isArray(response) && response[0]?.success === true)
      );

      console.log('✅ Webhook success?', isSuccess);

      if (isSuccess) {
        console.log('🔄 Refetching channel data from Supabase...');

        // Refetch channel data to get updated profile_image without cache
        const { data, error } = await supabase
          .from('canais')
          .select('*')
          .eq('id', selectedChannelForModal.id)
          .single();

        console.log('📊 Supabase data:', data);
        console.log('❌ Supabase error:', error);

        if (error) {
          console.error('Supabase error on refetch:', error);
          throw error;
        }

        if (data) {
          console.log('✨ Updating local state with new image:', data.profile_image);
          // Update local state with new image
          setSelectedChannelForModal(data);
          setChannels(prev => prev.map(ch => ch.id === data.id ? data : ch));
        }

        // Show success message for 5 seconds
        setImageUpdateSuccess(true);
        setTimeout(() => {
          setImageUpdateSuccess(false);
        }, 5000);
      } else {
        console.error('❌ Webhook did not return success');
        throw new Error('Falha ao atualizar imagem no servidor');
      }
    } catch (error) {
      console.error('💥 Error in handleImageUpload:', error);
      throw error; // Rethrow to be handled by ImageUpload component
    }
  };

  const handleDeleteChannel = async (id: number) => {
    try {
      setDeletingChannel(id);

      await apiService.deleteContent({
        id,
        deleteType: 'deleteChannel'
      });

      // Recarrega os canais do banco de dados
      await fetchChannels();
      setConfirmDelete(null);

    } catch (error) {
      console.error('Erro ao deletar canal:', error);
      alert('Erro ao deletar canal. Tente novamente.');
    } finally {
      setDeletingChannel(null);
    }
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
            <h1 className="text-2xl font-light text-white">Editar/Gerenciar Canal</h1>
            <p className="text-gray-400 text-sm">
              Configure prompts e configurações dos seus canais
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando canais...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-500/30 p-6 mb-8">
            <p className="text-red-300">Erro: {error}</p>
            <button
              onClick={fetchChannels}
              className="mt-3 text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Channels Grid */}
        {!loading && !error && channels.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-light text-white mb-6">
              Meus Canais ({channels.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((canal) => (
                <div
                  key={canal.id}
                  className={`
                    group bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all duration-200 p-6 relative
                  `}
                >
                  {/* Action Icons */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: canal.id, name: canal.nome_canal });
                      }}
                      className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                      title="Excluir canal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleChannelClick(canal)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      title="Editar canal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    onClick={() => handleChannelClick(canal)}
                    className="cursor-pointer"
                  >

                  {/* Channel Image */}
                  <div className="mb-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center">
                      {canal.profile_image ? (
                        <img
                          src={`${canal.profile_image}?t=${Date.now()}`}
                          alt={canal.nome_canal}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<VideoIcon className="w-10 h-10 text-gray-600" />';
                          }}
                        />
                      ) : (
                        <VideoIcon className="w-10 h-10 text-gray-600" />
                      )}
                    </div>
                  </div>

                  {/* Channel Header */}
                  <div className="mb-4 pr-8">
                    <h3 className="text-white font-medium text-lg mb-2">
                      {canal.nome_canal}
                    </h3>
                  </div>

                  {/* Channel URL */}
                  {canal.url_canal && (
                    <div className="mb-4">
                     <div className="text-gray-500 text-xs mb-1 truncate">
                       {canal.url_canal}
                     </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUrl(canal.url_canal!);
                        }}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">Abrir Canal</span>
                      </button>
                    </div>
                  )}

                 {/* Character Count */}
                 {canal.media_chars && (
                   <div className="mb-4">
                     <div className="text-gray-400 text-sm">
                       Média de caracteres: <span className="text-white">{canal.media_chars}</span>
                     </div>
                   </div>
                 )}

                  {/* Created Date */}
                  <div className="pt-4 border-t border-gray-800 text-xs text-gray-500">
                    Criado em {new Date(canal.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Channels State */}
        {!loading && !error && channels.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 p-12 text-center mb-8">
            <VideoIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Nenhum canal encontrado</p>
            <p className="text-gray-500 text-sm">
              Clone um canal primeiro para começar a gerenciar suas configurações
            </p>
            <button
              onClick={() => navigate('/clone-channel')}
              className="mt-4 bg-white text-black px-6 py-2 hover:bg-gray-200 transition-colors"
            >
              Clonar Canal
            </button>
          </div>
        )}

      </main>

      {/* Channel Settings Modal - Modern Design */}
      {modalOpen && selectedChannelForModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                  {selectedChannelForModal.profile_image ? (
                    <img
                      src={`${selectedChannelForModal.profile_image}?t=${Date.now()}`}
                      alt={selectedChannelForModal.nome_canal}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '';
                          const icon = document.createElement('div');
                          icon.className = 'text-gray-600';
                          icon.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  ) : (
                    <VideoIcon className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white mb-1">
                    Configurações do Canal
                  </h2>
                  <p className="text-sm text-gray-400">
                    {selectedChannelForModal.nome_canal}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-all rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Image Upload Section - Discreet */}
            <div className="px-8 py-4 bg-gray-900/30 border-b border-gray-800">
              <CompactImageUpload
                currentImage={selectedChannelForModal.profile_image}
                channelName={selectedChannelForModal.nome_canal}
                onUpload={handleImageUpload}
              />

              {/* Success Message */}
              {imageUpdateSuccess && (
                <div className="mt-3 flex items-center gap-2 bg-green-900/30 border border-green-700/50 px-4 py-2 rounded text-green-400 text-sm animate-fade-in">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Imagem atualizada com sucesso!</span>
                </div>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-800 px-8 bg-gray-900/50">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`
                    px-6 py-4 text-sm font-medium transition-all relative
                    ${activeTab === 'general'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                    }
                  `}
                >
                  <span>Geral</span>
                  {activeTab === 'general' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('captions')}
                  className={`
                    px-6 py-4 text-sm font-medium transition-all relative
                    ${activeTab === 'captions'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                    }
                  `}
                >
                  <span>Estilo de Legendas</span>
                  {activeTab === 'captions' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'general' && (
                <div className="p-8">
                  <div className="max-w-5xl mx-auto space-y-8">
                    {/* Voice Configuration Card */}
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-white mb-2">
                          Configuração de Voz e Caracteres
                        </h3>
                        <p className="text-sm text-gray-400">
                          Selecione a voz padrão e defina a média de caracteres por roteiro
                        </p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6 items-start">
                        <VoiceSelector
                          selectedVoiceId={selectedVoiceId}
                          onVoiceSelect={setSelectedVoiceId}
                          label="Voz Padrão"
                        />
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">
                            Média de Caracteres
                          </label>
                          <input
                            type="number"
                            value={selectedChannelForModal.media_chars || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Limit to 7 characters
                              if (value.length <= 7) {
                                setSelectedChannelForModal(prev =>
                                  prev ? { ...prev, media_chars: value ? parseInt(value) : null } : null
                                );
                              }
                            }}
                            placeholder="Ex: 1500"
                            maxLength={7}
                            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 rounded transition-all"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Número de caracteres
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Prompts Card */}
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-white mb-2">
                          Prompts de Geração
                        </h3>
                        <p className="text-sm text-gray-400">
                          Configure os prompts que serão usados para gerar títulos e roteiros
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Prompt Título */}
                        <div>
                          <label className="block text-white font-medium mb-3 text-sm">
                            Prompt de Título
                            <span className="text-gray-500 font-normal ml-2">
                              (Define como os títulos são gerados)
                            </span>
                          </label>
                          <textarea
                            value={selectedChannelForModal.prompt_titulo}
                            onChange={(e) => setSelectedChannelForModal(prev =>
                              prev ? { ...prev, prompt_titulo: e.target.value } : null
                            )}
                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 resize-none rounded transition-all"
                            rows={4}
                            placeholder="Ex: Gere um título chamativo e envolvente sobre [tema] que incentive cliques..."
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              Use variáveis como [tema] para personalizar
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedChannelForModal.prompt_titulo.length} caracteres
                            </p>
                          </div>
                        </div>

                        {/* Prompt Roteiro */}
                        <div>
                          <label className="block text-white font-medium mb-3 text-sm">
                            Prompt de Roteiro
                            <span className="text-gray-500 font-normal ml-2">
                              (Define como os roteiros são criados)
                            </span>
                          </label>
                          <textarea
                            value={selectedChannelForModal.prompt_roteiro}
                            onChange={(e) => setSelectedChannelForModal(prev =>
                              prev ? { ...prev, prompt_roteiro: e.target.value } : null
                            )}
                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 resize-none rounded transition-all"
                            rows={8}
                            placeholder="Ex: Crie um roteiro envolvente sobre [tema] com introdução impactante, desenvolvimento claro e conclusão marcante..."
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              Seja específico sobre tom, estrutura e estilo
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedChannelForModal.prompt_roteiro.length} caracteres
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-900/20 border border-blue-800/30 p-4 rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-blue-400 text-sm">💡</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-300 mb-1">
                            Dica de Prompts Eficientes
                          </h4>
                          <p className="text-xs text-blue-200/70">
                            Prompts bem estruturados geram conteúdo mais consistente. Inclua tom de voz,
                            estrutura desejada e exemplos quando possível. Teste e refine seus prompts
                            para obter os melhores resultados.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'captions' && (
                <div className="p-8">
                  <div className="max-w-6xl mx-auto">
                    <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-lg">
                      <CaptionStyleEditor
                        initialConfig={captionStyleConfig}
                        onChange={setCaptionStyleConfig}
                      />
                    </div>

                    {/* Caption Info */}
                    <div className="mt-6 bg-purple-900/20 border border-purple-800/30 p-4 rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <span className="text-purple-400 text-sm">✨</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-purple-300 mb-1">
                            Sobre os Estilos de Legenda
                          </h4>
                          <p className="text-xs text-purple-200/70">
                            <strong>Tradicional:</strong> Legendas por segmento, ideais para conteúdo mais formal.<br />
                            <strong>Karaoke:</strong> Destaque palavra por palavra, perfeito para shorts e reels dinâmicos.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-8 py-6 border-t border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  {activeTab === 'general' && 'Configure os prompts e voz padrão do canal'}
                  {activeTab === 'captions' && 'Personalize o estilo das legendas geradas'}
                </div>
                {saveSuccess && (
                  <div className="flex items-center gap-2 bg-green-900/30 border border-green-700/50 px-4 py-2 rounded text-green-400 text-sm animate-fade-in">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Alterações salvas com sucesso!</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-all rounded"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSavePrompts}
                  disabled={isSaving}
                  className="bg-white text-black px-8 py-2.5 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded font-medium shadow-lg hover:shadow-xl"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              Tem certeza que deseja excluir o canal:
            </p>
            <p className="text-white font-semibold mb-6">
              "{confirmDelete.name}"
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Esta ação não pode ser desfeita e todos os roteiros e vídeos associados a este canal podem ser afetados.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                disabled={deletingChannel !== null}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteChannel(confirmDelete.id)}
                disabled={deletingChannel !== null}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {deletingChannel === confirmDelete.id ? (
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
    </div>
  );
}