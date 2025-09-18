import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Video as VideoIcon, ExternalLink, X, Edit } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import VoiceSelector from '../components/VoiceSelector';
import { supabase, Canal } from '../lib/supabase';

export default function ManageChannelPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Canal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChannelForModal, setSelectedChannelForModal] = useState<Canal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | undefined>();

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
    setModalOpen(true);
  };

  const handleSavePrompts = async () => {
    if (!selectedChannelForModal) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('canais')
        .update({
          prompt_titulo: selectedChannelForModal.prompt_titulo,
          prompt_roteiro: selectedChannelForModal.prompt_roteiro,
          voz_prefereida: selectedVoiceId || null
        })
        .eq('id', selectedChannelForModal.id);

      if (error) {
        throw error;
      }

      // Update local state
      setChannels(prev => prev.map(channel => 
        channel.id === selectedChannelForModal.id 
          ? { ...selectedChannelForModal, voz_prefereida: selectedVoiceId || null }
          : channel
      ));
      
      setModalOpen(false);
      setSelectedChannelForModal(null);
      setSelectedVoiceId(undefined);
    } catch (error) {
      console.error('Error saving prompts:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChannelForModal(null);
    setSelectedVoiceId(undefined);
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
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
                  onClick={() => handleChannelClick(canal)}
                  className={`
                    group cursor-pointer bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all duration-200 p-6
                  `}
                >
                  {/* Edit Icon */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="w-4 h-4 text-gray-400" />
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

      {/* Channel Prompts Modal */}
      {modalOpen && selectedChannelForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-light text-white">
                Editar Prompts - {selectedChannelForModal.nome_canal}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Seleção de Voz */}
                <VoiceSelector
                  selectedVoiceId={selectedVoiceId}
                  onVoiceSelect={setSelectedVoiceId}
                  label="Voz Preferida"
                />

                {/* Prompt Título */}
                <div>
                  <label className="block text-white font-medium mb-3">
                    Prompt Título
                  </label>
                  <textarea
                    value={selectedChannelForModal.prompt_titulo}
                    onChange={(e) => setSelectedChannelForModal(prev => 
                      prev ? { ...prev, prompt_titulo: e.target.value } : null
                    )}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 resize-none"
                    rows={4}
                    placeholder="Digite o prompt para geração de títulos..."
                  />
                </div>

                {/* Prompt Roteiro */}
                <div>
                  <label className="block text-white font-medium mb-3">
                    Prompt Roteiro
                  </label>
                  <textarea
                    value={selectedChannelForModal.prompt_roteiro}
                    onChange={(e) => setSelectedChannelForModal(prev => 
                      prev ? { ...prev, prompt_roteiro: e.target.value } : null
                    )}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-gray-600 resize-none"
                    rows={6}
                    placeholder="Digite o prompt para geração de roteiros..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrompts}
                disabled={isSaving}
                className="bg-white text-black px-6 py-2 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}