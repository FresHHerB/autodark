import React from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ isOpen, imageUrl, imageAlt = 'Imagem', onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    if (isOpen) {
      setZoom(1);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = imageAlt || 'imagem.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors backdrop-blur-sm"
          title="Diminuir zoom"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors backdrop-blur-sm"
          title="Aumentar zoom"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors backdrop-blur-sm"
          title="Baixar imagem"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors backdrop-blur-sm"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gray-800/80 text-white rounded-lg backdrop-blur-sm">
        {Math.round(zoom * 100)}%
      </div>

      {/* Image */}
      <div
        className="max-w-full max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease-out',
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain'
          }}
          className="cursor-zoom-in"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
        />
      </div>
    </div>
  );
}
