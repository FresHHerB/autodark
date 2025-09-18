import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'gray';
}

export default function LoadingSpinner({ size = 'md', color = 'white' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent'
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      ${colorClasses[color]} 
      border-2 rounded-full animate-spin
    `} />
  );
}