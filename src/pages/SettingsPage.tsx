import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Settings,
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Loader2,
  CheckCircle,
  Key,
  Mic,
  Play,
  Square,
  RefreshCw,
  Upload,
  Download,
  BookOpen,
  FileText,
  Volume2
} from 'lucide-react';
import ImageModelCard from '../components/ImageModelCard';
import DashboardHeader from '../components/DashboardHeader';

interface API {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
}

interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string;
  idioma?: string;
  genero?: string;
  created_at: string;
  audio_file_path?: string;
}

interface ImageModel {
  id: number;
  name: string;
  air: string;
  created_at: string;
}

export default function SettingsPage() {
  const [apis, setApis] = useState<API[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ElevenLabs' | 'Fish-Audio' | 'Minimax'>('all');
  const [isLoadingApis, setIsLoadingApis] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Image Models State
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [isLoadingImageModels, setIsLoadingImageModels] = useState(true);

  const platforms = ['Fish-Audio', 'ElevenLabs', 'Minimax'];
  const allowedPlatforms = ['Fish-Audio', 'ElevenLabs', 'Minimax', 'Runware'];
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApi, setEditingApi] = useState<API | null>(null);
  const [apiForm, setApiForm] = useState({ plataforma: '', api_key: '' });
  const [isSavingApi, setIsSavingApi] = useState(false);

  // Image Model Modal State
  const [showImageModelModal, setShowImageModelModal] = useState(false);
  const [editingImageModel, setEditingImageModel] = useState<ImageModel | null>(null);
  const [imageModelForm, setImageModelForm] = useState({
    air: '',
    plataforma: 'Runware',
  });
  const [isSavingImageModel, setIsSavingImageModel] = useState(false);
  const [isCollectingModelData, setIsCollectingModelData] = useState(false);
  const [collectedModelData, setCollectedModelData] = useState<{
    nome_modelo: string;
    categoria: string;
    descricao: string;
    tags: string[];
  } | null>(null);
  const [autoCollectModelTimeout, setAutoCollectModelTimeout] = useState<NodeJS.Timeout | null>(null);

  // Voice Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [voiceForm, setVoiceForm] = useState({
    voice_id: '',
    plataforma: '',
  });
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [isCollectingVoiceData, setIsCollectingVoiceData] = useState(false);
  const [collectedVoiceData, setCollectedVoiceData] = useState<{
    nome_voz: string;
    idioma: string;
    genero: string;
  } | null>(null);
  const [autoCollectTimeout, setAutoCollectTimeout] = useState<NodeJS.Timeout | null>(null);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualEditReason, setManualEditReason] = useState<string>('');

  // Audio State
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [voiceTestError, setVoiceTestError] = useState<string>('');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    loadApis();
    loadVoices();
    loadImageModels();
  }, []);

  useEffect(() => {
    // Filter voices based on active filter
    if (activeFilter === 'all') {
      setFilteredVoices(voices);
    } else {
      setFilteredVoices(voices.filter(voice => voice.plataforma === activeFilter));
    }
  }, [voices, activeFilter]);

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Audio control functions
  const playAudio = (audioUrl: string, audioId: string) => {
    // Stop any currently playing audio
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
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      'Fish-Audio': 'bg-cyan-500',
      'ElevenLabs': 'bg-purple-500',
      'Minimax': 'bg-red-500'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-500';
  };

  const pauseAudio = () => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
      setPlayingAudio(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      'Fish-Audio': () => (
        <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">🐟</span>
        </div>
      ),
      'ElevenLabs': () => (
        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">11</span>
        </div>
      ),
      'Minimax': () => (
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">M</span>
        </div>
      )
    };
    return icons[platform as keyof typeof icons] || (() => <Settings className="w-5 h-5" />);
  };

  const isAudioPlaying = (audioId: string) => {
    return playingAudio?.id === audioId;
  };

  const loadApis = async () => {
    setIsLoadingApis(true);
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar APIs.' });
      } else {
        setApis(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingApis(false);
    }
  };

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
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

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar vozes.' });
      } else {
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
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const loadImageModels = async () => {
    setIsLoadingImageModels(true);
    try {
      const { data, error } = await supabase
        .from('modelos_imagem')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar modelos de imagem.' });
      } else {
        setImageModels(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingImageModels(false);
    }
  };

  // Collect voice data automatically using edge functions
  const collectVoiceData = async (voiceId: string, platform: string) => {
    console.log('🎯 [collectVoiceData] Iniciando coleta:', { voiceId, platform });

    if (!voiceId.trim() || !platform.trim()) {
      console.log('❌ [collectVoiceData] Campos vazios, limpando dados');
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
      setShowManualEdit(false);
      setManualEditReason('');
      return;
    }

    console.log('🔄 [collectVoiceData] Iniciando coleta de dados...');
    setIsCollectingVoiceData(true);
    setCollectedVoiceData(null);
    setCanPlayPreview(false);
    setShowManualEdit(false);
    setManualEditReason('');

    try {
      const apiData = apis.find(api => api.plataforma.toLowerCase() === platform.toLowerCase());
      if (!apiData) {
        throw new Error(`API key não encontrada para ${platform}`);
      }

      if (platform === 'ElevenLabs') {
        console.log('🎵 [collectVoiceData] Processando ElevenLabs...');

        let voiceData;
        try {
          // Primeira tentativa: Edge Function
          console.log('📡 Tentando Edge Function para ElevenLabs...');
          const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-elevenlabs-voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voice_id: voiceId,
              api_key: apiData.api_key
            })
          });

          if (!response.ok) {
            throw new Error(`Edge Function falhou: ${response.status}`);
          }

          const result = await response.json();
          voiceData = result.data;
          console.log('✅ Edge Function ElevenLabs bem-sucedida');
        } catch (edgeFunctionError) {
          console.log('⚠️ Edge Function falhou, tentando API direta:', edgeFunctionError.message);

          // Fallback: Chamada direta à API ElevenLabs
          const directResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
            method: 'GET',
            headers: {
              'xi-api-key': apiData.api_key,
              'Content-Type': 'application/json',
            },
          });

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Erro ElevenLabs API: ${directResponse.status} - ${errorText}`);
          }

          const rawData = await directResponse.json();
          console.log('✅ Chamada direta ElevenLabs bem-sucedida');

          // Processar dados igual à Edge Function
          voiceData = {
            voice_id: rawData.voice_id,
            nome_voz: rawData.name,
            plataforma: 'ElevenLabs',
            idioma: rawData.labels?.language === 'en' ? 'Inglês' :
                   rawData.labels?.language === 'pt' ? 'Português' :
                   rawData.labels?.language === 'es' ? 'Espanhol' :
                   rawData.labels?.language === 'fr' ? 'Francês' :
                   rawData.labels?.language === 'de' ? 'Alemão' :
                   'Inglês',
            genero: rawData.labels?.gender === 'male' ? 'Masculino' :
                    rawData.labels?.gender === 'female' ? 'Feminino' :
                    'Não especificado',
            preview_url: rawData.preview_url || '',
            description: rawData.description || '',
            category: rawData.category,
            age: rawData.labels?.age,
            accent: rawData.labels?.accent,
            use_case: rawData.labels?.use_case,
            popularity: (rawData.sharing?.liked_by_count || 0) + (rawData.sharing?.cloned_by_count || 0),
            settings: rawData.settings,
            raw_data: rawData
          };
        }

        setCollectedVoiceData({
          nome_voz: voiceData.nome_voz || 'Nome não disponível',
          idioma: voiceData.idioma || 'Não especificado',
          genero: voiceData.genero || 'Não especificado'
        });
        setCanPlayPreview(true);

      } else if (platform === 'Fish-Audio') {
        console.log('🐟 [collectVoiceData] Processando Fish-Audio...');

        let voiceData;
        try {
          // Primeira tentativa: Edge Function
          console.log('📡 Tentando Edge Function para Fish-Audio...');
          const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-fish-audio-voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voice_id: voiceId,
              api_key: apiData.api_key
            })
          });

          if (!response.ok) {
            throw new Error(`Edge Function falhou: ${response.status}`);
          }

          const result = await response.json();
          voiceData = result.data;
          console.log('✅ Edge Function Fish-Audio bem-sucedida');
        } catch (edgeFunctionError) {
          console.log('⚠️ Edge Function falhou, tentando API direta:', edgeFunctionError.message);

          // Fallback: Chamada direta à API Fish-Audio
          const directResponse = await fetch(`https://api.fish.audio/model/${voiceId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiData.api_key}`,
              'Content-Type': 'application/json',
            },
          });

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Erro Fish-Audio API: ${directResponse.status} - ${errorText}`);
          }

          const rawData = await directResponse.json();
          console.log('✅ Chamada direta Fish-Audio bem-sucedida');

          // Processar dados igual à Edge Function
          voiceData = {
            voice_id: rawData._id,
            nome_voz: rawData.title,
            plataforma: 'Fish-Audio',
            idioma: rawData.languages?.join(', ') || 'Não especificado',
            genero: 'Não especificado',
            preview_url: rawData.samples?.[0]?.audio || '',
            description: rawData.description || '',
            author: rawData.author?.nickname || 'Desconhecido',
            popularity: rawData.like_count || 0,
            samples: rawData.samples || [],
            raw_data: rawData
          };
        }

        setCollectedVoiceData({
          nome_voz: voiceData.nome_voz || 'Nome não disponível',
          idioma: voiceData.idioma || 'Não especificado',
          genero: voiceData.genero || 'Não especificado'
        });
        setCanPlayPreview(!!voiceData.preview_url);

      } else if (platform === 'Minimax') {
        console.log('🔴 [collectVoiceData] Processando Minimax...');
        // Para Minimax, habilitar edição manual com campos vazios
        setCollectedVoiceData({
          nome_voz: '',
          idioma: '',
          genero: 'Não especificado'
        });
        setShowManualEdit(true);
        setManualEditReason('Minimax requer preenchimento manual dos dados');
        setCanPlayPreview(false);
      }

      console.log('✅ [collectVoiceData] Coleta concluída com sucesso');

    } catch (error) {
      console.error('❌ [collectVoiceData] Erro ao coletar dados da voz:', error);
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
      setShowManualEdit(false);
      setManualEditReason('');
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao coletar dados da voz' });
    } finally {
      console.log('🏁 [collectVoiceData] Finalizando coleta');
      setIsCollectingVoiceData(false);
    }
  };

  // Auto-collect data when voice_id or platform changes
  const handleVoiceFormChange = (field: string, value: string) => {
    console.log('📝 [handleVoiceFormChange] Campo alterado:', { field, value });
    setVoiceForm(prev => ({ ...prev, [field]: value }));

    // Clear existing timeout
    if (autoCollectTimeout) {
      console.log('⏰ [handleVoiceFormChange] Limpando timeout anterior');
      clearTimeout(autoCollectTimeout);
    }

    // Set new timeout for auto-collection
    const newTimeout = setTimeout(() => {
      const updatedForm = { ...voiceForm, [field]: value };
      console.log('⏰ [handleVoiceFormChange] Timeout executado, form:', updatedForm);
      if (updatedForm.voice_id.trim() && updatedForm.plataforma.trim()) {
        console.log('✅ [handleVoiceFormChange] Condições atendidas, iniciando coleta');
        collectVoiceData(updatedForm.voice_id, updatedForm.plataforma);
      } else {
        console.log('❌ [handleVoiceFormChange] Condições não atendidas:', {
          voice_id: updatedForm.voice_id.trim(),
          plataforma: updatedForm.plataforma.trim()
        });
      }
    }, 800); // 800ms delay after user stops typing

    console.log('⏰ [handleVoiceFormChange] Novo timeout definido');
    setAutoCollectTimeout(newTimeout);
  };

  // Test voice preview in modal
  const testVoiceInModal = () => {
    if (!collectedVoiceData || !voiceForm.voice_id || !voiceForm.plataforma) return;

    const tempVoice: Voice = {
      id: 0,
      nome_voz: collectedVoiceData.nome_voz,
      voice_id: voiceForm.voice_id,
      plataforma: voiceForm.plataforma,
      idioma: collectedVoiceData.idioma,
      genero: collectedVoiceData.genero,
      created_at: new Date().toISOString()
    };

    const audioId = `modal-voice-preview`;

    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(0)); // Use ID 0 for modal preview

    generateVoiceTest(tempVoice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(0);
          return newSet;
        });
      });
  };

  // Image Model Functions
  const collectModelData = async (air: string, platform: string) => {
    console.log('🚀 [collectModelData] === INICIANDO COLETA DE DADOS ===');
    console.log('🎨 [collectModelData] Parâmetros recebidos:', { air, platform });
    console.log('🎨 [collectModelData] Tipo dos parâmetros:', {
      airType: typeof air,
      airLength: air?.length || 0,
      platformType: typeof platform,
      platformLength: platform?.length || 0
    });

    if (!air.trim() || platform !== 'Runware') {
      console.log('❌ [collectModelData] VALIDAÇÃO FALHOU - Campos vazios ou plataforma inválida');
      console.log('❌ [collectModelData] air.trim():', air.trim());
      console.log('❌ [collectModelData] platform:', platform);
      console.log('❌ [collectModelData] platform === "Runware":', platform === 'Runware');
      console.log('🧹 [collectModelData] Limpando dados coletados...');
      setCollectedModelData(null);
      return;
    }

    console.log('✅ [collectModelData] VALIDAÇÃO PASSOU - Iniciando coleta...');
    console.log('🔄 [collectModelData] Configurando estados...');
    setIsCollectingModelData(true);
    setCollectedModelData(null);
    console.log('🔄 [collectModelData] Estados configurados');

    try {
      console.log('🔍 [collectModelData] === BUSCANDO API KEY ===');
      console.log('🔍 [collectModelData] APIs disponíveis:', apis.map(a => ({
        plataforma: a.plataforma,
        id: a.id,
        hasApiKey: !!a.api_key,
        keyLength: a.api_key?.length || 0
      })));
      console.log('🔍 [collectModelData] Buscando plataforma:', platform);

      const apiData = apis.find(api => api.plataforma.toLowerCase() === platform.toLowerCase());
      console.log('🔍 [collectModelData] Resultado da busca:', {
        found: !!apiData,
        platform,
        availableAPIs: apis.map(a => a.plataforma),
        matchedPlatform: apiData?.plataforma,
        hasApiKey: !!apiData?.api_key,
        apiKeyLength: apiData?.api_key?.length || 0
      });

      if (!apiData) {
        throw new Error(`API key não encontrada para ${platform}`);
      }

      const requestPayload = {
        air: air,
        api_key: apiData.api_key
      };
      console.log('📤 [collectModelData] Enviando requisição para Edge Function:', {
        url: 'https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-runware-model',
        payload: { ...requestPayload, api_key: '***REDACTED***' }
      });

      let modelData;
      try {
        // Primeira tentativa: Edge Function
        console.log('🚀 [collectModelData] === INICIANDO EDGE FUNCTION ===');
        console.log('📤 [collectModelData] PAYLOAD sendo enviado:', JSON.stringify(requestPayload, null, 2));
        console.log('📤 [collectModelData] HEADERS enviados:', {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'UNDEFINED'}`,
          'Content-Type': 'application/json',
        });
        console.log('📤 [collectModelData] URL:', 'https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-runware-model');

        console.log('📡 Enviando requisição para Edge Function...');
        const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-runware-model`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        });

        console.log('📥 [collectModelData] === RESPOSTA DA EDGE FUNCTION ===');
        console.log('📥 [collectModelData] Status:', response.status);
        console.log('📥 [collectModelData] Status Text:', response.statusText);
        console.log('📥 [collectModelData] OK:', response.ok);
        console.log('📥 [collectModelData] Type:', response.type);
        console.log('📥 [collectModelData] URL:', response.url);
        console.log('📥 [collectModelData] Headers completos:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorText;
          try {
            errorText = await response.text();
            console.error('❌ [collectModelData] ERRO - Resposta da Edge Function (text):', errorText);

            // Tentar parsear como JSON se possível
            try {
              const errorJson = JSON.parse(errorText);
              console.error('❌ [collectModelData] ERRO - Como JSON:', JSON.stringify(errorJson, null, 2));
            } catch (jsonError) {
              console.log('ℹ️ [collectModelData] Resposta de erro não é JSON válido');
            }
          } catch (textError) {
            console.error('❌ [collectModelData] ERRO - Não foi possível ler texto da resposta:', textError);
            errorText = 'Erro ao ler resposta';
          }
          throw new Error(`Edge Function falhou: ${response.status} - ${errorText}`);
        }

        let result;
        try {
          const responseText = await response.text();
          console.log('📊 [collectModelData] RESPOSTA RAW (texto):', responseText);

          result = JSON.parse(responseText);
          console.log('📊 [collectModelData] RESPOSTA PARSEADA (JSON):', JSON.stringify(result, null, 2));
        } catch (parseError) {
          console.error('❌ [collectModelData] ERRO ao parsear JSON da resposta:', parseError);
          throw new Error('Resposta da Edge Function não é JSON válido');
        }

        if (!result.data) {
          console.error('❌ [collectModelData] ERRO - Resposta sem propriedade "data":', result);
          throw new Error('Resposta da Edge Function sem dados válidos');
        }

        modelData = result.data;
        console.log('🔍 [collectModelData] MODEL DATA extraído:', JSON.stringify(modelData, null, 2));
        console.log('✅ [collectModelData] === EDGE FUNCTION SUCESSO ===');

      } catch (edgeFunctionError) {
        console.log('🔄 [collectModelData] === INICIANDO FALLBACK - API DIRETA ===');
        console.log('⚠️ [collectModelData] Edge Function falhou, motivo:', edgeFunctionError.message);
        console.error('🔍 [collectModelData] Stack trace do erro:', edgeFunctionError.stack);

        // Fallback: Chamada direta à API Runware
        const taskUUID = crypto.randomUUID();
        const directRequestBody = [
          {
            taskType: "modelSearch",
            taskUUID: taskUUID,
            search: air,
            visibility: ["public", "community"],
            limit: 1
          }
        ];

        console.log('📤 [collectModelData] PAYLOAD da API direta:', JSON.stringify(directRequestBody, null, 2));
        console.log('📤 [collectModelData] HEADERS da API direta:', {
          'Authorization': `Bearer ${apiData.api_key ? apiData.api_key.substring(0, 15) + '...' : 'UNDEFINED'}`,
          'Content-Type': 'application/json',
        });
        console.log('📤 [collectModelData] URL da API direta:', 'https://api.runware.ai/v1');
        console.log('📤 [collectModelData] Task UUID:', taskUUID);
        console.log('📤 [collectModelData] AIR pesquisado:', air);

        console.log('📡 Enviando requisição para API Runware direta...');
        const directResponse = await fetch('https://api.runware.ai/v1', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiData.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(directRequestBody)
        });

        console.log('📥 [collectModelData] === RESPOSTA DA API DIRETA ===');
        console.log('📥 [collectModelData] Status:', directResponse.status);
        console.log('📥 [collectModelData] Status Text:', directResponse.statusText);
        console.log('📥 [collectModelData] OK:', directResponse.ok);
        console.log('📥 [collectModelData] Type:', directResponse.type);
        console.log('📥 [collectModelData] URL:', directResponse.url);
        console.log('📥 [collectModelData] Headers completos:', Object.fromEntries(directResponse.headers.entries()));

        if (!directResponse.ok) {
          let errorText;
          try {
            errorText = await directResponse.text();
            console.error('❌ [collectModelData] ERRO - Resposta da API direta (text):', errorText);

            // Tentar parsear como JSON se possível
            try {
              const errorJson = JSON.parse(errorText);
              console.error('❌ [collectModelData] ERRO - Como JSON:', JSON.stringify(errorJson, null, 2));
            } catch (jsonError) {
              console.log('ℹ️ [collectModelData] Resposta de erro da API direta não é JSON válido');
            }
          } catch (textError) {
            console.error('❌ [collectModelData] ERRO - Não foi possível ler texto da resposta da API direta:', textError);
            errorText = 'Erro ao ler resposta';
          }
          throw new Error(`Runware API error: ${directResponse.status} - ${errorText}`);
        }

        let directResponseData;
        try {
          const responseText = await directResponse.text();
          console.log('📊 [collectModelData] RESPOSTA RAW da API direta (texto):', responseText);

          directResponseData = JSON.parse(responseText);
          console.log('📊 [collectModelData] RESPOSTA PARSEADA da API direta (JSON):', JSON.stringify(directResponseData, null, 2));
        } catch (parseError) {
          console.error('❌ [collectModelData] ERRO ao parsear JSON da resposta da API direta:', parseError);
          throw new Error('Resposta da API Runware não é JSON válido');
        }

        // Verificar se temos resultados
        console.log('🔍 [collectModelData] Verificando estrutura de dados...');
        console.log('🔍 [collectModelData] directResponseData?.data:', !!directResponseData?.data);
        console.log('🔍 [collectModelData] directResponseData.data.length:', directResponseData?.data?.length || 0);

        if (directResponseData?.data?.[0]) {
          console.log('🔍 [collectModelData] Primeiro item data:', JSON.stringify(directResponseData.data[0], null, 2));
          console.log('🔍 [collectModelData] directResponseData.data[0].results:', !!directResponseData.data[0].results);
          console.log('🔍 [collectModelData] directResponseData.data[0].results.length:', directResponseData.data[0].results?.length || 0);
        }

        if (!directResponseData?.data?.[0]?.results || directResponseData.data[0].results.length === 0) {
          console.error('❌ [collectModelData] ERRO - Nenhum resultado encontrado para:', air);
          console.log('🔍 [collectModelData] Estrutura recebida:', JSON.stringify(directResponseData, null, 2));
          throw new Error(`Nenhum modelo encontrado para o AIR: ${air}`);
        }

        // Processar dados igual à Edge Function
        const rawModelData = directResponseData.data[0].results[0];
        console.log('📦 [collectModelData] RAW MODEL DATA:', JSON.stringify(rawModelData, null, 2));

        modelData = {
          air: rawModelData.air,
          nome_modelo: rawModelData.name || 'Nome não disponível',
          plataforma: 'Runware',
          categoria: rawModelData.category || 'Não especificado',
          descricao: rawModelData.comment || '',
          tags: rawModelData.tags || [],
          preview_url: rawModelData.heroImage || '',
          creator: 'Runware',
          base_model: rawModelData.architecture || '',
          type: rawModelData.type || '',
          version: rawModelData.version || '',
          download_count: 0,
          like_count: 0,
          raw_data: rawModelData
        };

        console.log('🔧 [collectModelData] MODEL DATA processado:', JSON.stringify(modelData, null, 2));
        console.log('✅ [collectModelData] === API DIRETA SUCESSO ===');
      }

      console.log('🔍 [collectModelData] Dados processados do modelo:', modelData);

      console.log('🔧 [collectModelData] === PROCESSAMENTO FINAL ===');

      const collectedData = {
        nome_modelo: modelData.nome_modelo || 'Nome não disponível',
        categoria: modelData.categoria || 'Não especificado',
        descricao: modelData.descricao || '',
        tags: modelData.tags || []
      };

      console.log('💾 [collectModelData] COLLECTED DATA que será salvo no state:', JSON.stringify(collectedData, null, 2));
      console.log('💾 [collectModelData] Campos individuais:');
      console.log('  📝 nome_modelo:', collectedData.nome_modelo);
      console.log('  📁 categoria:', collectedData.categoria);
      console.log('  📄 descricao:', collectedData.descricao);
      console.log('  🏷️ tags:', collectedData.tags);
      console.log('  🏷️ tags.length:', collectedData.tags?.length || 0);

      console.log('🔄 [collectModelData] Chamando setCollectedModelData...');
      setCollectedModelData(collectedData);
      console.log('✅ [collectModelData] setCollectedModelData executado');

      console.log('✅ [collectModelData] === COLETA CONCLUÍDA COM SUCESSO ===');

    } catch (error) {
      console.error('❌ [collectModelData] Erro ao coletar dados do modelo:', error);
      console.error('🔍 [collectModelData] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      setCollectedModelData(null);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao coletar dados do modelo' });
    } finally {
      console.log('🏁 [collectModelData] Finalizando coleta');
      setIsCollectingModelData(false);
    }
  };

  const handleImageModelFormChange = (field: string, value: string) => {
    console.log('📝 [handleImageModelFormChange] Campo alterado:', { field, value });
    setImageModelForm(prev => ({ ...prev, [field]: value }));

    if (autoCollectModelTimeout) {
      console.log('⏰ [handleImageModelFormChange] Limpando timeout anterior');
      clearTimeout(autoCollectModelTimeout);
    }

    const newTimeout = setTimeout(() => {
      const updatedForm = { ...imageModelForm, [field]: value };
      console.log('⏰ [handleImageModelFormChange] Timeout executado, form:', updatedForm);
      if (updatedForm.air.trim() && updatedForm.plataforma.trim()) {
        console.log('✅ [handleImageModelFormChange] Condições atendidas, iniciando coleta');
        collectModelData(updatedForm.air, updatedForm.plataforma);
      }
    }, 800);

    console.log('⏰ [handleImageModelFormChange] Novo timeout definido');
    setAutoCollectModelTimeout(newTimeout);
  };

  const openImageModelModal = (model?: ImageModel) => {
    if (model) {
      setEditingImageModel(model);
      setImageModelForm({
        air: model.air,
        plataforma: 'Runware'
      });
      setCollectedModelData({
        nome_modelo: model.name,
        categoria: 'Carregado',
        descricao: '',
        tags: []
      });
    } else {
      setEditingImageModel(null);
      setImageModelForm({
        air: '',
        plataforma: 'Runware'
      });
      setCollectedModelData(null);
    }

    if (autoCollectModelTimeout) {
      clearTimeout(autoCollectModelTimeout);
      setAutoCollectModelTimeout(null);
    }

    setShowImageModelModal(true);
  };

  const closeImageModelModal = () => {
    if (autoCollectModelTimeout) {
      clearTimeout(autoCollectModelTimeout);
      setAutoCollectModelTimeout(null);
    }

    setShowImageModelModal(false);
    setEditingImageModel(null);
    setImageModelForm({
      air: '',
      plataforma: 'Runware'
    });
    setCollectedModelData(null);
  };

  const saveImageModel = async () => {
    if (!imageModelForm.air.trim() || !collectedModelData) {
      setMessage({ type: 'error', text: 'Preencha o AIR e colete os dados automaticamente.' });
      return;
    }

    setIsSavingImageModel(true);
    try {
      if (editingImageModel) {
        const { error } = await supabase
          .from('modelos_imagem')
          .update({
            name: collectedModelData.nome_modelo,
            air: imageModelForm.air
          })
          .eq('id', editingImageModel.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Modelo atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('modelos_imagem')
          .insert([{
            name: collectedModelData.nome_modelo,
            air: imageModelForm.air
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Modelo adicionado com sucesso!' });
      }

      closeImageModelModal();
      loadImageModels();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar modelo.' });
    } finally {
      setIsSavingImageModel(false);
    }
  };

  const deleteImageModel = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      const { error } = await supabase
        .from('modelos_imagem')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Modelo excluído com sucesso!' });
      loadImageModels();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir modelo.' });
    }
  };

  // API Functions
  const openApiModal = (api?: API) => {
    if (api) {
      setEditingApi(api);
      setApiForm({ plataforma: api.plataforma, api_key: api.api_key });
    } else {
      setEditingApi(null);
      setApiForm({ plataforma: '', api_key: '' });
    }
    setShowApiModal(true);
  };

  const closeApiModal = () => {
    setShowApiModal(false);
    setEditingApi(null);
    setApiForm({ plataforma: '', api_key: '' });
  };

  const saveApi = async () => {
    if (!apiForm.plataforma.trim() || !apiForm.api_key.trim()) {
      setMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }

    setIsSavingApi(true);
    try {
      if (editingApi) {
        // Update existing API
        const { error } = await supabase
          .from('apis')
          .update({
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          })
          .eq('id', editingApi.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API atualizada com sucesso!' });
      } else {
        // Create new API
        const { error } = await supabase
          .from('apis')
          .insert([{
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API adicionada com sucesso!' });
      }

      closeApiModal();
      loadApis();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar API.' });
    } finally {
      setIsSavingApi(false);
    }
  };

  const deleteApi = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta API?')) return;

    try {
      const { error } = await supabase
        .from('apis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'API excluída com sucesso!' });
      loadApis();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir API.' });
    }
  };

  // Voice Functions
  const openVoiceModal = (voice?: Voice) => {
    if (voice) {
      setEditingVoice(voice);
      setVoiceForm({
        voice_id: voice.voice_id,
        plataforma: voice.plataforma
      });
      setCollectedVoiceData({
        nome_voz: voice.nome_voz,
        idioma: voice.idioma || '',
        genero: voice.genero || ''
      });
      setCanPlayPreview(true);
    } else {
      setEditingVoice(null);
      setVoiceForm({
        voice_id: '',
        plataforma: ''
      });
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
    }

    // Clear any existing timeout
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
      setAutoCollectTimeout(null);
    }

    setShowVoiceModal(true);
  };

  const closeVoiceModal = () => {
    // Clear timeout on close
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
      setAutoCollectTimeout(null);
    }

    setShowVoiceModal(false);
    setEditingVoice(null);
    setVoiceForm({
      voice_id: '',
      plataforma: ''
    });
    setCollectedVoiceData(null);
    setCanPlayPreview(false);
    setShowManualEdit(false);
    setManualEditReason('');
  };

  const saveVoice = async () => {
    if (!voiceForm.voice_id.trim() || !voiceForm.plataforma.trim() || !collectedVoiceData) {
      setMessage({ type: 'error', text: 'Preencha o Voice ID, selecione a plataforma e colete os dados automaticamente.' });
      return;
    }

    // Find the platform ID in the apis table
    const platformApi = apis.find(api => api.plataforma.toLowerCase() === voiceForm.plataforma.toLowerCase());
    if (!platformApi) {
      setMessage({ type: 'error', text: 'API da plataforma não encontrada. Configure a API primeiro.' });
      return;
    }

    setIsSavingVoice(true);
    try {
      if (editingVoice) {
        // Update existing voice
        const { error } = await supabase
          .from('vozes')
          .update({
            nome_voz: collectedVoiceData.nome_voz,
            voice_id: voiceForm.voice_id,
            id_plataforma: platformApi.id,
            idioma: collectedVoiceData.idioma || null,
            genero: collectedVoiceData.genero || null
          })
          .eq('id', editingVoice.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz atualizada com sucesso!' });
      } else {
        // Create new voice
        const { error } = await supabase
          .from('vozes')
          .insert([{
            nome_voz: collectedVoiceData.nome_voz,
            voice_id: voiceForm.voice_id,
            id_plataforma: platformApi.id,
            idioma: collectedVoiceData.idioma || null,
            genero: collectedVoiceData.genero || null
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz adicionada com sucesso!' });
      }

      closeVoiceModal();
      loadVoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar voz.' });
    } finally {
      setIsSavingVoice(false);
    }
  };

  const deleteVoice = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta voz?')) return;

    try {
      const { error } = await supabase
        .from('vozes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Voz excluída com sucesso!' });
      loadVoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir voz.' });
    }
  };

  // Generate voice test audio
  const generateVoiceTest = async (voice: Voice): Promise<string> => {
    try {
      if (voice.plataforma === 'ElevenLabs') {
        // Get API key for ElevenLabs
        const apiData = apis.find(api => api.plataforma.toLowerCase() === voice.plataforma.toLowerCase());
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        let voiceData;
        try {
          // Primeira tentativa: Edge Function
          console.log('📡 generateVoiceTest: Tentando Edge Function para ElevenLabs...');
          const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-elevenlabs-voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voice_id: voice.voice_id,
              api_key: apiData.api_key
            })
          });

          if (!response.ok) {
            throw new Error(`Edge Function falhou: ${response.status}`);
          }

          const result = await response.json();
          voiceData = result.data;
          console.log('✅ generateVoiceTest: Edge Function ElevenLabs bem-sucedida');
        } catch (edgeFunctionError) {
          console.log('⚠️ generateVoiceTest: Edge Function falhou, tentando API direta:', edgeFunctionError.message);

          // Fallback: Chamada direta à API ElevenLabs
          const directResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}`, {
            method: 'GET',
            headers: {
              'xi-api-key': apiData.api_key,
              'Content-Type': 'application/json',
            },
          });

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Erro ElevenLabs API: ${directResponse.status} - ${errorText}`);
          }

          const rawData = await directResponse.json();
          console.log('✅ generateVoiceTest: Chamada direta ElevenLabs bem-sucedida');

          // Processar dados igual à Edge Function
          voiceData = {
            preview_url: rawData.preview_url || '',
            raw_data: rawData
          };
        }

        // Verifica se há preview_url disponível
        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }

        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
        // Get API key for Fish-Audio
        const apiData = apis.find(api => api.plataforma.toLowerCase() === voice.plataforma.toLowerCase());
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        let voiceData;
        try {
          // Primeira tentativa: Edge Function
          console.log('📡 generateVoiceTest: Tentando Edge Function para Fish-Audio...');
          const response = await fetch(`https://vstsnxvwvsaodulrvfjz.supabase.co/functions/v1/fetch-fish-audio-voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voice_id: voice.voice_id,
              api_key: apiData.api_key
            })
          });

          if (!response.ok) {
            throw new Error(`Edge Function falhou: ${response.status}`);
          }

          const result = await response.json();
          voiceData = result.data;
          console.log('✅ generateVoiceTest: Edge Function Fish-Audio bem-sucedida');
        } catch (edgeFunctionError) {
          console.log('⚠️ generateVoiceTest: Edge Function falhou, tentando API direta:', edgeFunctionError.message);

          // Fallback: Chamada direta à API Fish-Audio
          const directResponse = await fetch(`https://api.fish.audio/model/${voice.voice_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiData.api_key}`,
              'Content-Type': 'application/json',
            },
          });

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Erro Fish-Audio API: ${directResponse.status} - ${errorText}`);
          }

          const rawData = await directResponse.json();
          console.log('✅ generateVoiceTest: Chamada direta Fish-Audio bem-sucedida');

          // Processar dados igual à Edge Function
          voiceData = {
            preview_url: rawData.samples?.[0]?.audio || '',
            raw_data: rawData
          };
        }

        // Verifica se há preview_url disponível
        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz Fish-Audio');
        }

        return voiceData.preview_url;
      }

      // Minimax não tem teste de voz implementado ainda
      if (voice.plataforma === 'Minimax') {
        throw new Error('Teste de voz não disponível para Minimax');
      }

      throw new Error('Plataforma não suportada para teste');
    } catch (error) {
      console.error('Erro ao gerar teste de voz:', error);
      throw error;
    }
  };

  const testVoice = (voice: Voice) => {
    const audioId = `voice-test-${voice.id}`;

    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setIsTestingVoice(true);
    setVoiceTestError('');

    generateVoiceTest(voice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setIsTestingVoice(false);
      });
  };

  const testVoicePreview = (voice: Voice) => {
    const audioId = `voice-preview-${voice.id}`;

    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(voice.id));
    setVoiceTestError('');

    generateVoiceTest(voice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(voice.id);
          return newSet;
        });
      });
  };

  const elevenLabsCount = voices.filter(voice => voice.plataforma === 'ElevenLabs').length;
  const fishAudioCount = voices.filter(voice => voice.plataforma === 'Fish-Audio').length;
  const minimaxCount = voices.filter(voice => voice.plataforma === 'Minimax').length;

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Configurações</h1>
          <p className="text-gray-400">
            Gerencie suas APIs e vozes de IA
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-900/20 text-green-400 border-green-800'
              : 'bg-red-900/20 text-red-400 border-red-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Grid Layout for Voices and Image Models */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Voices Section */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-medium text-white mb-2">Vozes ({voices.length})</h2>
              <p className="text-gray-400">Gerencie suas vozes de IA das diferentes plataformas</p>
            </div>
            <button
              onClick={() => openVoiceModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Voz</span>
            </button>
          </div>

          {/* Voice Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeFilter === 'all'
                  ? 'bg-gray-700 text-white border border-gray-600'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded-full min-w-[24px] text-center">{voices.length}</span>
              <span>Todas</span>
            </button>
            <button
              onClick={() => setActiveFilter('ElevenLabs')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeFilter === 'ElevenLabs'
                  ? 'bg-purple-600 text-white border border-purple-500'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full min-w-[24px] text-center">{elevenLabsCount}</span>
              <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">11</span>
              </div>
              <span>ElevenLabs</span>
            </button>
            <button
              onClick={() => setActiveFilter('Fish-Audio')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeFilter === 'Fish-Audio'
                  ? 'bg-cyan-500 text-white border border-cyan-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span className="text-xs bg-cyan-500 text-white px-2 py-1 rounded-full min-w-[24px] text-center">{fishAudioCount}</span>
              <div className="w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">🐟</span>
              </div>
              <span>Fish-Audio</span>
            </button>
            <button
              onClick={() => setActiveFilter('Minimax')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeFilter === 'Minimax'
                  ? 'bg-red-500 text-white border border-red-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full min-w-[24px] text-center">{minimaxCount}</span>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">M</span>
              </div>
              <span>Minimax</span>
            </button>
          </div>

          {isLoadingVoices ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Carregando vozes...</span>
              </div>
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-light text-white mb-2">Nenhuma voz encontrada</h3>
              <p className="text-gray-400">
                {activeFilter === 'all'
                  ? 'Adicione suas vozes de IA para começar'
                  : `Nenhuma voz ${activeFilter} cadastrada`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVoices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  onEdit={() => openVoiceModal(voice)}
                  onDelete={() => deleteVoice(voice.id)}
                  onTest={() => testVoicePreview(voice)}
                  isPlaying={isAudioPlaying(`voice-preview-${voice.id}`)}
                  isTesting={testingVoices.has(voice.id)}
                  getPlatformColor={getPlatformColor}
                  getPlatformIcon={getPlatformIcon}
                />
              ))}
            </div>
          )}
          </div>

          {/* Image Models Section */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium text-white mb-2">Modelos de Imagem ({imageModels.length})</h2>
                <p className="text-gray-400">Gerencie seus modelos de IA para geração de imagens</p>
              </div>
              <button
                onClick={() => openImageModelModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Modelo</span>
              </button>
            </div>

            {isLoadingImageModels ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando modelos...</span>
                </div>
              </div>
            ) : imageModels.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">Nenhum modelo encontrado</h3>
                <p className="text-gray-400">Adicione seus modelos de IA para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {imageModels.map((model) => (
                  <ImageModelCard
                    key={model.id}
                    model={model}
                    onEdit={() => openImageModelModal(model)}
                    onDelete={() => deleteImageModel(model.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* APIs Section */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-medium text-white mb-2">APIs</h2>
              <p className="text-gray-400">Gerencie suas chaves de API das plataformas</p>
            </div>
            <button
              onClick={() => openApiModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar API</span>
            </button>
          </div>

          {isLoadingApis ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Carregando APIs...</span>
              </div>
            </div>
          ) : apis.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-light text-white mb-2">Nenhuma API configurada</h3>
              <p className="text-gray-400">Adicione suas chaves de API para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {apis.map((api) => (
                <ApiCard
                  key={api.id}
                  api={api}
                  onEdit={() => openApiModal(api)}
                  onDelete={() => deleteApi(api.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Modal */}
      {showApiModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-white">
                    {editingApi ? 'Editar API' : 'Adicionar API'}
                  </h3>
                  <button
                    onClick={closeApiModal}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Plataforma <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={apiForm.plataforma}
                      onChange={(e) => setApiForm(prev => ({ ...prev, plataforma: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma plataforma</option>
                      {allowedPlatforms.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={apiForm.api_key}
                      onChange={(e) => setApiForm(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="Cole sua API key aqui"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 mt-8">
                  <button
                    onClick={closeApiModal}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveApi}
                    disabled={isSavingApi}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-all duration-200"
                  >
                    {isSavingApi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingApi ? 'Atualizar' : 'Adicionar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Voice Modal */}
        {showVoiceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-white">
                    {editingVoice ? 'Editar Voz' : 'Adicionar Voz'}
                  </h3>
                  <button
                    onClick={closeVoiceModal}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Plataforma <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={voiceForm.plataforma}
                      onChange={(e) => handleVoiceFormChange('plataforma', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma plataforma</option>
                      {platforms.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Voice ID <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={voiceForm.voice_id}
                        onChange={(e) => handleVoiceFormChange('voice_id', e.target.value)}
                        placeholder="Cole o Voice ID da plataforma selecionada"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                      />
                      {isCollectingVoiceData && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Cole o Voice ID da plataforma selecionada
                    </p>
                  </div>

                  {/* Collected Voice Data Display */}
                  {collectedVoiceData && (
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-white">
                            {showManualEdit ? 'Edição Manual' : 'Dados Coletados'}
                          </h4>
                          {showManualEdit && (
                            <div className="px-2 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-800 rounded text-xs">
                              Manual
                            </div>
                          )}
                        </div>
                        {canPlayPreview && (
                          <button
                            onClick={testVoiceInModal}
                            disabled={testingVoices.has(0)}
                            className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-xs rounded-lg transition-all duration-200"
                          >
                            {testingVoices.has(0) ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Testando...</span>
                              </>
                            ) : isAudioPlaying('modal-voice-preview') ? (
                              <>
                                <Square className="w-3 h-3" />
                                <span>Parar</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Testar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Manual Edit Reason */}
                      {showManualEdit && manualEditReason && (
                        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0 mt-0.5"></div>
                            <div>
                              <p className="text-yellow-400 text-xs font-medium mb-1">Edição Manual Necessária</p>
                              <p className="text-yellow-300 text-xs">{manualEditReason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Nome da Voz - Editável */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Nome da Voz {showManualEdit && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="text"
                            value={collectedVoiceData.nome_voz}
                            onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, nome_voz: e.target.value } : null)}
                            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 ${
                              showManualEdit ? 'border-yellow-600' : 'border-gray-600'
                            }`}
                            placeholder="Nome da voz"
                            required={showManualEdit}
                          />
                        </div>

                        {/* Idioma - Editável */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Idioma {showManualEdit && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="text"
                            value={collectedVoiceData.idioma}
                            onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, idioma: e.target.value } : null)}
                            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 ${
                              showManualEdit ? 'border-yellow-600' : 'border-gray-600'
                            }`}
                            placeholder="Ex: Inglês, Português, etc."
                            required={showManualEdit}
                          />
                        </div>

                        {/* Gênero - Select editável */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Gênero
                          </label>
                          <select
                            value={collectedVoiceData.genero}
                            onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, genero: e.target.value } : null)}
                            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 ${
                              showManualEdit ? 'border-yellow-600' : 'border-gray-600'
                            }`}
                          >
                            <option value="Não especificado">Não especificado</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Neutro">Neutro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-4 mt-8">
                  <button
                    onClick={closeVoiceModal}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveVoice}
                    disabled={isSavingVoice || !collectedVoiceData || (showManualEdit && (!collectedVoiceData.nome_voz.trim() || !collectedVoiceData.idioma.trim()))}
                    className="flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-all duration-200"
                  >
                    {isSavingVoice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingVoice ? 'Atualizar' : 'Adicionar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Image Model Modal */}
        {showImageModelModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-white">
                    {editingImageModel ? 'Editar Modelo' : 'Adicionar Modelo'}
                  </h3>
                  <button
                    onClick={closeImageModelModal}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Plataforma <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={imageModelForm.plataforma}
                      onChange={(e) => handleImageModelFormChange('plataforma', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="Runware">Runware</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      AIR (Model Identifier) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={imageModelForm.air}
                        onChange={(e) => handleImageModelFormChange('air', e.target.value)}
                        placeholder="Ex: google:4@1"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                      />
                      {isCollectingModelData && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Cole o AIR do modelo da plataforma Runware (formato: provider:model@version)
                    </p>
                  </div>

                  {/* Collected Model Data Display */}
                  {collectedModelData && (
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">Dados Coletados</h4>
                      </div>

                      <div className="space-y-3">
                        {/* Nome do Modelo - Editável */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Nome do Modelo <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={collectedModelData.nome_modelo}
                            onChange={(e) => setCollectedModelData(prev => prev ? { ...prev, nome_modelo: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                            placeholder="Nome do modelo"
                            required
                          />
                        </div>

                        {/* Categoria - Editável */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Categoria
                          </label>
                          <input
                            type="text"
                            value={collectedModelData.categoria}
                            onChange={(e) => setCollectedModelData(prev => prev ? { ...prev, categoria: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                            placeholder="Ex: realistic, anime, artistic"
                          />
                        </div>

                        {/* Descrição - Editável */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Descrição
                          </label>
                          <textarea
                            value={collectedModelData.descricao}
                            onChange={(e) => setCollectedModelData(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                            placeholder="Descrição do modelo"
                            rows={3}
                          />
                        </div>

                        {/* Tags - Read only display */}
                        {collectedModelData.tags && collectedModelData.tags.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Tags
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {collectedModelData.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-orange-900/30 text-orange-400 border border-orange-800 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-4 mt-8">
                  <button
                    onClick={closeImageModelModal}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveImageModel}
                    disabled={isSavingImageModel || !collectedModelData || !collectedModelData.nome_modelo.trim()}
                    className="flex items-center space-x-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-lg transition-all duration-200"
                  >
                    {isSavingImageModel ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingImageModel ? 'Atualizar' : 'Adicionar'}</span>
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

// API Card Component
const ApiCard: React.FC<{
  api: API;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ api, onEdit, onDelete }) => {
  const getPlatformColor = (platform: string) => {
    const colors = {
      'Fish-Audio': 'bg-cyan-500',
      'ElevenLabs': 'bg-purple-500',
      'Minimax': 'bg-red-500'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getPlatformColor(api.plataforma)}`}>
            <span className="text-xs font-bold text-white">
              {api.plataforma === 'ElevenLabs' ? '11' :
               api.plataforma === 'Fish-Audio' ? '🐟' :
               api.plataforma === 'Minimax' ? 'M' : 'API'}
            </span>
          </div>
          <div>
            <h4 className="text-white font-medium">{api.plataforma}</h4>
            <p className="text-gray-400 text-sm">
              API Key: {api.api_key.substring(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Voice Card Component
const VoiceCard: React.FC<{
  voice: Voice;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  isPlaying: boolean;
  isTesting: boolean;
  getPlatformColor: (platform: string) => string;
  getPlatformIcon: (platform: string) => () => JSX.Element;
}> = ({ voice, onEdit, onDelete, onTest, isPlaying, isTesting, getPlatformColor, getPlatformIcon }) => {
  const PlatformIcon = getPlatformIcon(voice.plataforma);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformColor(voice.plataforma)}`}>
            <span className="text-xs font-bold text-white">
              {voice.plataforma === 'ElevenLabs' ? '11' :
               voice.plataforma === 'Fish-Audio' ? '🐟' :
               voice.plataforma === 'Minimax' ? 'M' : '?'}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">{voice.nome_voz}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>{voice.plataforma}</span>
              {voice.idioma && <span>• {voice.idioma}</span>}
              {voice.genero && <span>• {voice.genero}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(voice.plataforma === 'ElevenLabs' || voice.plataforma === 'Fish-Audio') && (
            <button
              onClick={onTest}
              disabled={isTesting}
              className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-900/30 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Testar voz"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};