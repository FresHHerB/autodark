import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface CompactImageUploadProps {
  currentImage?: string;
  channelName: string;
  onUpload: (imageData: { type: string; base64: string }) => Promise<void>;
  disabled?: boolean;
}

export function CompactImageUpload({ currentImage, channelName, onUpload, disabled = false }: CompactImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    try {
      const base64WithPrefix = await convertToBase64(file);
      setPreview(base64WithPrefix);

      // Extract pure base64 without data URI prefix
      const base64Pure = base64WithPrefix.split(',')[1];

      // Auto-upload when file is selected
      setIsUploading(true);
      await onUpload({
        type: file.type,
        base64: base64Pure,
      });
    } catch (error) {
      console.error('Error converting file to base64:', error);
      alert('Erro ao processar a imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === containerRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  // Setup paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!disabled) {
        const items = e.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                handleFile(blob);
              }
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        flex items-center gap-6 p-4 rounded-lg border-2 border-dashed transition-all
        ${isDragging
          ? 'border-white bg-gray-800'
          : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Image Preview */}
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center">
          {preview ? (
            <img
              src={preview.startsWith('data:') ? preview : `${preview}?t=${Date.now()}`}
              alt={channelName}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-600" />
          )}
        </div>
      </div>

      {/* Info and Actions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-white font-medium text-sm">Imagem do Canal</h4>
          {isUploading && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          )}
        </div>
        <p className="text-xs text-gray-400">
          Arraste, cole (Ctrl+V) ou clique para selecionar uma imagem
        </p>
      </div>

      {/* Upload Button */}
      <button
        type="button"
        onClick={handleSelectClick}
        disabled={disabled || isUploading}
        className="flex-shrink-0 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        <span>Selecionar</span>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
