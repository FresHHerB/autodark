import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '@shared/hooks';
import { apiService } from '@shared/services';
import { DashboardHeader } from '@features/dashboard/components';
import { DriveVideoSelector, DriveVideo, DriveAudioSelector, DriveAudio } from '@features/content-generation/components';
import { Plus, Edit2, Save, X, FileText, Mic, Image as ImageIcon, Loader2, ChevronDown, Play, Square, Search, Check, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, Canal } from '@shared/lib';

// ============================================
// INTERFACES
// ============================================

interface GeneratedTitle {
  id: string;
  text: string;
}

interface AddedTitle {
  id: string;
  text: string;
}

interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string;
  idioma?: string;
  genero?: string;
  created_at: string;
  id_plataforma?: number;
}

interface ImageModel {
  id: number;
  name: string;
  air: string;
}

interface AudioConfig {
  generate: boolean;
  voice_id?: string; // Voice ID hash from vozes table
  speed?: number;
}

interface ImageConfig {
  generate: boolean;
  model_id?: string; // AIR value from modelos_imagem table
  style?: string;
  style_detail?: string;
  width?: number;
  height?: number;
  n_imgs?: number;
}

interface ContentPayload {
  canal_id: number;
  modelo_roteiro: string;
  idioma: string;
  audio: AudioConfig;
  imagem: ImageConfig;
  titulos: string[];
}

interface VideoFile {
  id: string;
  name: string;
  base64: string;
  thumbnail: string;
}

