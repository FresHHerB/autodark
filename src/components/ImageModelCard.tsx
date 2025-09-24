import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';

interface ImageModel {
  id: number;
  name: string;
  air: string;
  created_at: string;
}

interface ImageModelCardProps {
  model: ImageModel;
  onEdit: () => void;
  onDelete: () => void;
}

const ImageModelCard: React.FC<ImageModelCardProps> = ({ model, onEdit, onDelete }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-600">
            <span className="text-xs font-bold text-white">RW</span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">{model.name || 'Modelo sem nome'}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Runware</span>
              <span>• AIR: {model.air}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModelCard;