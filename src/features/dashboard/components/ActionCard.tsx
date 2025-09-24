import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: 'ready' | 'processing' | 'disabled';
  color: 'blue' | 'green' | 'purple' | 'orange';
  onClick: () => void;
}

const colorClasses = {
  blue: {
    border: 'hover:border-blue-500',
    icon: 'text-blue-400',
    glow: 'hover:shadow-blue-500/10'
  },
  green: {
    border: 'hover:border-green-500',
    icon: 'text-green-400',
    glow: 'hover:shadow-green-500/10'
  },
  purple: {
    border: 'hover:border-purple-500',
    icon: 'text-purple-400',
    glow: 'hover:shadow-purple-500/10'
  },
  orange: {
    border: 'hover:border-orange-500',
    icon: 'text-orange-400',
    glow: 'hover:shadow-orange-500/10'
  }
};

export default function ActionCard({ 
  title, 
  description, 
  icon: Icon, 
  status, 
  color,
  onClick 
}: ActionCardProps) {
  const colors = colorClasses[color];
  const isDisabled = status === 'disabled';
  const isProcessing = status === 'processing';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        group relative w-full bg-gray-900 border border-gray-800 p-6 text-left
        transition-all duration-300 ease-out
        ${!isDisabled ? `${colors.border} hover:shadow-xl ${colors.glow}` : 'opacity-50 cursor-not-allowed'}
        ${!isDisabled ? 'hover:bg-gray-850' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          p-3 bg-gray-800 border border-gray-700 
          ${!isDisabled ? 'group-hover:border-gray-600' : ''} 
          transition-colors
        `}>
          <Icon className={`w-5 h-5 ${isDisabled ? 'text-gray-600' : colors.icon}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-medium mb-2 
            ${isDisabled ? 'text-gray-600' : 'text-white'}
          `}>
            {title}
          </h3>
          <p className={`
            text-sm leading-relaxed
            ${isDisabled ? 'text-gray-700' : 'text-gray-400'}
          `}>
            {description}
          </p>
        </div>
      </div>

      {isProcessing && (
        <div className="absolute top-4 right-4">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>
      )}

      <div className={`
        absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r 
        ${colors.icon.replace('text-', 'from-')} to-transparent
        transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left
        ${isDisabled ? 'hidden' : ''}
      `}></div>
    </button>
  );
}