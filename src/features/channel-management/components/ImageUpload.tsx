import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  currentImage?: string;
  channelName: string;
  onUpload: (imageData: { type: string; base64: string }) => Promise<void>;
  disabled?: boolean;
}

export function ImageUpload({ currentImage, channelName, onUpload, disabled = false }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [imageType, setImageType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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
      const base64 = await convertToBase64(file);
      setPreview(base64);
      setImageType(file.type);
    } catch (error) {
      console.error('Error converting file to base64:', error);
      alert('Erro ao processar a imagem');
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
    setIsDragging(false);
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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          handleFile(blob);
        }
        break;
      }
    }
  };

  const handleUploadClick = async () => {
    if (!preview || !imageType || isUploading || disabled) return;

    setIsUploading(true);
    try {
      // Extract pure base64 without data URI prefix
      const base64Pure = preview.split(',')[1] || preview;

      await onUpload({
        type: imageType,
        base64: base64Pure,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao atualizar a imagem do canal');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  // Setup paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (dropZoneRef.current && !disabled) {
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
    <div className="space-y-4">
      {/* Preview Area */}
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center">
            {preview ? (
              <img
                src={preview.startsWith('data:') ? preview : `${preview}?t=${Date.now()}`}
                alt={channelName}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-16 h-16 text-gray-600" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-white font-medium mb-1">Imagem do Canal</h4>
          <p className="text-sm text-gray-400 mb-3">
            Arraste, cole ou selecione uma imagem
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectClick}
              disabled={disabled}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selecionar Imagem
            </button>
            {preview && (
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={isUploading || disabled}
                className="px-4 py-2 bg-white hover:bg-gray-200 text-black text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Atualizar Imagem</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging
            ? 'border-white bg-gray-800'
            : 'border-gray-700 hover:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={!disabled ? handleSelectClick : undefined}
      >
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm mb-1">
          Arraste e solte uma imagem aqui ou clique para selecionar
        </p>
        <p className="text-gray-500 text-xs">
          Você também pode colar (Ctrl+V) uma imagem copiada
        </p>
      </div>

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