interface VideoItem {
  id: string;
  titulo: string;
  videos: VideoFile[];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function GenerateContentV2Page() {
  const { execute, loading: generatingTitles } = useApi();

  // ============================================
  // STATES - Data Loading
  // ============================================
  const [channels, setChannels] = useState<Canal[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [imageModelsLoading, setImageModelsLoading] = useState(true);

  // ============================================
  // STATES - Title Generation Section
  // ============================================
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<Canal | null>(null);
  const [novaIdeia, setNovaIdeia] = useState<string>('');
  const [titleIdioma, setTitleIdioma] = useState<string>('Português-Brasil');
  const [isEditingTitleIdioma, setIsEditingTitleIdioma] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<GeneratedTitle[]>([]);
  const [addedTitles, setAddedTitles] = useState<AddedTitle[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [captionWarning, setCaptionWarning] = useState<string>('');

  // ============================================
  // STATES - Content Generation Configuration
  // ============================================
  const [generateVideo, setGenerateVideo] = useState<boolean>(true);
  const [generateCaption, setGenerateCaption] = useState<boolean>(false);
  const [videoGenerationMethod, setVideoGenerationMethod] = useState<'video-to-video' | 'image-to-video'>('image-to-video');
  const [generateAudio, setGenerateAudio] = useState<boolean>(false);
  const [generateImage, setGenerateImage] = useState<boolean>(false);

  // Content Generation Mode (when generateVideo = false)
  type ContentMode = 'script' | 'script-audio' | 'script-audio-image' | 'audio-only' | 'image-only';
  const [contentMode, setContentMode] = useState<ContentMode>('script-audio-image');

  // Existing Scripts State (for audio-only and image-only modes)
  interface ExistingScript {
    id: number;
    titulo: string;
    roteiro: string;
    canal_id: number;
    audio_path: string | null;
    images_path: string[] | null;
    status: string | null;
    created_at: string;
  }
  const [existingScripts, setExistingScripts] = useState<ExistingScript[]>([]);
  const [existingScriptsLoading, setExistingScriptsLoading] = useState(false);
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<number>>(new Set());

  // Model and Language
  const [selectedModel, setSelectedModel] = useState<string>('Sonnet-4.5');
  const [contentIdioma, setContentIdioma] = useState<string>('Português-Brasil');
  const [isEditingIdioma, setIsEditingIdioma] = useState(false);

  // Audio Configuration
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [voiceSearchTerm, setVoiceSearchTerm] = useState<string>('');
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [voicePlatformFilter, setVoicePlatformFilter] = useState<string>('all');
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('down');
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<{ id: number; audio: HTMLAudioElement } | null>(null);

  // Image Configuration
  const [imageModelId, setImageModelId] = useState<number | null>(null);
  const [imageStyle, setImageStyle] = useState<string>('');
  const [imageStyleDetail, setImageStyleDetail] = useState<string>('');
  const [imageWidth, setImageWidth] = useState<number>(1344);
  const [imageHeight, setImageHeight] = useState<number>(768);
  const [numImages, setNumImages] = useState<number>(10);
  const [styleImage, setStyleImage] = useState<File | null>(null);
  const [styleImagePreview, setStyleImagePreview] = useState<string | null>(null);
  const [collectingStyle, setCollectingStyle] = useState(false);

  // Video Upload State (for video-to-video method)
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([]);
  const [dragOverTitleId, setDragOverTitleId] = useState<string | null>(null);

  // Drive Video Selection State
  // Map para armazenar vídeos do Drive por título
  const [driveVideosByTitle, setDriveVideosByTitle] = useState<Record<string, string[]>>({});

  // Map para armazenar vídeos disponíveis do Drive por título
  const [availableVideosByTitle, setAvailableVideosByTitle] = useState<Record<string, DriveVideo[]>>({});

  // Map para armazenar número de vídeos aleatórios por título
  const [randomVideoCountByTitle, setRandomVideoCountByTitle] = useState<Record<string, number>>({});

  // Drive Audio Selection State
  // Map para armazenar trilha sonora selecionada por título
  const [selectedAudioByTitle, setSelectedAudioByTitle] = useState<Record<string, string | null>>({});

  // Map para armazenar áudios disponíveis por título
  const [availableAudiosByTitle, setAvailableAudiosByTitle] = useState<Record<string, DriveAudio[]>>({});

  // Map para armazenar db_offset por título (diferença de volume da trilha)
  const [audioDbOffsetByTitle, setAudioDbOffsetByTitle] = useState<Record<string, number>>({});

  // Generation State
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Channel Dropdown State
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadChannels();
    loadVoices();
    loadImageModels();
  }, []);

  // Auto-select preferred voice when channel changes
  useEffect(() => {
    if (selectedChannelId && channels.length > 0 && voices.length > 0) {
      const selectedChannel = channels.find(c => c.id.toString() === selectedChannelId);
      if (selectedChannel?.voz_prefereida) {
        const preferredVoice = voices.find(v => v.id === selectedChannel.voz_prefereida);
        if (preferredVoice) {
          setSelectedVoiceId(selectedChannel.voz_prefereida);
        }
      }
    }
  }, [selectedChannelId, channels, voices]);

  // Load detailed_style from selected channel
  useEffect(() => {
    if (selectedChannelId && channels.length > 0) {
      // Fechar toast de geração ao mudar de canal
      setShowToast(false);

      const selectedChannel = channels.find(c => c.id.toString() === selectedChannelId);
      if (selectedChannel?.detailed_style) {
        // Extract detailed_style from the JSON object
        let detailedStyleValue = '';
        let mainStyleValue = '';

        if (typeof selectedChannel.detailed_style === 'object' && selectedChannel.detailed_style !== null) {
          // It's a JSON object with main_style and detailed_style fields
          detailedStyleValue = selectedChannel.detailed_style.detailed_style || '';
          mainStyleValue = selectedChannel.detailed_style.main_style || '';
        } else if (typeof selectedChannel.detailed_style === 'string') {
          // It's a plain string
          detailedStyleValue = selectedChannel.detailed_style;
        }

        setImageStyleDetail(detailedStyleValue);
        setImageStyle(mainStyleValue);
      } else {
        // Clear the fields if no detailed_style is set
        setImageStyleDetail('');
        setImageStyle('');
      }
    }
  }, [selectedChannelId, channels]);

  // Close voice dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && !target.closest('.voice-dropdown-container')) {
        setShowVoiceDropdown(false);
      }
    };

    if (showVoiceDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showVoiceDropdown]);

  // Close channel dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && !target.closest('.channel-dropdown-container')) {
        setShowChannelDropdown(false);
      }
    };

    if (showChannelDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChannelDropdown]);

  // Reset platform filter when dropdown closes
  useEffect(() => {
    if (!showVoiceDropdown) {
      setVoicePlatformFilter('all');
      setVoiceSearchTerm('');
    }
  }, [showVoiceDropdown]);

  // Sync title idioma with content idioma (title drives content)
  useEffect(() => {
    if (titleIdioma !== contentIdioma) {
      setContentIdioma(titleIdioma);
    }
  }, [titleIdioma]);

  // Load existing scripts when channel or content mode changes (only for audio-only and image-only modes)
  useEffect(() => {
    if (!generateVideo && selectedChannelId && (contentMode === 'audio-only' || contentMode === 'image-only')) {
      loadExistingScripts(selectedChannelId, contentMode);
    } else {
      // Clear existing scripts when not in audio-only or image-only mode
      setExistingScripts([]);
      setSelectedScriptIds(new Set());
    }
  }, [generateVideo, selectedChannelId, contentMode]);

  // ============================================
  // DATA LOADING FUNCTIONS
  // ============================================

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
          apis!inner(plataforma)
        `)
        .order('nome_voz', { ascending: true });

      if (error) throw error;

      const formattedVoices: Voice[] = (data || []).map((item: any) => ({
        id: item.id,
        nome_voz: item.nome_voz,
        voice_id: item.voice_id,
        plataforma: item.apis?.plataforma || 'Unknown',
        idioma: item.idioma,
        genero: item.genero,
        created_at: item.created_at,
        id_plataforma: item.id_plataforma
      }));

      setVoices(formattedVoices);
      if (formattedVoices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(formattedVoices[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar vozes:', error);
    } finally {
      setVoicesLoading(false);
    }
  };

  const loadImageModels = async () => {
    try {
      setImageModelsLoading(true);
      const { data, error } = await supabase
        .from('modelos_imagem')
        .select('id, name, air')
        .order('name', { ascending: true });

      if (error) throw error;
      setImageModels(data || []);
      if (data && data.length > 0) {
        setImageModelId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar modelos de imagem:', error);
    } finally {
      setImageModelsLoading(false);
    }
  };

  const loadExistingScripts = async (canalId: string, mode: ContentMode) => {
    try {
      setExistingScriptsLoading(true);
      setSelectedScriptIds(new Set()); // Reset selection

      let query = supabase
        .from('roteiros')
        .select('id, titulo, roteiro, canal_id, audio_path, images_path, status, created_at')
        .eq('canal_id', parseInt(canalId))
        .order('created_at', { ascending: false });

      // Filter based on mode
      if (mode === 'audio-only') {
        // Scripts sem áudio (audio_path is null)
        query = query.is('audio_path', null);
      } else if (mode === 'image-only') {
        // Scripts com áudio mas sem imagens
        query = query.not('audio_path', 'is', null);
        // Verificar se images_path é null ou array vazio será feito no frontend
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar no frontend para image-only (scripts sem imagens ou com array vazio)
      let filteredData = data || [];
      if (mode === 'image-only') {
        filteredData = filteredData.filter(script =>
          !script.images_path ||
          (Array.isArray(script.images_path) && script.images_path.length === 0)
        );
      }

      setExistingScripts(filteredData);
    } catch (error) {
      console.error('Erro ao carregar roteiros existentes:', error);
    } finally {
      setExistingScriptsLoading(false);
    }
  };

  // ============================================
  // TITLE GENERATION FUNCTIONS
  // ============================================

  const handleGenerateTitles = async () => {
    // Fechar toast de geração anterior se existir
    setShowToast(false);

    if (!selectedChannelId || !novaIdeia.trim()) {
      alert('Por favor, selecione um canal e digite uma nova ideia.');
      return;
    }

    try {
      const payload = {
        id_canal: selectedChannelId,
        nova_ideia: novaIdeia,
        idioma: titleIdioma,
        tipo_geracao: 'titulos'
      };

      const response = await execute(() =>
        apiService.generateContent(payload)
      );

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
          alert('Formato de resposta inesperado ao gerar títulos.');
        }
      } else {
        console.error('Empty or invalid response:', response);
        alert('Resposta vazia ou inválida ao gerar títulos.');
      }
    } catch (error) {
      console.error('Erro ao gerar títulos:', error);
      alert('Erro ao gerar títulos. Tente novamente.');
    }
  };

  const handleAddTitle = (title: GeneratedTitle) => {
    if (!addedTitles.some(t => t.id === title.id)) {
      setAddedTitles([...addedTitles, { id: title.id, text: title.text }]);
      setGeneratedTitles(generatedTitles.filter(t => t.id !== title.id));
    }
  };

  const handleRemoveTitle = (titleId: string) => {
    setAddedTitles(addedTitles.filter(t => t.id !== titleId));
  };

  const handleAddManualTitle = () => {
    // Fechar toast de geração anterior se existir
    setShowToast(false);

    if (novaIdeia.trim()) {
      const newTitle: AddedTitle = {
        id: `manual-${Date.now()}`,
        text: novaIdeia.trim()
      };
      setAddedTitles([...addedTitles, newTitle]);
      setNovaIdeia('');
    }
  };

  const handleStartEdit = (titleId: string, currentText: string) => {
    setEditingTitleId(titleId);
    setEditingText(currentText);
  };

  const handleSaveEdit = () => {
    if (editingTitleId && editingText.trim()) {
      setAddedTitles(addedTitles.map(title =>
        title.id === editingTitleId ? { ...title, text: editingText.trim() } : title
      ));
      setEditingTitleId(null);
      setEditingText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingTitleId(null);
    setEditingText('');
  };

  // ============================================
  // VOICE FUNCTIONS
  // ============================================

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

      // Get API key from apis table
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', voice.plataforma)
        .single();

      if (apiError || !apiData?.api_key) {
        throw new Error(`API key não encontrada para ${voice.plataforma}`);
      }

      if (voice.plataforma === 'ElevenLabs') {
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

        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }

        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
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

  const playSelectedVoicePreview = (voiceId: number) => {
    if (!voiceId) return;

    const audioId = `voice-preview-${voiceId}`;

    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(voiceId));

    generateVoiceTest(voiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao testar voz';

        // Mostrar mensagem mais amigável
        if (errorMessage.includes('Edge Function') || errorMessage.includes('CORS')) {
          setToastMessage('Preview de áudio temporariamente indisponível. Tente novamente em alguns momentos.');
          setToastType('error');
          setShowToast(true);
        } else {
          setToastMessage(errorMessage);
          setToastType('error');
          setShowToast(true);
        }
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(voiceId);
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

  // Get available platforms
  const availablePlatforms = Array.from(new Set(voices.map(v => v.plataforma))).filter(Boolean);

  // Filter voices by search term and platform
  const filteredVoices = voices.filter(voice => {
    const matchesSearch =
      voice.nome_voz.toLowerCase().includes(voiceSearchTerm.toLowerCase()) ||
      voice.plataforma.toLowerCase().includes(voiceSearchTerm.toLowerCase()) ||
      voice.idioma?.toLowerCase().includes(voiceSearchTerm.toLowerCase());

    const matchesPlatform = voicePlatformFilter === 'all' || voice.plataforma === voicePlatformFilter;

    return matchesSearch && matchesPlatform;
  });

  // Group voices by platform for hierarchical dropdown
  const voicesByPlatform = filteredVoices.reduce((acc, voice) => {
    const platform = voice.plataforma || 'Outros';
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);

  // Handle dropdown toggle with dynamic positioning
  const handleVoiceDropdownToggle = (event: React.MouseEvent) => {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 480; // Estimated max height
    const buffer = 20;

    // Check if dropdown would overflow below viewport
    const spaceBelow = viewportHeight - rect.bottom - buffer;
    const spaceAbove = rect.top - buffer;
    const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

    setDropdownDirection(shouldOpenUp ? 'up' : 'down');
    setShowVoiceDropdown(!showVoiceDropdown);
  };

  // ============================================
  // IMAGE STYLE FUNCTIONS
  // ============================================

  const handleStyleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStyleImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setStyleImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setStyleImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setStyleImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleCollectStyle = async () => {
    // Fechar toast de geração anterior se existir
    setShowToast(false);

    if (!styleImage) {
      alert('Por favor, selecione ou cole uma imagem primeiro.');
      return;
    }

    if (!selectedChannelId) {
      alert('Por favor, selecione um canal primeiro.');
      return;
    }

    try {
      setCollectingStyle(true);

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(styleImage);
      });

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const webhookPath = import.meta.env.VITE_WEBHOOK_UPDATE || '/webhook/update';
      const webhookUrl = `${apiBaseUrl}${webhookPath}`;

      console.log('🎨 Enviando imagem para coleta de estilo...');
      console.log('URL:', webhookUrl);
      console.log('Canal ID:', selectedChannelId);
      console.log('Tamanho base64:', base64Data.length, 'caracteres');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          update_type: 'updateStyle',
          id_canal: parseInt(selectedChannelId),
          image_data: base64Data
        })
      });

      console.log('📥 Resposta do webhook:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao coletar estilo: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Estilo coletado com sucesso:', result);

      // Reload the specific channel to get updated detailed_style from database
      const { data: updatedChannel, error: channelError } = await supabase
        .from('canais')
        .select('detailed_style')
        .eq('id', parseInt(selectedChannelId))
        .single();

      if (channelError) {
        console.error('Erro ao recarregar estilo do canal:', channelError);
      } else if (updatedChannel?.detailed_style) {
        console.log('📥 Detailed style atualizado do banco:', updatedChannel.detailed_style);

        // Extract and populate the style fields
        if (typeof updatedChannel.detailed_style === 'object' && updatedChannel.detailed_style !== null) {
          const detailedStyleValue = updatedChannel.detailed_style.detailed_style || '';
          const mainStyleValue = updatedChannel.detailed_style.main_style || '';

          setImageStyleDetail(detailedStyleValue);
          setImageStyle(mainStyleValue);

          console.log('✅ Campos atualizados:', { mainStyleValue, detailedStyleValue });
        }
      }

      // Also reload all channels to keep the state fresh
      await loadChannels();

      // Show success toast (sem setTimeout - permanece até próxima ação)
      setToastMessage('Estilo carregado com sucesso!');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Erro ao coletar estilo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Show error toast (sem setTimeout - permanece até próxima ação)
      setToastMessage(`Erro ao coletar estilo: ${errorMessage}`);
      setToastType('error');
      setShowToast(true);
    } finally {
      setCollectingStyle(false);
    }
  };

  // ============================================
  // VIDEO UPLOAD FUNCTIONS
  // ============================================

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2); // Captura no meio ou 1s
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumbnailUrl);
        } else {
          reject(new Error('Failed to get canvas context'));
        }

        // Cleanup
        video.src = '';
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleVideoFilesChange = async (files: FileList | null, titulo: string) => {
    if (!files || files.length === 0) return;

    const videoFiles: VideoFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Generate base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Generate thumbnail
      let thumbnail = '';
      try {
        thumbnail = await generateVideoThumbnail(file);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        // Use a placeholder if thumbnail generation fails
        thumbnail = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23666" width="100" height="100"/%3E%3C/svg%3E';
      }

      videoFiles.push({
        id: `video-file-${Date.now()}-${i}`,
        name: file.name,
        base64,
        thumbnail
      });
    }

    // Find existing video item for this title or create new one
    const existingVideoIndex = uploadedVideos.findIndex(v => v.titulo === titulo);

    if (existingVideoIndex !== -1) {
      // Add to existing videos
      const updatedVideos = [...uploadedVideos];
      updatedVideos[existingVideoIndex].videos.push(...videoFiles);
      setUploadedVideos(updatedVideos);
    } else {
      // Create new video item
      const newVideo: VideoItem = {
        id: `video-${Date.now()}`,
        titulo,
        videos: videoFiles
      };
      setUploadedVideos([...uploadedVideos, newVideo]);
    }
  };

  const handleRemoveAllVideos = (videoItemId: string) => {
    setUploadedVideos(uploadedVideos.filter(v => v.id !== videoItemId));
  };

  const handleRemoveIndividualVideo = (titulo: string, videoFileId: string) => {
    const updatedVideos = uploadedVideos.map(videoItem => {
      if (videoItem.titulo === titulo) {
        const updatedFiles = videoItem.videos.filter(v => v.id !== videoFileId);
        return { ...videoItem, videos: updatedFiles };
      }
      return videoItem;
    }).filter(videoItem => videoItem.videos.length > 0); // Remove if no videos left

    setUploadedVideos(updatedVideos);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent, titleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTitleId(titleId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTitleId(null);
  };

  const handleDrop = async (e: React.DragEvent, titulo: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTitleId(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleVideoFilesChange(files, titulo);
    }
  };

  // ============================================
  // RANDOM VIDEO SELECTION FUNCTION
  // ============================================

  const handleRandomVideoSelection = (titleId: string) => {
    const count = randomVideoCountByTitle[titleId];
    const availableVideos = availableVideosByTitle[titleId];

    if (!count || count < 1 || count > 50) {
      alert('Por favor, digite um número entre 1 e 50');
      return;
    }

    if (!availableVideos || availableVideos.length === 0) {
      alert('Nenhum vídeo disponível para selecionar');
      return;
    }

    // Limitar ao número de vídeos disponíveis
    const actualCount = Math.min(count, availableVideos.length);

    // Criar uma cópia do array e embaralhar (Fisher-Yates shuffle)
    const shuffled = [...availableVideos];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Selecionar os primeiros N vídeos embaralhados
    const selectedVideos = shuffled.slice(0, actualCount);

    // Converter para URLs
    const selectedUrls = selectedVideos.map(video =>
      `https://drive.google.com/file/d/${video.id}/view`
    );

    // Atualizar o state
    setDriveVideosByTitle({
      ...driveVideosByTitle,
      [titleId]: selectedUrls
    });
  };

  // ============================================
  // CONTENT GENERATION FUNCTION
  // ============================================

  const handleGenerateContent = async () => {
    // Fechar toast de geração anterior se existir
    setShowToast(false);

    // Validação: Canal selecionado
    const selectedChannel = channels.find(c => c.id.toString() === selectedChannelId);
    if (!selectedChannel) {
      alert('Por favor, selecione um canal');
      return;
    }

    // Validações baseadas no modo de geração
    if (!generateVideo) {
      // Modos de conteúdo (sem vídeo)

      // Modos que usam títulos (script, script-audio, script-audio-image)
      if (['script', 'script-audio', 'script-audio-image'].includes(contentMode)) {
        if (addedTitles.length === 0) {
          alert('Por favor, adicione pelo menos um título');
          return;
        }

        if (!selectedModel) {
          alert('Por favor, selecione um modelo de roteiro');
          return;
        }
      }

      // Modos que usam roteiros existentes (audio-only, image-only)
      if (contentMode === 'audio-only' || contentMode === 'image-only') {
        if (selectedScriptIds.size === 0) {
          alert('Por favor, selecione pelo menos um roteiro');
          return;
        }
      }

      // Validação de voz (para script-audio, script-audio-image, audio-only)
      if (['script-audio', 'script-audio-image', 'audio-only'].includes(contentMode)) {
        if (!selectedVoiceId) {
          alert('Por favor, selecione uma voz para geração de áudio');
          return;
        }
      }

      // Validação de imagem (para script-audio-image, image-only)
      if (['script-audio-image', 'image-only'].includes(contentMode)) {
        if (!imageModelId) {
          alert('Por favor, selecione um modelo de imagem');
          return;
        }
      }
    } else {
      // Modo de vídeo
      if (addedTitles.length === 0) {
        alert('Por favor, adicione pelo menos um título');
        return;
      }

      if (!selectedModel) {
        alert('Por favor, selecione um modelo de roteiro');
        return;
      }
    }

    try {
      setIsGeneratingContent(true);

      // Buscar o voice_id hash da voz selecionada (quando necessário)
      const selectedVoice = voices.find(v => v.id === selectedVoiceId);
      const voiceIdHash = selectedVoice?.voice_id;

      // Buscar o AIR do modelo de imagem selecionado (quando necessário)
      const selectedImageModel = imageModels.find(m => m.id === imageModelId);
      const modelAir = selectedImageModel?.air;

      let payload: any;

      if (!generateVideo) {
        // ============================================
        // PAYLOADS PARA MODOS DE CONTEÚDO (SEM VÍDEO)
        // ============================================

        if (contentMode === 'script') {
          // Modo 1: Apenas Roteiro
          payload = {
            canal_id: parseInt(selectedChannelId),
            modelo_roteiro: selectedModel,
            idioma: contentIdioma,
            tipo_geracao: 'gerar_roteiro',
            titulos: addedTitles.map(title => title.text)
          };
        } else if (contentMode === 'script-audio') {
          // Modo 2: Roteiro + Áudio
          payload = {
            canal_id: parseInt(selectedChannelId),
            modelo_roteiro: selectedModel,
            idioma: contentIdioma,
            tipo_geracao: 'gerar_roteiro_audio',
            titulos: addedTitles.map(title => {
              const audioConfig: any = {
                voice_id: voiceIdHash,
                speed: audioSpeed
              };

              // Adicionar trilha_sonora se selecionada
              if (selectedAudioByTitle[title.id]) {
                audioConfig.trilha_sonora = selectedAudioByTitle[title.id];
                audioConfig.db_offset = audioDbOffsetByTitle[title.id] || 30;
              }

              return {
                titulo: title.text,
                media: {
                  audio: audioConfig
                }
              };
            })
          };
        } else if (contentMode === 'script-audio-image') {
          // Modo 3: Roteiro + Áudio + Imagem (comportamento antigo)
          payload = {
            canal_id: parseInt(selectedChannelId),
            modelo_roteiro: selectedModel,
            idioma: contentIdioma,
            tipo_geracao: 'conteudo',
            titulos: addedTitles.map(title => {
              const audioConfig: any = {
                voice_id: voiceIdHash,
                speed: audioSpeed
              };

              if (selectedAudioByTitle[title.id]) {
                audioConfig.trilha_sonora = selectedAudioByTitle[title.id];
                audioConfig.db_offset = audioDbOffsetByTitle[title.id] || 30;
              }

              return {
                titulo: title.text,
                media: {
                  audio: audioConfig,
                  imagem: {
                    model_id: modelAir,
                    style: imageStyle,
                    style_detail: imageStyleDetail,
                    width: imageWidth,
                    height: imageHeight,
                    n_imgs: numImages
                  },
                  video: {
                    type: "imagem",
                    generate: false
                  }
                }
              };
            })
          };
        } else if (contentMode === 'audio-only') {
          // Modo 4: Apenas Áudio (para roteiros existentes sem áudio)
          payload = {
            canal_id: parseInt(selectedChannelId),
            tipo_geracao: 'gerar_audio',
            roteiros: Array.from(selectedScriptIds).map(id => ({
              id_roteiro: id,
              audio: {
                voice_id: voiceIdHash,
                speed: audioSpeed
              }
            }))
          };
        } else if (contentMode === 'image-only') {
          // Modo 5: Apenas Imagem (para roteiros existentes com áudio)
          payload = {
            canal_id: parseInt(selectedChannelId),
            tipo_geracao: 'gerar_imagens',
            roteiros: Array.from(selectedScriptIds).map(id => ({
              id_roteiro: id,
              imagem: {
                model_id: modelAir,
                style: imageStyle,
                style_detail: imageStyleDetail,
                width: imageWidth,
                height: imageHeight,
                n_imgs: numImages
              }
            }))
          };
        }
      } else {
        // Payload para gen_video=true

        // Buscar o voice_id hash da voz selecionada
        const selectedVoice = voices.find(v => v.id === selectedVoiceId);
        const voiceIdHash = selectedVoice?.voice_id;

        if (videoGenerationMethod === 'video-to-video') {
          // Validação: todos os títulos devem ter vídeos selecionados
          const titulosSemVideos = addedTitles.filter(title =>
            !driveVideosByTitle[title.id] || driveVideosByTitle[title.id].length === 0
          );

          if (titulosSemVideos.length > 0) {
            alert(`Por favor, selecione vídeos para todos os títulos. Faltam vídeos em:\n${titulosSemVideos.map(t => `• ${t.text}`).join('\n')}`);
            setIsGeneratingContent(false);
            return;
          }

          if (!voiceIdHash) {
            alert('Por favor, selecione uma voz');
            setIsGeneratingContent(false);
            return;
          }

          // Payload vídeo-para-vídeo usando Drive URLs
          // Cada título tem sua própria lista de vídeos
          payload = {
            canal_id: parseInt(selectedChannelId),
            modelo_roteiro: selectedModel,
            idioma: contentIdioma,
            tipo_geracao: 'conteudo',
            titulos: addedTitles.map(title => {
              // Construir objeto audio
              const audioConfig: any = {
                voice_id: voiceIdHash,
                speed: audioSpeed
              };

              // Adicionar trilha_sonora e db_offset apenas se houver uma trilha selecionada
              if (selectedAudioByTitle[title.id]) {
                audioConfig.trilha_sonora = selectedAudioByTitle[title.id];
                audioConfig.db_offset = audioDbOffsetByTitle[title.id] || 30;
              }

              return {
                titulo: title.text,
                media: {
                  audio: audioConfig,
                  video: {
                    type: "video",
                    generate: true,
                    caption: generateCaption,
                    videos_url: driveVideosByTitle[title.id] || []
                  }
                }
              };
            })
          };
        } else {
          // videoGenerationMethod === 'image-to-video'

          if (!voiceIdHash) {
            alert('Por favor, selecione uma voz');
            setIsGeneratingContent(false);
            return;
          }

          if (!imageModelId) {
            alert('Por favor, selecione um modelo de imagem');
            setIsGeneratingContent(false);
            return;
          }

          // Buscar o AIR do modelo de imagem selecionado
          const selectedImageModel = imageModels.find(m => m.id === imageModelId);
          const modelAir = selectedImageModel?.air;

          // Payload imagem-para-vídeo
          // Nova estrutura: cada título tem seu próprio objeto media com imagem
          payload = {
            canal_id: parseInt(selectedChannelId),
            modelo_roteiro: selectedModel,
            idioma: contentIdioma,
            tipo_geracao: 'conteudo',
            titulos: addedTitles.map(title => {
              // Construir objeto audio
              const audioConfig: any = {
                voice_id: voiceIdHash,
                speed: audioSpeed
              };

              // Adicionar trilha_sonora e db_offset apenas se houver uma trilha selecionada
              if (selectedAudioByTitle[title.id]) {
                audioConfig.trilha_sonora = selectedAudioByTitle[title.id];
                audioConfig.db_offset = audioDbOffsetByTitle[title.id] || 30;
              }

              return {
                titulo: title.text,
                media: {
                  audio: audioConfig,
                  imagem: {
                    model_id: modelAir,
                    style: imageStyle,
                    style_detail: imageStyleDetail,
                    width: imageWidth,
                    height: imageHeight,
                    n_imgs: numImages
                  },
                  video: {
                    type: "imagem",
                    generate: true,
                    caption: generateCaption
                  }
                }
              };
            })
          };
        }
      }

      console.log('📤 Payload completo enviado para webhook:', JSON.stringify(payload, null, 2));

      const result = await apiService.generateContent(payload);

      console.log('✅ Resultado do webhook:', result);

      // Show success toast (sem setTimeout - permanece até próxima ação)
      const numRoteiros = addedTitles.length;
      setToastMessage(`Geração de ${numRoteiros} ${numRoteiros === 1 ? 'roteiro' : 'roteiros'} iniciada!`);
      setToastType('success');
      setShowToast(true);

      // NÃO limpar títulos - devem persistir após gerar conteúdo
      // setAddedTitles([]);
      // setGeneratedTitles([]);

    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);

      // Show error toast (sem setTimeout - permanece até próxima ação)
      setToastMessage('Erro ao gerar conteúdo. Tente novamente.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Gerar Conteúdo v2</h1>
          <p className="text-gray-400">Geração automatizada e completa de conteúdo</p>
        </div>

        {/* ============================================ */}
        {/* SECTION 1: TITLE GENERATION */}
        {/* ============================================ */}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Geração de Títulos
          </h2>

          {/* Channel Selection - Custom Dropdown */}
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              <label className="text-lg font-medium text-white">Selecione o Canal</label>
            </div>

            <div className="max-w-2xl mx-auto relative channel-dropdown-container">
              {channelsLoading ? (
                <div className="flex items-center justify-center py-8 bg-gray-800 rounded-xl border-2 border-gray-700">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="ml-2 text-gray-400">Carregando canais...</span>
                </div>
              ) : (
                <>
                  {/* Dropdown Button */}
                  <button
                    onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                    className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-gray-700 hover:border-purple-500 text-white px-6 py-4 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all shadow-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {selectedChannelId && channels.find(c => c.id.toString() === selectedChannelId) ? (
                        <>
                          {/* Selected Channel Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500">
                            {channels.find(c => c.id.toString() === selectedChannelId)?.profile_image ? (
                              <img
                                src={channels.find(c => c.id.toString() === selectedChannelId)!.profile_image!}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const channel = channels.find(c => c.id.toString() === selectedChannelId);
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel?.nome_canal || '')}&background=6366f1&color=fff&size=128`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white font-bold">
                                {channels.find(c => c.id.toString() === selectedChannelId)?.nome_canal.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-lg font-medium">
                            {channels.find(c => c.id.toString() === selectedChannelId)?.nome_canal}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-lg">🎬 Escolha um canal...</span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showChannelDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showChannelDropdown && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-800 border-2 border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                      {channels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setSelectedChannelId(channel.id.toString());
                            setSelectedChannel(channel);
                            setShowChannelDropdown(false);
                            setCaptionWarning('');
                          }}
                          className={`w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-700 transition-colors ${
                            selectedChannelId === channel.id.toString() ? 'bg-purple-600/20' : ''
                          }`}
                        >
                          {/* Channel Avatar */}
                          <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${
                            selectedChannelId === channel.id.toString() ? 'ring-2 ring-purple-500' : ''
                          }`}>
                            {channel.profile_image ? (
                              <img
                                src={channel.profile_image}
                                alt={channel.nome_canal}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.nome_canal)}&background=6366f1&color=fff&size=128`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white font-bold">
                                {channel.nome_canal.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Channel Name */}
                          <span className={`flex-1 text-left font-medium ${
                            selectedChannelId === channel.id.toString() ? 'text-purple-300' : 'text-white'
                          }`}>
                            {channel.nome_canal}
                          </span>

                          {/* Selected Check */}
                          {selectedChannelId === channel.id.toString() && (
                            <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Idea Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Nova Ideia</label>
            <textarea
              value={novaIdeia}
              onChange={(e) => setNovaIdeia(e.target.value)}
              placeholder="Digite uma nova ideia para gerar títulos..."
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              rows={3}
            />
          </div>

          {/* Language Selection - Editable */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Idioma dos Títulos</label>
            {isEditingTitleIdioma ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={titleIdioma}
                  onChange={(e) => setTitleIdioma(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <button
                  onClick={() => setIsEditingTitleIdioma(false)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={titleIdioma}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsEditingTitleIdioma(true);
                    } else {
                      setTitleIdioma(e.target.value);
                    }
                  }}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="Português-Brasil">Português-Brasil</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="custom">Personalizado...</option>
                </select>
                <button
                  onClick={() => setIsEditingTitleIdioma(true)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateTitles}
            disabled={!selectedChannelId || !novaIdeia.trim() || generatingTitles}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {generatingTitles ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando Títulos...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Gerar Títulos
              </>
            )}
          </button>
        </div>

        {/* ============================================ */}
        {/* TITLES DISPLAY - 2 COLUMNS */}
        {/* ============================================ */}

        {(generatedTitles.length > 0 || addedTitles.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Generated Titles - Left Column */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Títulos Gerados ({generatedTitles.length})
              </h3>

              {generatedTitles.length === 0 ? (
                <p className="text-gray-500 italic">Nenhum título gerado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {generatedTitles.map((title) => (
                    <div
                      key={title.id}
                      className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <span className="flex-1 text-white text-sm">{title.text}</span>
                      <button
                        onClick={() => handleAddTitle(title)}
                        className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                        title="Adicionar aos títulos selecionados"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Added Titles - Right Column */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
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
                    <div
                      key={title.id}
                      className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                    >
                      {editingTitleId === title.id ? (
                        <>
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded focus:outline-none focus:border-purple-500 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-green-400 hover:text-green-300"
                            title="Salvar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-white text-sm">{title.text}</span>

                          {/* Indicador de vídeos selecionados */}
                          {generateVideo && videoGenerationMethod === 'video-to-video' && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              (driveVideosByTitle[title.id]?.length || 0) > 0
                                ? 'bg-green-600/20 text-green-400'
                                : 'bg-gray-700 text-gray-400'
                            }`}>
                              {driveVideosByTitle[title.id]?.length || 0} vídeos
                            </span>
                          )}

                          <button
                            onClick={() => handleStartEdit(title.id, title.text)}
                            className="p-1 text-blue-400 hover:text-blue-300"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveTitle(title.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Remover"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Title Add - Inside Right Column */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={handleAddManualTitle}
                  disabled={!novaIdeia.trim()}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed border border-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Adicionar Título Manual</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* SECTION 2: VIDEO GENERATION TOGGLE */}
        {/* ============================================ */}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-light text-white mb-1">Gerar Vídeo</h2>
              <p className="text-sm text-gray-400">
                Ative para gerar vídeos completos ou desative para apenas áudio e imagens
              </p>
            </div>
            <button
              onClick={() => setGenerateVideo(!generateVideo)}
              className={`
                relative w-16 h-8 rounded-full transition-all duration-300
                ${generateVideo
                  ? 'bg-purple-600'
                  : 'bg-gray-700'
                }
              `}
            >
              <div className={`
                absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300
                ${generateVideo ? 'translate-x-8' : 'translate-x-0'}
              `} />
            </button>
          </div>

          {/* Caption Toggle - Only visible when video is ON */}
          {generateVideo && (
            <>
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div>
                  <h3 className="text-lg font-light text-white mb-1">Gerar Legendas</h3>
                  <p className="text-sm text-gray-400">
                    Ative para adicionar legendas ao vídeo
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!generateCaption && (!selectedChannel?.caption_style)) {
                      setCaptionWarning('Configure o estilo de legendas na página de Gerenciamento de Canais antes de ativar esta opção.');
                      setTimeout(() => setCaptionWarning(''), 5000);
                      return;
                    }
                    setCaptionWarning('');
                    setGenerateCaption(!generateCaption);
                  }}
                  className={`
                    relative w-16 h-8 rounded-full transition-all duration-300
                    ${generateCaption
                      ? 'bg-purple-600'
                      : 'bg-gray-700'
                    }
                  `}
                >
                  <div className={`
                    absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300
                    ${generateCaption ? 'translate-x-8' : 'translate-x-0'}
                  `} />
                </button>
              </div>

              {/* Caption Warning Message */}
              {captionWarning && (
                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 text-sm font-medium mb-1">Configuração Necessária</p>
                      <p className="text-yellow-200 text-sm">{captionWarning}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================ */}
        {/* CONTENT GENERATION MODE SELECTOR (When generateVideo is OFF) */}
        {/* ============================================ */}

        {!generateVideo && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-light text-white mb-4">Modo de Geração de Conteúdo</h2>
            <p className="text-sm text-gray-400 mb-6">Selecione o que deseja gerar</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Modo 1: Roteiro */}
              <button
                onClick={() => setContentMode('script')}
                className={`
                  p-5 rounded-lg border-2 transition-all text-left
                  ${contentMode === 'script'
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText className={`w-6 h-6 flex-shrink-0 ${contentMode === 'script' ? 'text-blue-400' : 'text-gray-400'}`} />
                  <div>
                    <h3 className={`font-semibold mb-1 ${contentMode === 'script' ? 'text-blue-300' : 'text-white'}`}>
                      Apenas Roteiro
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Gera apenas o roteiro para os títulos selecionados
                    </p>
                  </div>
                </div>
              </button>

              {/* Modo 2: Roteiro + Áudio */}
              <button
                onClick={() => setContentMode('script-audio')}
                className={`
                  p-5 rounded-lg border-2 transition-all text-left
                  ${contentMode === 'script-audio'
                    ? 'bg-green-600/20 border-green-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex gap-1 flex-shrink-0">
                    <FileText className={`w-5 h-5 ${contentMode === 'script-audio' ? 'text-green-400' : 'text-gray-400'}`} />
                    <Mic className={`w-5 h-5 ${contentMode === 'script-audio' ? 'text-green-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-1 ${contentMode === 'script-audio' ? 'text-green-300' : 'text-white'}`}>
                      Roteiro + Áudio
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Gera roteiro e áudio para os títulos selecionados
                    </p>
                  </div>
                </div>
              </button>

              {/* Modo 3: Roteiro + Áudio + Imagem */}
              <button
                onClick={() => setContentMode('script-audio-image')}
                className={`
                  p-5 rounded-lg border-2 transition-all text-left
                  ${contentMode === 'script-audio-image'
                    ? 'bg-purple-600/20 border-purple-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex gap-1 flex-shrink-0">
                    <FileText className={`w-4 h-4 ${contentMode === 'script-audio-image' ? 'text-purple-400' : 'text-gray-400'}`} />
                    <Mic className={`w-4 h-4 ${contentMode === 'script-audio-image' ? 'text-purple-400' : 'text-gray-400'}`} />
                    <ImageIcon className={`w-4 h-4 ${contentMode === 'script-audio-image' ? 'text-purple-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-1 ${contentMode === 'script-audio-image' ? 'text-purple-300' : 'text-white'}`}>
                      Roteiro + Áudio + Imagem
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Gera roteiro, áudio e imagens para os títulos
                    </p>
                  </div>
                </div>
              </button>

              {/* Modo 4: Apenas Áudio */}
              <button
                onClick={() => setContentMode('audio-only')}
                className={`
                  p-5 rounded-lg border-2 transition-all text-left
                  ${contentMode === 'audio-only'
                    ? 'bg-cyan-600/20 border-cyan-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Mic className={`w-6 h-6 flex-shrink-0 ${contentMode === 'audio-only' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <div>
                    <h3 className={`font-semibold mb-1 ${contentMode === 'audio-only' ? 'text-cyan-300' : 'text-white'}`}>
                      Apenas Áudio
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Gera áudio para roteiros existentes sem áudio
                    </p>
                  </div>
                </div>
              </button>

              {/* Modo 5: Apenas Imagem */}
              <button
                onClick={() => setContentMode('image-only')}
                className={`
                  p-5 rounded-lg border-2 transition-all text-left
                  ${contentMode === 'image-only'
                    ? 'bg-amber-600/20 border-amber-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3 mb-3">
                  <ImageIcon className={`w-6 h-6 flex-shrink-0 ${contentMode === 'image-only' ? 'text-amber-400' : 'text-gray-400'}`} />
                  <div>
                    <h3 className={`font-semibold mb-1 ${contentMode === 'image-only' ? 'text-amber-300' : 'text-white'}`}>
                      Apenas Imagens
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Gera imagens para roteiros com áudio mas sem imagens
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* EXISTING SCRIPTS SELECTION (For audio-only and image-only modes) */}
        {/* ============================================ */}

        {!generateVideo && (contentMode === 'audio-only' || contentMode === 'image-only') && (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Roteiros Existentes</h2>
                <p className="text-sm text-gray-400">
                  {contentMode === 'audio-only'
                    ? 'Selecione roteiros sem áudio para gerar'
                    : 'Selecione roteiros com áudio para gerar imagens'}
                </p>
              </div>
              {selectedScriptIds.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-sm font-medium">
                    {selectedScriptIds.size} selecionado{selectedScriptIds.size > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {existingScriptsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : existingScripts.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 p-12 text-center rounded-lg">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Nenhum roteiro encontrado</p>
                <p className="text-gray-500 text-sm">
                  {contentMode === 'audio-only'
                    ? 'Não há roteiros sem áudio neste canal'
                    : 'Não há roteiros com áudio e sem imagens neste canal'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {existingScripts.map((script) => {
                  const isSelected = selectedScriptIds.has(script.id);

                  return (
                    <div
                      key={script.id}
                      onClick={() => {
                        const newSet = new Set(selectedScriptIds);
                        if (isSelected) {
                          newSet.delete(script.id);
                        } else {
                          newSet.add(script.id);
                        }
                        setSelectedScriptIds(newSet);
                      }}
                      className={`
                        bg-gray-800 border p-4 rounded-lg transition-all cursor-pointer
                        ${isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-gray-700 hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 pt-0.5">
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                            ${isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-600'
                            }
                          `}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                            {script.titulo || 'Sem título'}
                          </h3>
                          <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                            {script.roteiro.substring(0, 80)}...
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>#{script.id}</span>
                            <span>•</span>
                            <span>{new Date(script.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* VIDEO GENERATION METHOD SELECTOR (When generateVideo is ON) */}
        {/* ============================================ */}

        {generateVideo && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-light text-white mb-4">Método de Geração de Vídeo</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Image to Video */}
              <button
                onClick={() => setVideoGenerationMethod('image-to-video')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${videoGenerationMethod === 'image-to-video'
                    ? 'bg-purple-600/20 border-purple-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className={`w-8 h-8 ${videoGenerationMethod === 'image-to-video' ? 'text-purple-400' : 'text-gray-400'}`} />
                  <span className={`font-medium ${videoGenerationMethod === 'image-to-video' ? 'text-white' : 'text-gray-300'}`}>
                    Imagem para Vídeo
                  </span>
                  <span className="text-xs text-gray-400 text-center">
                    Gerar vídeos a partir de imagens
                  </span>
                </div>
              </button>

              {/* Video to Video */}
              <button
                onClick={() => setVideoGenerationMethod('video-to-video')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${videoGenerationMethod === 'video-to-video'
                    ? 'bg-purple-600/20 border-purple-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <Play className={`w-8 h-8 ${videoGenerationMethod === 'video-to-video' ? 'text-purple-400' : 'text-gray-400'}`} />
                  <span className={`font-medium ${videoGenerationMethod === 'video-to-video' ? 'text-white' : 'text-gray-300'}`}>
                    Vídeo para Vídeo
                  </span>
                  <span className="text-xs text-gray-400 text-center">
                    Fazer upload de vídeos
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* DRIVE VIDEO SELECTION BY TITLE */}
        {/* ============================================ */}

        {generateVideo && videoGenerationMethod === 'video-to-video' && addedTitles.length > 0 && (
          <div className="mb-6 space-y-4">
            <h2 className="text-xl font-light text-white mb-4">Selecionar Vídeos por Título</h2>

            {addedTitles.map((title) => (
              <div key={title.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                {/* Título da Box */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">{title.text}</h3>
                  <span className={`text-sm px-3 py-1 rounded ${
                    (driveVideosByTitle[title.id]?.length || 0) > 0
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-red-600/20 text-red-400'
                  }`}>
                    {driveVideosByTitle[title.id]?.length || 0} vídeo(s) selecionado(s)
                  </span>
                </div>

                {/* Seleção Aleatória */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-2">
                      Seleção Aleatória (1-50 vídeos)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={randomVideoCountByTitle[title.id] || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setRandomVideoCountByTitle({
                            ...randomVideoCountByTitle,
                            [title.id]: value
                          });
                        }}
                        placeholder="Ex: 10"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => handleRandomVideoSelection(title.id)}
                        disabled={!randomVideoCountByTitle[title.id] || !availableVideosByTitle[title.id]?.length}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Selecionar Aleatoriamente
                      </button>
                    </div>
                  </div>
                </div>

                {/* DriveVideoSelector */}
                {!selectedChannelId ? (
                  <div className="text-center py-8 text-gray-500">
                    Selecione um canal primeiro
                  </div>
                ) : (
                  <DriveVideoSelector
                    driveUrl={
                      channels.find((c) => c.id.toString() === selectedChannelId)
                        ?.drive_url || ''
                    }
                    onSelectionChange={(urls) => {
                      setDriveVideosByTitle({
                        ...driveVideosByTitle,
                        [title.id]: urls,
                      });
                    }}
                    initialSelectedUrls={driveVideosByTitle[title.id] || []}
                    onVideosLoaded={(videos) => {
                      setAvailableVideosByTitle(prev => ({
                        ...prev,
                        [title.id]: videos
                      }));
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============================================ */}
        {/* DRIVE AUDIO SELECTION BY TITLE */}
        {/* ============================================ */}

        {addedTitles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-light text-white mb-4">Selecionar Trilha Sonora por Título</h2>

            {addedTitles.map((title) => (
              <div key={`audio-${title.id}`} className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
                {/* Título da Box */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">{title.text}</h3>
                  <span className={`text-sm px-3 py-1 rounded ${
                    selectedAudioByTitle[title.id]
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {selectedAudioByTitle[title.id] ? '1 trilha selecionada' : 'Nenhuma trilha selecionada'}
                  </span>
                </div>

                {/* DriveAudioSelector */}
                {!selectedChannelId ? (
                  <div className="text-center py-8 text-gray-500">
                    Selecione um canal primeiro
                  </div>
                ) : (
                  <DriveAudioSelector
                    driveUrl={
                      channels.find((c) => c.id.toString() === selectedChannelId)
                        ?.trilha_url || ''
                    }
                    onSelectionChange={(url) => {
                      setSelectedAudioByTitle({
                        ...selectedAudioByTitle,
                        [title.id]: url,
                      });
                    }}
                    initialSelectedUrl={selectedAudioByTitle[title.id] || null}
                    onAudiosLoaded={(audios) => {
                      setAvailableAudiosByTitle(prev => ({
                        ...prev,
                        [title.id]: audios
                      }));
                    }}
                    dbOffset={audioDbOffsetByTitle[title.id] || 30}
                    onDbOffsetChange={(dbOffset) => {
                      setAudioDbOffsetByTitle({
                        ...audioDbOffsetByTitle,
                        [title.id]: dbOffset,
                      });
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============================================ */}
        {/* SECTION 3: MODEL AND LANGUAGE */}
        {/* ============================================ */}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-light text-white mb-4">Configuração do Roteiro</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Modelo de Roteiro</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="">Selecione um modelo</option>
                <option value="Sonnet-4.5">Sonnet-4.5</option>
                <option value="GPT-5">GPT-5</option>
                <option value="GPT-5-mini">GPT-5-mini</option>
                <option value="Gemini-2.5-Pro">Gemini-2.5-Pro</option>
                <option value="Gemini-2.5-Flash">Gemini-2.5-Flash</option>
              </select>
            </div>

            {/* Language Selection - Editable */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Idioma do Conteúdo</label>
              {isEditingIdioma ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={contentIdioma}
                    onChange={(e) => setContentIdioma(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsEditingIdioma(false)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={contentIdioma}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsEditingIdioma(true);
                      } else {
                        setContentIdioma(e.target.value);
                      }
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="Português-Brasil">Português-Brasil</option>
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="custom">Personalizado...</option>
                  </select>
                  <button
                    onClick={() => setIsEditingIdioma(true)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SECTION 4: AUDIO CONFIGURATION (Conditional) */}
        {/* Show when: generateVideo=true OR contentMode includes audio */}
        {/* ============================================ */}

        {(generateVideo || (!generateVideo && ['script-audio', 'script-audio-image', 'audio-only'].includes(contentMode))) && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Configuração de Áudio
          </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Voice Selection */}
              <div className="voice-dropdown-container">
                <label className="block text-sm text-gray-400 mb-2">Voz</label>

                {/* Voice Search and Dropdown */}
                <div className="relative">
                  <button
                    onClick={handleVoiceDropdownToggle}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500 flex items-center justify-between"
                  >
                    <span>
                      {selectedVoiceId ? (
                        (() => {
                          const voice = voices.find(v => v.id === selectedVoiceId);
                          return voice ? `${voice.nome_voz} | ${voice.plataforma}` : 'Selecione uma voz';
                        })()
                      ) : (
                        'Selecione uma voz'
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showVoiceDropdown && (
                    <div
                      className={`absolute z-50 w-full bg-gray-800 border-2 border-gray-700 rounded-lg shadow-2xl flex flex-col ${
                        dropdownDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
                      }`}
                      style={{ maxHeight: '400px' }}
                    >
                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-700 flex-shrink-0">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={voiceSearchTerm}
                            onChange={(e) => setVoiceSearchTerm(e.target.value)}
                            placeholder="Buscar voz..."
                            className="w-full bg-gray-700 border border-gray-600 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Platform Filter */}
                      <div className="p-3 border-b border-gray-700 flex-shrink-0">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setVoicePlatformFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              voicePlatformFilter === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Todas
                          </button>
                          {availablePlatforms.map((platform) => (
                            <button
                              key={platform}
                              onClick={() => setVoicePlatformFilter(platform)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                voicePlatformFilter === platform
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {platform}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Voice List - Hierarchical by Platform */}
                      <div className="overflow-y-auto flex-1" style={{ maxHeight: '280px' }}>
                        {Object.keys(voicesByPlatform).length === 0 ? (
                          <div className="p-6 text-center text-gray-400">
                            Nenhuma voz encontrada
                          </div>
                        ) : (
                          Object.entries(voicesByPlatform).map(([platform, platformVoices]) => (
                            <div key={platform}>
                              {/* Platform Header */}
                              <div className="bg-gray-700 px-3 py-2 sticky top-0 border-b border-gray-600 z-10">
                                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                  {platform}
                                </span>
                              </div>

                              {/* Voices in Platform */}
                              {platformVoices.map((voice) => (
                                <div
                                  key={voice.id}
                                  className={`p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors ${
                                    selectedVoiceId === voice.id ? 'bg-purple-600/20' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedVoiceId(voice.id);
                                    setShowVoiceDropdown(false);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-white font-medium">{voice.nome_voz}</div>
                                      <div className="text-sm text-gray-400">
                                        {voice.idioma} • {voice.genero}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playSelectedVoicePreview(voice.id);
                                      }}
                                      className={`p-2 rounded-lg transition-colors ${
                                        isAudioPlaying(`voice-preview-${voice.id}`)
                                          ? 'bg-red-600 hover:bg-red-700'
                                          : 'bg-blue-600 hover:bg-blue-700'
                                      }`}
                                      disabled={testingVoices.has(voice.id) && !isAudioPlaying(`voice-preview-${voice.id}`)}
                                    >
                                      {testingVoices.has(voice.id) && !isAudioPlaying(`voice-preview-${voice.id}`) ? (
                                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                                      ) : isAudioPlaying(`voice-preview-${voice.id}`) ? (
                                        <Square className="w-4 h-4 text-white" />
                                      ) : (
                                        <Play className="w-4 h-4 text-white" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Speed */}
              <div>
                {(() => {
                  const selectedVoice = voices.find(v => v.id === selectedVoiceId);
                  const isElevenLabs = selectedVoice?.plataforma === 'ElevenLabs';

                  // Range sempre 0.9 a 1.1
                  // Step: ElevenLabs = 0.01, Fish-Audio e outros = 0.1
                  const minSpeed = 0.9;
                  const maxSpeed = 1.1;
                  const stepSpeed = isElevenLabs ? 0.01 : 0.1;
                  const rangeSpeed = maxSpeed - minSpeed;
                  const progressPercent = ((audioSpeed - minSpeed) / rangeSpeed) * 100;

                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-300">
                          Velocidade do Áudio
                        </label>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-base font-bold text-blue-300">{audioSpeed.toFixed(2)}x</span>
                        </div>
                      </div>
                      <div className="relative pt-1 pb-2">
                        <input
                          type="range"
                          min={minSpeed}
                          max={maxSpeed}
                          step={stepSpeed}
                          value={audioSpeed}
                          onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                          style={{
                            background: `linear-gradient(to right,
                              #3b82f6 0%,
                              #3b82f6 ${progressPercent}%,
                              #1f2937 ${progressPercent}%,
                              #1f2937 100%)`,
                          }}
                        />
                        <div className="flex justify-between text-[10px] mt-2 px-1">
                          <span className="text-orange-400 font-medium">{minSpeed}x</span>
                          <span className="text-blue-400 font-bold">1.0x</span>
                          <span className="text-green-400 font-medium">{maxSpeed}x</span>
                        </div>
                      </div>
                      {isElevenLabs && (
                        <div className="mt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-300">
                            <span className="font-semibold">ElevenLabs</span> possui controle de precisão com step de 0.01
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
        </div>
        )}

        {/* ============================================ */}
        {/* SECTION 5: IMAGE CONFIGURATION (Conditional) */}
        {/* Show when: generateVideo=true with image-to-video OR contentMode includes image */}
        {/* ============================================ */}

        {((generateVideo && videoGenerationMethod === 'image-to-video') || (!generateVideo && ['script-audio-image', 'image-only'].includes(contentMode))) && (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-purple-400/20 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
              Configuração de Imagem
            </h2>

            {/* Style Image Upload */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-purple-300/80 mb-2">Imagem de Referência (opcional)</label>
              <div
                className="relative border-2 border-dashed border-purple-500/40 rounded-lg p-6 hover:border-purple-500/60 transition-colors cursor-pointer bg-gray-800/40"
                onPaste={handleStyleImagePaste}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleStyleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {styleImagePreview ? (
                  <div className="relative">
                    <img
                      src={styleImagePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStyleImage(null);
                        setStyleImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-purple-300/60">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Clique ou cole uma imagem de referência</p>
                  </div>
                )}
              </div>
              {styleImage && (
                <button
                  onClick={handleCollectStyle}
                  disabled={collectingStyle}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none font-medium"
                >
                  {collectingStyle ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Coletando Estilo...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Coletar Estilo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Image Model */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-purple-300/80 mb-2">Modelo de IA para Imagens</label>
              <select
                value={imageModelId || ''}
                onChange={(e) => setImageModelId(parseInt(e.target.value))}
                className="w-full bg-gray-800/60 border border-purple-500/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                disabled={imageModelsLoading}
              >
                <option value="">Selecione um modelo</option>
                {imageModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Style - Same Line */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-purple-300/80 mb-2">Estilo Principal</label>
                <input
                  type="text"
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  placeholder="fotorrealista, cartoon, pintura digital, aquarela..."
                  className="w-full bg-gray-800/60 border border-purple-500/40 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-purple-300/80 mb-2">Detalhamento</label>
                <input
                  type="text"
                  value={imageStyleDetail}
                  onChange={(e) => setImageStyleDetail(e.target.value)}
                  placeholder="4K, alta resolução, cores vibrantes, iluminação suave..."
                  className="w-full bg-gray-800/60 border border-purple-500/40 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                />
              </div>
            </div>

            {/* Image Dimensions and Number */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-purple-300/80 mb-2">Largura (px)</label>
                <input
                  type="number"
                  value={imageWidth}
                  onChange={(e) => setImageWidth(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800/60 border border-purple-500/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-300/80 mb-2">Altura (px)</label>
                <input
                  type="number"
                  value={imageHeight}
                  onChange={(e) => setImageHeight(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800/60 border border-purple-500/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-300/80 mb-2">Número de Imagens</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-800/60 border border-purple-500/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* SECTION 6: GENERATE BUTTON */}
        {/* ============================================ */}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <button
            onClick={handleGenerateContent}
            disabled={
              isGeneratingContent ||
              addedTitles.length === 0 ||
              !selectedModel ||
              (generateAudio && !selectedVoiceId) ||
              (generateImage && !imageModelId)
            }
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg font-medium"
          >
            {isGeneratingContent ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Gerando Conteúdo...
              </>
            ) : generateVideo ? (
              <>
                <Play className="w-6 h-6" />
                Gerar {addedTitles.length} {addedTitles.length === 1 ? 'Vídeo' : 'Vídeos'}
              </>
            ) : (
              <>
                <FileText className="w-6 h-6" />
                Gerar Conteúdo Completo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in ${
          toastType === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toastType === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setShowToast(false)}
            className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
