import React from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onSave: (content: string) => void;
}

export default function PromptModal({ isOpen, onClose, title, content, onSave }: PromptModalProps) {
  const [editedContent, setEditedContent] = React.useState(content);

  React.useEffect(() => {
    setEditedContent(content);
  }, [content]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-lg font-light text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-64 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 focus:outline-none focus:border-gray-600 transition-colors resize-none"
            placeholder="Digite o prompt aqui..."
          />
        </div>
        
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-white text-black px-6 py-2 hover:bg-gray-200 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}