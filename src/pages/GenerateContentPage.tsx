import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import DashboardHeader from '../components/DashboardHeader';
import { Plus, Edit2, Save, X, FileText, Mic, Music, Loader2, Eye, Video, Search, ChevronDown, Play, Square, Download, VolumeX } from 'lucide-react';
import { supabase, Canal } from '../lib/supabase';

interface GeneratedTitle {
  id: string;
  text: string;
}

interface AddedTitle {
  id: string;
  text: string;
}

interface GeneratedScript {
  id_roteiro: string;
  titulo: string;
  roteiro: string;
  audio_path?: string;
}

interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string; // Plataforma da tabela apis
  idioma?: string;
  genero?: string;
  created_at: string;
  id_plataforma?: number; // ID da plataforma para referência
}

export default function GenerateContentPage() {
  const { execute, loading: generatingTitles } = useApi();

  const [channels, setChannels] = useState<Canal[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [voiceSearchTerm, setVoiceSearchTerm] = useState<string>('');
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('down');
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [playingScriptAudio, setPlayingScriptAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: { currentTime: number; duration: number } }>({});

  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [novaIdeia, setNovaIdeia] = useState<string>('');
  const [idioma, setIdioma] = useState<string>('pt-br');
  const [generatedTitles, setGeneratedTitles] = useState<GeneratedTitle[]>([]);
  const [addedTitles, setAddedTitles] = useState<AddedTitle[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Content generation states
  const [selectedGenerationType, setSelectedGenerationType] = useState<'gerar_roteiro' | 'gerar_roteiro_audio' | 'gerar_audio'>('gerar_roteiro');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [contentIdioma, setContentIdioma] = useState<string>('pt-br');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
  const [selectedScriptModal, setSelectedScriptModal] = useState<GeneratedScript | null>(null);

  // For gerar_audio mode
  const [existingScripts, setExistingScripts] = useState<GeneratedScript[]>([]);
  const [selectedScriptsForAudio, setSelectedScriptsForAudio] = useState<Set<string>>(new Set());
  const [loadingExistingScripts, setLoadingExistingScripts] = useState(false);

  // Load channels and voices on component mount
  useEffect(() => {
    loadChannels();
    loadVoices();
  }, []);

  // Close voice dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Only close if not clicking on the dropdown trigger or inside the dropdown
      if (target && !target.closest('.voice-dropdown-container')) {
        setShowVoiceDropdown(false);
      }
    };

    if (showVoiceDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showVoiceDropdown]);

  // Auto-select preferred voice when channel changes
  useEffect(() => {
    if (selectedChannelId && channels.length > 0 && voices.length > 0) {
      const selectedChannel = channels.find(c => c.id.toString() === selectedChannelId);
      if (selectedChannel?.voz_prefereida) {
        // Check if preferred voice exists in voices list
        const preferredVoice = voices.find(v => v.id === selectedChannel.voz_prefereida);
        if (preferredVoice) {
          setSelectedVoiceId(selectedChannel.voz_prefereida);
        } else {
          // If preferred voice doesn't exist, select first voice
          setSelectedVoiceId(voices.length > 0 ? voices[0].id : null);
        }
      } else {
        // If channel has no preferred voice, select first voice
        setSelectedVoiceId(voices.length > 0 ? voices[0].id : null);
      }
    } else if (voices.length > 0 && !selectedVoiceId) {
      // If no channel selected but voices available, select first voice
      setSelectedVoiceId(voices[0].id);
    }
  }, [selectedChannelId, channels, voices]);

  const loadChannels = async () => {
    try {
      setChannelsLoading(true);
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('nome_canal', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    } finally {
      setChannelsLoading(false);
    }
  };

  const loadVoices = async () => {
    try {
      setVoicesLoading(true);
      const { data, error } = await supabase
        .from('vozes')
        .select(`
          id,
          nome_voz,
          voice_id,
          idioma,
          genero,
          created_at,
          id_plataforma,
          apis!vozes_id_plataforma_fkey (
            plataforma
          )
        `)
        .order('nome_voz', { ascending: true });

      if (error) throw error;

      // Transform data to include platform name from apis table
      const transformedData = data?.map((voice: any) => ({
        id: voice.id,
        nome_voz: voice.nome_voz,
        voice_id: voice.voice_id,
        idioma: voice.idioma,
        genero: voice.genero,
        created_at: voice.created_at,
        id_plataforma: voice.id_plataforma,
        plataforma: voice.apis?.plataforma || 'Outros'
      })) || [];

      setVoices(transformedData);
    } catch (error) {
      console.error('Erro ao carregar vozes:', error);
    } finally {
      setVoicesLoading(false);
    }
  };

  const loadExistingScripts = async () => {
    if (!selectedChannelId) {
      alert('Por favor, selecione um canal primeiro.');
      return;
    }

    try {
      setLoadingExistingScripts(true);
      console.log('🔍 Carregando roteiros para canal:', selectedChannelId);

      // Primeiro tentar com RPC (contorna RLS)
      console.log('🔍 Tentando com função RPC...');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_roteiros_sem_audio', { canal_param: parseInt(selectedChannelId) });

      if (!rpcError && rpcData) {
        console.log('✅ RPC funcionou! Dados encontrados:', rpcData.length);
        const scripts: GeneratedScript[] = rpcData.map((script: any) => ({
          id_roteiro: script.id.toString(),
          titulo: script.titulo || 'Sem título',
          roteiro: script.roteiro || 'Sem roteiro',
          audio_path: undefined
        }));
        setExistingScripts(scripts);
        console.log('📋 Scripts carregados via RPC:', scripts.length);
        return;
      }

      console.log('⚠️ RPC falhou ou não existe:', rpcError?.message);
      console.log('🔍 Tentando query direta...');

      // Fallback: Query direta (pode não funcionar se RLS estiver ativo)
      const { data, error } = await supabase
        .from('roteiros')
        .select('id, titulo, roteiro, canal_id, audio_path')
        .eq('canal_id', parseInt(selectedChannelId))
        .is('audio_path', null);

      console.log('📊 Query direta:', { data, error, dataLength: data?.length });

      if (error) {
        console.error('❌ Erro na query direta:', error);
        alert(`Problema de acesso ao banco: ${error.message}\n\nPossível solução: Execute o SQL fornecido no arquivo supabase_rls_fix.sql no seu Supabase SQL Editor.`);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhum roteiro encontrado para o canal', selectedChannelId);
        setExistingScripts([]);
        return;
      }

      const scripts: GeneratedScript[] = data.map((script: any) => ({
        id_roteiro: script.id.toString(),
        titulo: script.titulo || 'Sem título',
        roteiro: script.roteiro || 'Sem roteiro',
        audio_path: undefined
      }));

      setExistingScripts(scripts);
      console.log('📋 Scripts carregados via query direta:', scripts.length);

    } catch (error) {
      console.error('❌ Erro geral:', error);
      alert('Erro ao carregar roteiros. Verifique o console para detalhes.');
    } finally {
      setLoadingExistingScripts(false);
    }
  };

  const handleGenerateTitles = async () => {
    if (!selectedChannelId || !novaIdeia.trim()) {
      alert('Por favor, selecione um canal e digite uma nova ideia.');
      return;
    }

    try {
      const payload = {
        id_canal: selectedChannelId,
        nova_ideia: novaIdeia,
        idioma: idioma,
        tipo_geracao: 'gerar_titulos'
      };

      const response = await execute(() =>
        apiService.generateContent(payload)
      );

      console.log('Generate titles response:', response);

      // Handle the specific response format: [{ "output": { "titulos": { "titulo_1": "...", ... } } }]
      if (response && Array.isArray(response) && response.length > 0) {
        const firstItem = response[0];
        if (firstItem && firstItem.output && firstItem.output.titulos) {
          const titulosObject = firstItem.output.titulos;
          const newTitles = Object.values(titulosObject).map((title: any, index: number) => ({
            id: `generated-${Date.now()}-${index}`,
            text: title
          }));
          setGeneratedTitles(newTitles);
        } else {
          console.error('Unexpected response format:', response);
          alert('Formato de resposta inesperado. Verifique os logs do console.');
        }
      } else {
        console.error('Invalid response format:', response);
        alert('Resposta inválida do servidor. Verifique os logs do console.');
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      alert('Erro ao gerar títulos. Tente novamente.');
    }
  };

  const handleAddTitle = (title: GeneratedTitle) => {
    const newAddedTitle: AddedTitle = {
      id: `added-${Date.now()}`,
      text: title.text
    };
    setAddedTitles(prev => [...prev, newAddedTitle]);
  };

  const handleEditTitle = (titleId: string) => {
    const title = addedTitles.find(t => t.id === titleId);
    if (title) {
      setEditingTitleId(titleId);
      setEditingText(title.text);
    }
  };

  const handleSaveEdit = () => {
    if (!editingTitleId) return;

    setAddedTitles(prev =>
      prev.map(title =>
        title.id === editingTitleId
          ? { ...title, text: editingText }
          : title
      )
    );

    setEditingTitleId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingTitleId(null);
    setEditingText('');
  };

  const handleRemoveAddedTitle = (titleId: string) => {
    setAddedTitles(prev => prev.filter(title => title.id !== titleId));
  };

  const handleScriptSelection = (scriptId: string) => {
    setSelectedScriptsForAudio(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(scriptId)) {
        newSelection.delete(scriptId);
      } else {
        newSelection.add(scriptId);
      }
      return newSelection;
    });
  };

  const clearScriptSelection = () => {
    setSelectedScriptsForAudio(new Set());
  };

  const handleGenerateContent = async () => {
    // Validation for gerar_audio mode
    if (selectedGenerationType === 'gerar_audio') {
      if (selectedScriptsForAudio.size === 0 || !selectedVoiceId) {
        alert('Para gerar áudio, selecione pelo menos um roteiro e uma voz.');
        return;
      }
    } else {
      // Basic validation for other modes
      if (!selectedChannelId || addedTitles.length === 0 || !selectedModel.trim() || !contentIdioma.trim()) {
        alert('Por favor, selecione um canal, adicione pelo menos um título, escolha um modelo e digite o idioma.');
        return;
      }

      // Additional validation for voice-requiring generation types
      if (selectedGenerationType === 'gerar_roteiro_audio' && !selectedVoiceId) {
        alert('Para esta opção, é necessário selecionar uma voz.');
        return;
      }
    }

    setIsGeneratingContent(true);
    try {
      let payload: any;

      if (selectedGenerationType === 'gerar_audio') {
        // Special payload for gerar_audio
        const selectedVoice = voices.find(v => v.id === selectedVoiceId);
        payload = {
          id_roteiro: Array.from(selectedScriptsForAudio),
          voice_id: selectedVoice?.voice_id,
          speed: audioSpeed,
          tipo_geracao: selectedGenerationType
        };
      } else {
        // Standard payload for other generation types
        payload = {
          id_canal: selectedChannelId,
          titulos: addedTitles.map(title => title.text),
          modelo: selectedModel,
          idioma: contentIdioma,
          tipo_geracao: selectedGenerationType
        };

        // Add voice and speed for audio generation types
        if (selectedGenerationType === 'gerar_roteiro_audio') {
          const selectedVoice = voices.find(v => v.id === selectedVoiceId);
          if (selectedVoice) {
            payload = {
              ...payload,
              id_voz: selectedVoice.voice_id,
              speed: audioSpeed
            };
          }
        }
      }

      console.log('Generate content payload:', payload);

      const response = await execute(() =>
        apiService.generateContent(payload)
      );

      console.log('Generate content response:', response);

      // Handle the response format: [{ "id_roteiro": "18", "titulo": "...", "roteiro": "...", "audio_path": "..." }, ...]
      if (response && Array.isArray(response)) {
        const processedScripts: GeneratedScript[] = response.map((item: any, index: number) => ({
          id_roteiro: item.id_roteiro || `temp-${Date.now()}-${index}`,
          titulo: item.titulo || 'Título não disponível',
          roteiro: item.roteiro || '',
          audio_path: item.audio_path
        }));

        setGeneratedScripts(processedScripts);
      } else {
        console.error('Invalid response format:', response);
        alert('Formato de resposta inesperado do servidor.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Erro ao gerar conteúdo. Tente novamente.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const modelOptions = [
    { value: 'Sonnet-4', label: 'Sonnet-4' },
    { value: 'GPT-5', label: 'GPT-5' },
    { value: 'GPT-5-mini', label: 'GPT-5-mini' },
    { value: 'Gemini-2.5-Pro', label: 'Gemini-2.5-Pro' },
    { value: 'Gemini-2.5-Flash', label: 'Gemini-2.5-Flash' }
  ];

  const generationTypeOptions = [
    {
      id: 'gerar_roteiro' as const,
      title: 'Gerar Roteiro',
      description: 'Gera apenas o roteiro de texto',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'gerar_roteiro_audio' as const,
      title: 'Gerar Roteiro e Áudio',
      description: 'Gera roteiro completo com narração',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'gerar_audio' as const,
      title: 'Gerar Áudio',
      description: 'Gera áudio para roteiros existentes',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  // Helper function for card colors (same as ScriptGenerationPage)
  const getCardColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400' },
      { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-400' },
      { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-pink-400' },
      { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-indigo-400' },
      { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-400' },
      { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-400' },
      { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-400' },
      { bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-400' },
      { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-teal-400' },
      { bg: 'bg-violet-500', border: 'border-violet-400', text: 'text-violet-400' }
    ];
    return colors[index % colors.length];
  };

  const closeScriptModal = () => {
    setSelectedScriptModal(null);
  };

  // Helper functions for voice management
  const filteredVoices = voices.filter(voice =>
    voice.nome_voz.toLowerCase().includes(voiceSearchTerm.toLowerCase())
  );

  const voicesByPlatform = filteredVoices.reduce((acc, voice) => {
    const platform = voice.plataforma || 'Outros';
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);


  const selectedVoice = voices.find(v => v.id === selectedVoiceId);

  const handleVoiceSelect = (voiceId: number) => {
    setSelectedVoiceId(voiceId);
    setShowVoiceDropdown(false);
    setVoiceSearchTerm('');
  };

  const handleDropdownToggle = (event: React.MouseEvent) => {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 320; // max-h-80 = 320px
    const buffer = 20; // Extra buffer to prevent edge cases

    // Check if dropdown would overflow below viewport
    const spaceBelow = viewportHeight - rect.bottom - buffer;
    const spaceAbove = rect.top - buffer;
    const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

    setDropdownDirection(shouldOpenUp ? 'up' : 'down');
    setShowVoiceDropdown(!showVoiceDropdown);
  };

  // Audio control functions
  const playAudio = (audioUrl: string, audioId: string) => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      setPlayingAudio(null);
    });

    audio.addEventListener('error', () => {
      setPlayingAudio(null);
      alert('Erro ao reproduzir áudio');
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      alert('Erro ao reproduzir áudio');
    });
  };

  const pauseAudio = () => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
      setPlayingAudio(null);
    }
  };

  const isAudioPlaying = (audioId: string) => {
    return playingAudio?.id === audioId;
  };

  // Generate voice test audio
  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    try {
      const voice = voices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error('Voz não encontrada');
      }

      console.log('🔄 Buscando preview fresh para voz:', voice.nome_voz, 'Plataforma:', voice.plataforma);

      // Get API key from apis table
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', voice.plataforma)
        .single();

      if (apiError || !apiData?.api_key) {
        throw new Error(`API key não encontrada para ${voice.plataforma}`);
      }

      console.log('✅ API key encontrada para:', voice.plataforma);

      if (voice.plataforma === 'ElevenLabs') {
        console.log('📡 Fazendo requisição para ElevenLabs API...');

        const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'xi-api-key': apiData.api_key,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ElevenLabs API: ${response.status} - ${errorText}`);
        }

        const voiceData = await response.json();
        console.log('📦 Resposta ElevenLabs:', {
          voice_id: voiceData.voice_id,
          name: voiceData.name,
          has_preview: !!voiceData.preview_url
        });

        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }

        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
        console.log('📡 Fazendo requisição para Fish-Audio API...');

        const response = await fetch(`https://api.fish.audio/model/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiData.api_key}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro Fish-Audio API: ${response.status} - ${errorText}`);
        }

        const voiceData = await response.json();
        console.log('📦 Resposta Fish-Audio:', {
          _id: voiceData._id,
          title: voiceData.title,
          samples_count: voiceData.samples?.length || 0,
          has_first_sample: !!voiceData.samples?.[0]?.audio
        });

        // Fish-Audio retorna samples, pegamos o primeiro sample de áudio
        if (!voiceData.samples || voiceData.samples.length === 0 || !voiceData.samples[0].audio) {
          throw new Error('Nenhum preview de áudio disponível para esta voz Fish-Audio');
        }

        return voiceData.samples[0].audio;
      }

      throw new Error('Plataforma não suportada para teste');
    } catch (error) {
      console.error('❌ Erro ao gerar teste de voz:', error);

      // Verificar se é erro de CORS e sugerir Edge Function
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conectividade. Verifique se as Edge Functions estão funcionando ou se há problemas de CORS.');
      }

      throw error;
    }
  };

  const playSelectedVoicePreview = () => {
    if (!selectedVoiceId) return;

    const audioId = `voice-preview-${selectedVoiceId}`;

    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(selectedVoiceId));

    generateVoiceTest(selectedVoiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao testar voz';

        // Mostrar mensagem mais amigável
        if (errorMessage.includes('Edge Function') || errorMessage.includes('CORS')) {
          alert('Preview de áudio temporariamente indisponível. Tente novamente em alguns momentos.');
        } else {
          alert(errorMessage);
        }
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVoiceId);
          return newSet;
        });
      });
  };

  // Helper function to check if voice has preview available
  const hasVoicePreview = (voiceId: number) => {
    const voice = voices.find(v => v.id === voiceId);
    // Since we always fetch dynamically, we'll assume preview is available for supported platforms
    return voice && (voice.plataforma === 'ElevenLabs' || voice.plataforma === 'Fish-Audio');
  };

  // Script audio control functions
  const playScriptAudio = (audioUrl: string, scriptId: string) => {
    if (playingScriptAudio) {
      playingScriptAudio.audio.pause();
      playingScriptAudio.audio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      setPlayingScriptAudio(null);
      setAudioProgress(prev => ({
        ...prev,
        [scriptId]: { currentTime: 0, duration: audio.duration || 0 }
      }));
    });

    audio.addEventListener('error', () => {
      setPlayingScriptAudio(null);
      alert('Erro ao reproduzir áudio do roteiro');
    });

    audio.addEventListener('loadedmetadata', () => {
      setAudioProgress(prev => ({
        ...prev,
        [scriptId]: { currentTime: 0, duration: audio.duration || 0 }
      }));
    });

    audio.addEventListener('timeupdate', () => {
      setAudioProgress(prev => ({
        ...prev,
        [scriptId]: { currentTime: audio.currentTime, duration: audio.duration || 0 }
      }));
    });

    audio.play().then(() => {
      setPlayingScriptAudio({ id: scriptId, audio });
    }).catch(() => {
      alert('Erro ao reproduzir áudio do roteiro');
    });
  };

  const pauseScriptAudio = () => {
    if (playingScriptAudio) {
      playingScriptAudio.audio.pause();
      playingScriptAudio.audio.currentTime = 0;
      setPlayingScriptAudio(null);
    }
  };

  const isScriptAudioPlaying = (scriptId: string) => {
    return playingScriptAudio?.id === scriptId;
  };

  const seekScriptAudio = (scriptId: string, seekTime: number) => {
    if (playingScriptAudio && playingScriptAudio.id === scriptId) {
      playingScriptAudio.audio.currentTime = seekTime;
      setAudioProgress(prev => ({
        ...prev,
        [scriptId]: {
          currentTime: seekTime,
          duration: prev[scriptId]?.duration || 0
        }
      }));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadAudio = (audioUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Gerar Conteúdo</h1>
          <p className="text-gray-400">
            Selecione um canal e gere títulos personalizados para seu conteúdo
          </p>
        </div>

        {/* Channel Selector */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Selecionar Canal
          </label>
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={channelsLoading}
          >
            <option value="">Selecione um canal...</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.nome_canal}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Titles Section */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-medium text-white mb-4">Gerar Títulos</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nova Ideia
              </label>
              <textarea
                value={novaIdeia}
                onChange={(e) => setNovaIdeia(e.target.value)}
                placeholder="Digite sua ideia para gerar títulos..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Idioma
              </label>
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pt-br">Português (Brasil)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateTitles}
            disabled={generatingTitles || !selectedChannelId || !novaIdeia.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {generatingTitles ? 'Gerando Títulos...' : 'Gerar Títulos'}
          </button>
        </div>

        {/* Show title generation section only for non-audio generation */}
        {selectedGenerationType !== 'gerar_audio' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generated Titles */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Títulos Gerados ({generatedTitles.length})
              </h3>

              {generatedTitles.length === 0 ? (
                <p className="text-gray-500 italic">Nenhum título gerado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {generatedTitles.map((title) => (
                    <div key={title.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <span className="flex-1 text-white text-sm">{title.text}</span>
                      <button
                        onClick={() => handleAddTitle(title)}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="Adicionar aos títulos selecionados"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Added Titles (Next Section) */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Títulos Selecionados ({addedTitles.length})
              </h3>

              {addedTitles.length === 0 ? (
                <p className="text-gray-500 italic">
                  Clique no botão "+" ao lado dos títulos gerados para adicioná-los aqui.
                </p>
              ) : (
                <div className="space-y-3">
                  {addedTitles.map((title) => (
                    <div key={title.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      {editingTitleId === title.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-white text-sm">{title.text}</span>
                          <button
                            onClick={() => handleEditTitle(title.id)}
                            className="p-1 text-gray-400 hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveAddedTitle(title.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Generator Section */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-medium text-white mb-4">Gerar Conteúdo</h2>
          <p className="text-gray-400 text-sm mb-6">
            Use os títulos selecionados para gerar roteiros, áudios ou ambos
          </p>

          {/* Generation Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Tipo de Geração
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generationTypeOptions.map((option) => {
                const isSelected = selectedGenerationType === option.id;
                const IconComponent = option.id === 'gerar_roteiro' ? FileText :
                                     option.id === 'gerar_roteiro_audio' ? Mic : Music;

                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedGenerationType(option.id)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-300 text-left
                      ${isSelected
                        ? `bg-gradient-to-r ${option.color} border-transparent text-white shadow-lg scale-105`
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800/70'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-white/20' : 'bg-gray-700'}
                      `}>
                        <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {option.title}
                        </h3>
                        <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                          {option.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Existing Scripts for Audio Generation - Show only when gerar_audio is selected */}
          {selectedGenerationType === 'gerar_audio' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Roteiros Existentes ({existingScripts.length})
                </h3>
                <div className="flex items-center space-x-3">
                  {selectedScriptsForAudio.size > 0 && (
                    <button
                      onClick={clearScriptSelection}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Limpar Seleção ({selectedScriptsForAudio.size})
                    </button>
                  )}
                  <button
                    onClick={loadExistingScripts}
                    disabled={loadingExistingScripts || !selectedChannelId}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {loadingExistingScripts ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Carregando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{selectedChannelId ? 'Carregar Roteiros' : 'Selecione um Canal'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {existingScripts.length === 0 ? (
                <p className="text-gray-500 italic">
                  Clique em "Carregar Roteiros" para ver roteiros sem áudio disponíveis.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {existingScripts.map((script) => {
                    const isSelected = selectedScriptsForAudio.has(script.id_roteiro);
                    return (
                      <div
                        key={script.id_roteiro}
                        onClick={() => handleScriptSelection(script.id_roteiro)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs text-gray-400">Roteiro #{script.id_roteiro}</span>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                        </div>
                        <h4 className="text-white font-medium mb-2 line-clamp-2 text-sm">
                          {script.titulo}
                        </h4>
                        <p className="text-gray-300 text-xs line-clamp-3">
                          {script.roteiro.substring(0, 120)}
                          {script.roteiro.length > 120 && '...'}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {script.roteiro.length} caracteres
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Model and Language Row - Hidden for gerar_audio */}
          {selectedGenerationType !== 'gerar_audio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Model Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Modelo de IA
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um modelo...</option>
                {modelOptions.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Idioma
              </label>
              <input
                type="text"
                value={contentIdioma}
                onChange={(e) => setContentIdioma(e.target.value)}
                placeholder="Ex: pt-br, en, es..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          )}

          {/* Voice Selection and Speed Control - Only for audio generation types */}
          {(selectedGenerationType === 'gerar_roteiro_audio' || selectedGenerationType === 'gerar_audio') && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
              {/* Voice Selection - Responsive width based on generation type */}
              <div className={selectedGenerationType === 'gerar_audio' ? 'md:col-span-6' : 'md:col-span-4'}>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Voz para Áudio
                </label>
                {voicesLoading ? (
                  <div className="flex items-center space-x-2 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400 text-sm">Carregando...</span>
                  </div>
                ) : (
                  <div className="relative voice-dropdown-container">
                    {/* Custom Voice Selector */}
                    <div
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onClick={handleDropdownToggle}
                    >
                      <span className="truncate">
                        {selectedVoice
                          ? `${selectedVoice.nome_voz} - ${selectedVoice.plataforma}${selectedVoice.idioma ? ` (${selectedVoice.idioma})` : ''}`
                          : 'Selecione uma voz...'
                        }
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Voice Dropdown */}
                    {showVoiceDropdown && (
                      <div
                        className={`absolute z-50 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden ${
                          dropdownDirection === 'up'
                            ? 'bottom-full mb-1'
                            : 'top-full mt-1'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Search Input */}
                        <div className="p-3 border-b border-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Buscar voz..."
                              value={voiceSearchTerm}
                              onChange={(e) => setVoiceSearchTerm(e.target.value)}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-10 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Voice List */}
                        <div className="max-h-60 overflow-y-auto">
                          {Object.entries(voicesByPlatform).map(([platform, platformVoices]) => (
                            <div key={platform}>
                              {/* Platform Header */}
                              <div className="px-3 py-2 bg-gray-700/50 border-b border-gray-600">
                                <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                                  {platform}
                                </span>
                              </div>

                              {/* Platform Voices */}
                              {platformVoices.map((voice) => (
                                <div
                                  key={voice.id}
                                  onClick={() => handleVoiceSelect(voice.id)}
                                  className={`px-3 py-2 cursor-pointer hover:bg-gray-700 transition-colors ${
                                    selectedVoiceId === voice.id ? 'bg-blue-600 text-white' : 'text-gray-300'
                                  }`}
                                >
                                  <div className="text-sm">
                                    {voice.nome_voz} - {voice.plataforma}
                                    {voice.idioma && (
                                      <span className="text-gray-400"> ({voice.idioma})</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}

                          {filteredVoices.length === 0 && (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                              Nenhuma voz encontrada
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Preview Button */}
                {selectedVoiceId && (
                  <div className="mt-3">
                    <button
                      onClick={playSelectedVoicePreview}
                      disabled={selectedVoiceId ? testingVoices.has(selectedVoiceId) : false}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedVoiceId && testingVoices.has(selectedVoiceId)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isAudioPlaying(`voice-preview-${selectedVoiceId}`)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : hasVoicePreview(selectedVoiceId)
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                      title={hasVoicePreview(selectedVoiceId) ? 'Testar preview da voz' : 'Tentar obter preview da voz'}
                    >
                      {selectedVoiceId && testingVoices.has(selectedVoiceId) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Carregando...</span>
                        </>
                      ) : isAudioPlaying(`voice-preview-${selectedVoiceId}`) ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Parar Preview</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>{hasVoicePreview(selectedVoiceId) ? 'Testar Voz' : 'Tentar Preview'}</span>
                        </>
                      )}
                    </button>
                    {selectedVoiceId && !hasVoicePreview(selectedVoiceId) && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ⚠️ Preview não disponível - clique para mais informações
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Audio Speed Control - Responsive width based on generation type */}
              <div className={selectedGenerationType === 'gerar_audio' ? 'md:col-span-6' : 'md:col-span-8'}>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Velocidade do Áudio: {audioSpeed}x
                </label>
                <div className="pt-2">
                  <div className="relative">
                    <input
                      type="range"
                      min="0.8"
                      max="1.2"
                      step="0.1"
                      value={audioSpeed}
                      onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                      className="w-full h-3 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((audioSpeed - 0.8) / 0.4) * 100}%, #374151 ${((audioSpeed - 0.8) / 0.4) * 100}%, #374151 100%)`,
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-orange-400 font-medium">0.8x (Lento)</span>
                    <span className="text-blue-400 font-bold">1.0x (Normal)</span>
                    <span className="text-green-400 font-medium">1.2x (Rápido)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Section - Different content based on generation type */}
          <div className="mb-6">
            {selectedGenerationType === 'gerar_audio' ? (
              /* Selected Scripts Summary */
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Roteiros Selecionados ({selectedScriptsForAudio.size})
                </label>
                {selectedScriptsForAudio.size === 0 ? (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                    <p className="text-gray-500 italic">
                      Nenhum roteiro selecionado. Carregue e selecione roteiros da seção acima primeiro.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      {Array.from(selectedScriptsForAudio).map((scriptId, index) => {
                        const script = existingScripts.find(s => s.id_roteiro === scriptId);
                        return (
                          <div key={scriptId} className="text-sm text-gray-300">
                            <span className="text-gray-500">{index + 1}.</span> {script?.titulo || `Roteiro #${scriptId}`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Selected Titles Summary */
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Títulos Selecionados ({addedTitles.length})
                </label>
                {addedTitles.length === 0 ? (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                    <p className="text-gray-500 italic">
                      Nenhum título selecionado. Adicione títulos da seção acima primeiro.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      {addedTitles.map((title, index) => (
                        <div key={title.id} className="text-sm text-gray-300">
                          <span className="text-gray-500">{index + 1}.</span> {title.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateContent}
              disabled={
                selectedGenerationType === 'gerar_audio'
                  ? (selectedScriptsForAudio.size === 0 || !selectedVoiceId || isGeneratingContent)
                  : (!selectedChannelId ||
                     addedTitles.length === 0 ||
                     !selectedModel.trim() ||
                     !contentIdioma.trim() ||
                     (selectedGenerationType === 'gerar_roteiro_audio' && !selectedVoiceId) ||
                     isGeneratingContent)
              }
              className={`
                flex items-center space-x-3 px-8 py-4 rounded-lg font-medium transition-all duration-300 transform
                ${(selectedGenerationType === 'gerar_audio'
                    ? (selectedScriptsForAudio.size === 0 || !selectedVoiceId || isGeneratingContent)
                    : (!selectedChannelId ||
                       addedTitles.length === 0 ||
                       !selectedModel.trim() ||
                       !contentIdioma.trim() ||
                       (selectedGenerationType === 'gerar_roteiro_audio' && !selectedVoiceId) ||
                       isGeneratingContent)
                  )
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                  : `bg-gradient-to-r ${generationTypeOptions.find(opt => opt.id === selectedGenerationType)?.color} text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl`
                }
              `}
            >
              {isGeneratingContent ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  {selectedGenerationType === 'gerar_roteiro' ? <FileText className="w-5 h-5" /> :
                   selectedGenerationType === 'gerar_roteiro_audio' ? <Mic className="w-5 h-5" /> :
                   <Music className="w-5 h-5" />}
                  <span>{generationTypeOptions.find(opt => opt.id === selectedGenerationType)?.title}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Scripts Display */}
        {generatedScripts.length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-white mb-2">Roteiros Gerados</h2>
                <p className="text-gray-400 text-sm">
                  {generatedScripts.length} roteiro{generatedScripts.length > 1 ? 's' : ''} criado{generatedScripts.length > 1 ? 's' : ''} com sucesso
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {generatedScripts.map((script, index) => {
                const color = getCardColor(index);
                return (
                  <div
                    key={script.id_roteiro}
                    className={`border-l-4 ${color.border} bg-gray-800/30 rounded-r-xl p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group`}
                    onClick={() => setSelectedScriptModal(script)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${color.bg} rounded-full`}></div>
                        <span className="text-xs text-gray-400">Roteiro #{script.id_roteiro}</span>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedScriptModal(script);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-white font-medium mb-2 line-clamp-2 text-sm">
                      {script.titulo}
                    </h3>

                    <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                      {script.roteiro.substring(0, 150)}
                      {script.roteiro.length > 150 && '...'}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {script.roteiro.length} caracteres
                      </span>
                      {script.audio_path && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isScriptAudioPlaying(script.id_roteiro)) {
                                pauseScriptAudio();
                              } else {
                                playScriptAudio(script.audio_path!, script.id_roteiro);
                              }
                            }}
                            className={`p-1.5 rounded-md transition-all duration-200 ${
                              isScriptAudioPlaying(script.id_roteiro)
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            title={isScriptAudioPlaying(script.id_roteiro) ? 'Parar áudio' : 'Reproduzir áudio'}
                          >
                            {isScriptAudioPlaying(script.id_roteiro) ? (
                              <Square className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAudio(script.audio_path!, `${script.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_audio.mp3`);
                            }}
                            className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-all duration-200"
                            title="Download áudio"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Audio Progress Bar */}
                    {script.audio_path && audioProgress[script.id_roteiro] && (
                      <div className="mt-3 px-1">
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                          <span>{formatTime(audioProgress[script.id_roteiro].currentTime)}</span>
                          <div className="flex-1">
                            <div className="bg-gray-700 rounded-full h-1 relative cursor-pointer">
                              <div
                                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                                style={{
                                  width: `${audioProgress[script.id_roteiro].duration > 0
                                    ? (audioProgress[script.id_roteiro].currentTime / audioProgress[script.id_roteiro].duration) * 100
                                    : 0}%`
                                }}
                              ></div>
                              <input
                                type="range"
                                min="0"
                                max={audioProgress[script.id_roteiro].duration || 100}
                                value={audioProgress[script.id_roteiro].currentTime || 0}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const seekTime = parseFloat(e.target.value);
                                  seekScriptAudio(script.id_roteiro, seekTime);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </div>
                          </div>
                          <span>{formatTime(audioProgress[script.id_roteiro].duration)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Script Detail Modal */}
      {selectedScriptModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeScriptModal}
        >
          <div
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">
                    Detalhes do Roteiro
                  </h2>
                  <p className="text-gray-400 text-sm">ID: {selectedScriptModal.id_roteiro}</p>
                </div>
              </div>
              <button
                onClick={closeScriptModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Audio Controls - Only show if audio_path exists */}
                {selectedScriptModal.audio_path && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Áudio Gerado
                    </label>
                    <div className="p-4 bg-black/50 border border-gray-700 rounded-xl">
                      <div className="flex items-center justify-center space-x-4">
                        <button
                          onClick={() => {
                            if (isScriptAudioPlaying(selectedScriptModal.id_roteiro)) {
                              pauseScriptAudio();
                            } else {
                              playScriptAudio(selectedScriptModal.audio_path!, selectedScriptModal.id_roteiro);
                            }
                          }}
                          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                            isScriptAudioPlaying(selectedScriptModal.id_roteiro)
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {isScriptAudioPlaying(selectedScriptModal.id_roteiro) ? (
                            <>
                              <Square className="w-5 h-5" />
                              <span>Parar Áudio</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              <span>Reproduzir Áudio</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            downloadAudio(selectedScriptModal.audio_path!, `${selectedScriptModal.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_audio.mp3`);
                          }}
                          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                        >
                          <Download className="w-5 h-5" />
                          <span>Download Áudio</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Progress Bar in Modal */}
                {selectedScriptModal.audio_path && audioProgress[selectedScriptModal.id_roteiro] && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Progresso do Áudio
                    </label>
                    <div className="p-4 bg-black/50 border border-gray-700 rounded-xl">
                      <div className="flex items-center space-x-3 text-sm text-gray-300">
                        <span className="w-12 text-right">{formatTime(audioProgress[selectedScriptModal.id_roteiro].currentTime)}</span>
                        <div className="flex-1">
                          <div className="bg-gray-700 rounded-full h-2 relative cursor-pointer">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                              style={{
                                width: `${audioProgress[selectedScriptModal.id_roteiro].duration > 0
                                  ? (audioProgress[selectedScriptModal.id_roteiro].currentTime / audioProgress[selectedScriptModal.id_roteiro].duration) * 100
                                  : 0}%`
                              }}
                            ></div>
                            <input
                              type="range"
                              min="0"
                              max={audioProgress[selectedScriptModal.id_roteiro].duration || 100}
                              value={audioProgress[selectedScriptModal.id_roteiro].currentTime || 0}
                              onChange={(e) => {
                                const seekTime = parseFloat(e.target.value);
                                seekScriptAudio(selectedScriptModal.id_roteiro, seekTime);
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                        </div>
                        <span className="w-12">{formatTime(audioProgress[selectedScriptModal.id_roteiro].duration)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Título
                  </label>
                  <div className="p-4 bg-black/50 border border-gray-700 rounded-xl">
                    <h3 className="text-white text-lg font-medium">{selectedScriptModal.titulo}</h3>
                  </div>
                </div>

                {/* Script Content */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Roteiro Completo
                  </label>
                  <div className="p-4 bg-black/50 border border-gray-700 rounded-xl max-h-96 overflow-y-auto">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedScriptModal.roteiro}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    {selectedScriptModal.roteiro.length.toLocaleString()} caracteres
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}