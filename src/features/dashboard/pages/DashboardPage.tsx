import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/contexts';
import { DashboardHeader, ActionCard } from '@features/dashboard/components';
import { Copy, Video, Edit, Calendar, Settings, PlaySquare } from 'lucide-react';
import { supabase } from '@shared/lib/supabase';
import { ApiCreditsCard } from '@shared/components/ui';
import {
  fetchElevenLabsCredits,
  fetchFishAudioCredits,
  fetchRunwareCredits,
  fetchOpenRouterCredits,
  APICreditsResult
} from '@shared/services';

interface ApiCreditsState {
  platform: string;
  credits: APICreditsResult | null;
  isLoading: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    canais: 0,
    roteiros: 0,
    videos: 0
  });
  const [apiCredits, setApiCredits] = useState<ApiCreditsState[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Buscar quantidade de canais
        const { count: canaisCount } = await supabase
          .from('canais')
          .select('*', { count: 'exact', head: true });

        // Buscar quantidade de roteiros
        const { count: roteirosCount } = await supabase
          .from('roteiros')
          .select('*', { count: 'exact', head: true });

        // Buscar quantidade de vídeos
        const { count: videosCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true });

        setStats({
          canais: canaisCount || 0,
          roteiros: roteirosCount || 0,
          videos: videosCount || 0
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const loadApiCredits = async () => {
      try {
        // Buscar APIs do Supabase
        const { data: apis, error } = await supabase
          .from('apis')
          .select('id, plataforma, api_key')
          .in('plataforma', ['ElevenLabs', 'Fish-Audio', 'Runware', 'OpenRouter']);

        if (error) throw error;
        if (!apis || apis.length === 0) {
          setApiCredits([]);
          return;
        }

        // Ordem customizada: OpenRouter, Fish-Audio, Runware, ElevenLabs
        const platformOrder = ['OpenRouter', 'Fish-Audio', 'Runware', 'ElevenLabs'];
        apis.sort((a, b) => {
          const indexA = platformOrder.indexOf(a.plataforma);
          const indexB = platformOrder.indexOf(b.plataforma);
          return indexA - indexB;
        });

        // Inicializar estado com loading
        const initialState = apis.map(api => ({
          platform: api.plataforma,
          credits: null,
          isLoading: true
        }));
        setApiCredits(initialState);

        // Carregar créditos de cada API
        const creditsPromises = apis.map(async (api) => {
          let credits: APICreditsResult | null = null;

          try {
            switch (api.plataforma) {
              case 'ElevenLabs':
                credits = await fetchElevenLabsCredits(api.api_key);
                break;
              case 'Fish-Audio':
                credits = await fetchFishAudioCredits(api.api_key);
                break;
              case 'Runware':
                credits = await fetchRunwareCredits(api.api_key);
                break;
              case 'OpenRouter':
                credits = await fetchOpenRouterCredits(api.api_key);
                break;
            }
          } catch (err) {
            console.error(`Erro ao buscar créditos de ${api.plataforma}:`, err);
          }

          return {
            platform: api.plataforma,
            credits,
            isLoading: false
          };
        });

        const results = await Promise.all(creditsPromises);
        setApiCredits(results);
      } catch (error) {
        console.error('Erro ao carregar créditos:', error);
        setApiCredits([]);
      }
    };

    loadApiCredits();
  }, []);

  const actionCards = [
    {
      id: 'clone-channel',
      title: 'Clonar Canal',
      description: 'Analise e replique a estrutura de canais existentes para criar conteúdo similar',
      icon: Copy,
      status: 'ready' as const,
      color: 'blue' as const,
      onClick: () => navigate('/clone-channel')
    },
    {
      id: 'generate-video',
      title: 'Gerar Vídeo',
      description: 'Crie vídeos automaticamente usando IA baseada nos dados coletados',
      icon: Video,
      status: 'ready' as const,
      color: 'green' as const,
      onClick: () => navigate('/generate-video')
    },
    {
      id: 'manage-channel',
      title: 'Editar/Gerenciar Canal',
      description: 'Configure prompts, temas e configurações dos seus canais clonados',
      icon: Edit,
      status: 'ready' as const,
      color: 'purple' as const,
      onClick: () => navigate('/manage-channel')
    },
    {
      id: 'review-edit',
      title: 'Visualização de Vídeos',
      description: 'Acompanhe o status de processamento e visualize seus vídeos prontos',
      icon: PlaySquare,
      status: 'ready' as const,
      color: 'orange' as const,
      onClick: () => navigate('/review-edit')
    },
    {
      id: 'publish-schedule',
      title: 'Publicar/Agendar',
      description: 'Publique imediatamente ou agende seus vídeos para horários específicos',
      icon: Calendar,
      status: 'ready' as const,
      color: 'blue' as const,
      onClick: () => navigate('/publish-schedule')
    },
    {
      id: 'settings',
      title: 'Configurações Gerais',
      description: 'Configure variáveis globais de criação de conteúdo e modelos de voz',
      icon: Settings,
      status: 'ready' as const,
      color: 'purple' as const,
      onClick: () => navigate('/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm">
            Bem-vindo de volta, {user?.email}. Gerencie seus projetos de vídeo automatizados.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {actionCards.map((card) => (
            <ActionCard
              key={card.id}
              {...card}
            />
          ))}
        </div>

        {/* API Credits Section */}
        {apiCredits.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-light text-white mb-4">Créditos das APIs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {apiCredits.map((api, index) => (
                <ApiCreditsCard
                  key={index}
                  platform={api.platform}
                  credits={api.credits}
                  isLoading={api.isLoading}
                  compact={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats and Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 p-6">
              <h3 className="text-lg font-light text-white mb-4">
                Atividade Recente
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">
                        Vídeo gerado com sucesso
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      há {i} hora{i > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6">
            <h3 className="text-lg font-light text-white mb-4">
              Estatísticas
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Canais Clonados</span>
                <span className="text-white font-medium">{stats.canais}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Roteiros Criados</span>
                <span className="text-white font-medium">{stats.roteiros}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Vídeos Criados</span>
                <span className="text-white font-medium">{stats.videos}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}