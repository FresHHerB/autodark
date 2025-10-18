import React from 'react';
import { useAuth } from '@shared/contexts';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Settings, Bell, Copy, Video, Edit, Calendar, PlaySquare, FileText, List } from 'lucide-react';

const navigationCards = [
  {
    id: 'clone',
    title: 'Clonar Canal',
    icon: Copy,
    path: '/clone-channel'
  },
  {
    id: 'manage',
    title: 'Editar/Gerenciar Canal',
    icon: Edit,
    path: '/manage-channel'
  },
  {
    id: 'generate-content',
    title: 'Gerar Conteúdo',
    icon: FileText,
    path: '/generate-content'
  },
  {
    id: 'generate-content-v2',
    title: 'Conteúdo v2',
    icon: FileText,
    path: '/generate-content-v2'
  },
  {
    id: 'view-scripts',
    title: 'Visualizar Roteiros',
    icon: List,
    path: '/view-scripts'
  },
  {
    id: 'generate',
    title: 'Gerar Vídeo',
    icon: Video,
    path: '/generate-video'
  },
  {
    id: 'videos',
    title: 'Visualização de Vídeos',
    icon: PlaySquare,
    path: '/review-edit'
  },
  {
    id: 'publish',
    title: 'Publicar/Agendar',
    icon: Calendar,
    path: '/publish-schedule'
  }
];

export default function DashboardHeader() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xl font-light text-white hover:text-gray-300 transition-colors"
            >
              Video AI Studio
            </button>
            
            {/* Navigation Cards */}
            <nav className="hidden lg:flex items-center gap-2">
              {navigationCards.map((card) => {
                const Icon = card.icon;
                const isActive = location.pathname === card.path;
                
                return (
                  <button
                    key={card.id}
                    onClick={() => navigate(card.path)}
                    className={`
                      flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200
                      border border-transparent
                      ${isActive 
                        ? 'bg-gray-800 border-gray-700 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden xl:inline">{card.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
              <div className="text-right">
                <p className="text-white text-sm font-medium">
                  {user?.email}
                </p>
                <p className="text-gray-400 text-xs">
                  Admin
                </p>
              </div>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden mt-4 pt-4 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-2">
            {navigationCards.map((card) => {
              const Icon = card.icon;
              const isActive = location.pathname === card.path;
              return (
                <button
                  key={card.id}
                  onClick={() => navigate(card.path)}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm transition-all duration-200
                    border border-transparent
                    ${isActive 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{card.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}