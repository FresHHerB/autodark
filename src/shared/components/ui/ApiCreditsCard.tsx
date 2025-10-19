import React from 'react';
import { Loader2, Key, DollarSign, Type, Zap } from 'lucide-react';
import { APICreditsResult, formatCredits, getUnitLabel } from '@shared/services';

interface ApiCreditsCardProps {
  platform: string;
  credits: APICreditsResult | null;
  isLoading: boolean;
  compact?: boolean;
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'ElevenLabs':
      return Type;
    case 'Fish-Audio':
      return DollarSign;
    case 'Runware':
      return Zap;
    case 'OpenRouter':
      return Key;
    default:
      return Key;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform) {
    case 'ElevenLabs':
      return {
        bg: 'from-green-900/20 to-green-800/20',
        border: 'border-green-500/30',
        icon: 'text-green-400',
        text: 'text-green-300'
      };
    case 'Fish-Audio':
      return {
        bg: 'from-cyan-900/20 to-cyan-800/20',
        border: 'border-cyan-500/30',
        icon: 'text-cyan-400',
        text: 'text-cyan-300'
      };
    case 'Runware':
      return {
        bg: 'from-purple-900/20 to-purple-800/20',
        border: 'border-purple-500/30',
        icon: 'text-purple-400',
        text: 'text-purple-300'
      };
    case 'OpenRouter':
      return {
        bg: 'from-gray-800/30 to-gray-700/30',
        border: 'border-gray-600/40',
        icon: 'text-gray-300',
        text: 'text-gray-200'
      };
    default:
      return {
        bg: 'from-gray-900/20 to-gray-800/20',
        border: 'border-gray-500/30',
        icon: 'text-gray-400',
        text: 'text-gray-300'
      };
  }
};

export function ApiCreditsCard({ platform, credits, isLoading, compact = false }: ApiCreditsCardProps) {
  const Icon = getPlatformIcon(platform);
  const colors = getPlatformColor(platform);

  if (compact) {
    return (
      <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4`}>
        <div className="flex items-center space-x-2 mb-2">
          <Icon className={`w-4 h-4 ${colors.icon}`} />
          <span className={`${colors.text} text-sm font-medium`}>{platform}</span>
        </div>
        <div className="text-emerald-400 text-xl font-bold">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : credits?.error ? (
            <span className="text-red-400 text-sm">Erro</span>
          ) : (
            formatCredits(credits?.credits || 'N/A', credits?.unit || 'credits')
          )}
        </div>
        {credits?.unit === 'characters' && !isLoading && !credits.error && (
          <span className="text-xs text-gray-500">caracteres</span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4 hover:border-opacity-60 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 bg-gray-900/50 rounded-lg`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div>
            <h4 className="text-white font-medium">{platform}</h4>
            <p className="text-gray-400 text-xs">API de {platform === 'ElevenLabs' ? 'Áudio' : platform === 'Fish-Audio' ? 'Áudio' : platform === 'OpenRouter' ? 'LLM' : 'Imagem'}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700/50">
        {isLoading ? (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando créditos...</span>
          </div>
        ) : credits?.error ? (
          <div className="text-red-400 text-sm">
            Erro ao carregar créditos
          </div>
        ) : credits ? (
          <div className="flex items-center justify-between bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/50 rounded-lg px-3 py-2">
            <span className="text-gray-300 text-sm">
              {getUnitLabel(credits.unit)}:
            </span>
            <span className="text-emerald-400 font-bold">
              {formatCredits(credits.credits, credits.unit)}
              {credits.unit === 'characters' && ' chars'}
            </span>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            Créditos não disponíveis
          </div>
        )}
      </div>
    </div>
  );
}
