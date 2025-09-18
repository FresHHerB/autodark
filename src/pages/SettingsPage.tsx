import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Play, Edit, Save } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

interface Voice {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  name: string;
  authKey: string;
}

const defaultVoices: Voice[] = [
  { id: 'feminina-suave', name: 'Feminina Suave' },
  { id: 'masculina-grave', name: 'Masculina Grave' },
  { id: 'feminina-energetica', name: 'Feminina Energética' },
  { id: 'masculina-jovem', name: 'Masculina Jovem' },
  { id: 'infantil-feminina', name: 'Infantil Feminina' },
  { id: 'infantil-masculina', name: 'Infantil Masculina' }
];

const defaultChannels: Channel[] = [
  { id: '1', name: 'ToonshineStudio', authKey: 'yt_auth_abc123def456' },
  { id: '2', name: 'TechReviewBR', authKey: 'yt_auth_ghi789jkl012' },
  { id: '3', name: 'CookingMaster', authKey: 'yt_auth_mno345pqr678' },
  { id: '4', name: 'FitnessLife', authKey: 'yt_auth_stu901vwx234' },
  { id: '5', name: 'GameplayZone', authKey: 'yt_auth_yza567bcd890' },
  { id: '6', name: 'TravelVlog', authKey: 'yt_auth_efg123hij456' }
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [voices, setVoices] = useState<Voice[]>(defaultVoices);
  const [channels, setChannels] = useState<Channel[]>(defaultChannels);
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newVoiceName, setNewVoiceName] = useState('');
  const [isAddingVoice, setIsAddingVoice] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelAuthKey, setNewChannelAuthKey] = useState('');
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);

  const handleDeleteVoice = (voiceId: string) => {
    setVoices(prev => prev.filter(voice => voice.id !== voiceId));
  };

  const handleAddVoice = () => {
    if (!newVoiceId.trim() || !newVoiceName.trim()) return;
    
    const newVoice: Voice = {
      id: newVoiceId.trim(),
      name: newVoiceName.trim()
    };
    
    setVoices(prev => [...prev, newVoice]);
    setNewVoiceId('');
    setNewVoiceName('');
    setIsAddingVoice(false);
  };

  const handleCancelAddVoice = () => {
    setNewVoiceId('');
    setNewVoiceName('');
    setIsAddingVoice(false);
  };

  const handleDeleteChannel = (channelId: string) => {
    setChannels(prev => prev.filter(channel => channel.id !== channelId));
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim() || !newChannelAuthKey.trim()) return;
    
    const newChannel: Channel = {
      id: Date.now().toString(),
      name: newChannelName.trim(),
      authKey: newChannelAuthKey.trim()
    };
    
    setChannels(prev => [...prev, newChannel]);
    setNewChannelName('');
    setNewChannelAuthKey('');
    setIsAddingChannel(false);
  };

  const handleCancelAddChannel = () => {
    setNewChannelName('');
    setNewChannelAuthKey('');
    setIsAddingChannel(false);
  };

  const handleEditChannel = (channelId: string) => {
    setEditingChannel(channelId);
  };

  const handleSaveChannel = (channelId: string, name: string, authKey: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, name: name.trim(), authKey: authKey.trim() }
        : channel
    ));
    setEditingChannel(null);
  };

  const handleCancelEditChannel = () => {
    setEditingChannel(null);
  };

  const handlePlayExample = (voiceId: string) => {
    console.log(`Playing example for voice: ${voiceId}`);
    // Aqui implementaria a reprodução do exemplo de voz
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
            <h1 className="text-2xl font-light text-white">Configurações Gerais</h1>
            <p className="text-gray-400 text-sm">
              Configure variáveis globais de criação de conteúdo
            </p>
          </div>
        </div>

        {/* Layout de 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna Esquerda - Meus Canais */}
          <div className="space-y-6">
            {/* Meus Canais Section - Estilo Corporativo */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">YT</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Meus Canais
                    </h2>
                    <p className="text-gray-400 text-xs">
                      Gerencie suas conexões do YouTube
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Channel List */}
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="bg-white/5 border border-gray-600/50 rounded-lg p-4 hover:bg-white/10 transition-all duration-200"
                  >
                    {editingChannel === channel.id ? (
                      <EditChannelForm
                        channel={channel}
                        onSave={handleSaveChannel}
                        onCancel={handleCancelEditChannel}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {channel.name}
                          </div>
                          <div className="text-gray-400 text-xs font-mono bg-gray-800/50 px-2 py-1 rounded">
                            🔑 {channel.authKey}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditChannel(channel.id)}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                            title="Editar canal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteChannel(channel.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                            title="Excluir canal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Channel Form */}
                {isAddingChannel && (
                  <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/30 rounded-lg p-4 space-y-3">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-blue-300 text-xs font-medium mb-1">
                          Nome do Canal
                        </label>
                        <input
                          type="text"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                          placeholder="ex: Meu Canal Incrível"
                        />
                      </div>
                      <div>
                        <label className="block text-blue-300 text-xs font-medium mb-1">
                          Auth Key
                        </label>
                        <input
                          type="text"
                          value={newChannelAuthKey}
                          onChange={(e) => setNewChannelAuthKey(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                          placeholder="ex: yt_auth_xyz789abc123"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={handleCancelAddChannel}
                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddChannel}
                        disabled={!newChannelName.trim() || !newChannelAuthKey.trim()}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Channel Button */}
                {!isAddingChannel && (
                  <button
                    onClick={() => setIsAddingChannel(true)}
                    className="w-full bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/30 border-dashed rounded-lg p-4 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Novo Canal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Modelos de Voz */}
          <div className="space-y-6">
            {/* Voice Models Section - Estilo Criativo */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🎤</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Modelos de Voz
                    </h2>
                    <p className="text-gray-400 text-xs">
                      Configure vozes para narração
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Voice List */}
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className="group bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-lg p-4 hover:from-emerald-500/10 hover:to-teal-500/10 hover:border-emerald-500/30 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          {voice.name}
                        </div>
                        <div className="text-gray-400 text-xs font-mono bg-gray-800/50 px-2 py-1 rounded">
                          🆔 {voice.id}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePlayExample(voice.id)}
                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-all group-hover:scale-110"
                        title="Reproduzir exemplo"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteVoice(voice.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all ml-2"
                      title="Excluir voz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add New Voice Form */}
                {isAddingVoice && (
                  <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/30 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-emerald-300 text-xs font-medium mb-1">
                          ID da Voz
                        </label>
                        <input
                          type="text"
                          value={newVoiceId}
                          onChange={(e) => setNewVoiceId(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                          placeholder="ex: nova-voz-masculina"
                        />
                      </div>
                      <div>
                        <label className="block text-emerald-300 text-xs font-medium mb-1">
                          Nome da Voz
                        </label>
                        <input
                          type="text"
                          value={newVoiceName}
                          onChange={(e) => setNewVoiceName(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                          placeholder="ex: Nova Voz Masculina"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={handleCancelAddVoice}
                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddVoice}
                        disabled={!newVoiceId.trim() || !newVoiceName.trim()}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Voice Button */}
                {!isAddingVoice && (
                  <button
                    onClick={() => setIsAddingVoice(true)}
                    className="w-full bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/30 border-dashed rounded-lg p-4 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-teal-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Adicionar Nova Voz</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente para editar canal
function EditChannelForm({ 
  channel, 
  onSave, 
  onCancel 
}: { 
  channel: Channel; 
  onSave: (id: string, name: string, authKey: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(channel.name);
  const [authKey, setAuthKey] = useState(channel.authKey);

  const handleSave = () => {
    if (!name.trim() || !authKey.trim()) return;
    onSave(channel.id, name, authKey);
  };

  return (
    <div className="space-y-3 bg-blue-500/5 border border-blue-500/30 rounded-lg p-3 -m-1">
      <div>
        <label className="block text-blue-300 text-xs font-medium mb-1">
          Nome do Canal
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 rounded transition-colors"
        />
      </div>
      <div>
        <label className="block text-blue-300 text-xs font-medium mb-1">
          Auth Key
        </label>
        <input
          type="text"
          value={authKey}
          onChange={(e) => setAuthKey(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 rounded transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !authKey.trim()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded flex items-center gap-2"
        >
          <Save className="w-3 h-3" />
          Salvar
        </button>
      </div>
    </div>
  );
}