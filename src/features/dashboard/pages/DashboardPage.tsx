import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/contexts';
import { DashboardHeader, ActionCard } from '@features/dashboard/components';
import { Copy, Video, Edit, Calendar, Settings, PlaySquare } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
                <span className="text-gray-400 text-sm">Vídeos Criados</span>
                <span className="text-white font-medium">47</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Canais Clonados</span>
                <span className="text-white font-medium">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Visualizações Totais</span>
                <span className="text-white font-medium">2.3M</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}