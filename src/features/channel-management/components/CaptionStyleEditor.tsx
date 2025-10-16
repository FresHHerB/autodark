import React, { useState, useRef, useEffect } from 'react';
import { Type, Palette, Square, Move, Layers } from 'lucide-react';

// Types based on API documentation
type CaptionType = 'segments' | 'highlight';

interface SegmentsStyle {
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
  };
  colors?: {
    primary?: string;
    outline?: string;
  };
  border?: {
    style?: number; // 1=outline, 3=box, 4=rounded
    width?: number;
  };
  position?: {
    alignment?: string;
    marginVertical?: number;
  };
}

interface HighlightStyle {
  fonte?: string;
  tamanho_fonte?: number;
  fundo_cor?: string;
  fundo_opacidade?: number;
  fundo_arredondado?: boolean;
  texto_cor?: string;
  highlight_texto_cor?: string;
  highlight_cor?: string;
  highlight_borda?: number;
  padding_horizontal?: number;
  padding_vertical?: number;
  position?: string;
  words_per_line?: number;
  max_lines?: number;
}

export interface CaptionStyleConfig {
  uppercase?: boolean;
  type: CaptionType;
  style: SegmentsStyle | HighlightStyle;
}

interface CaptionStyleEditorProps {
  initialConfig?: CaptionStyleConfig;
  onChange?: (config: CaptionStyleConfig) => void;
}

const POSITION_OPTIONS = [
  { value: 'bottom_left', label: 'Inferior Esquerda' },
  { value: 'bottom_center', label: 'Inferior Centro' },
  { value: 'bottom_right', label: 'Inferior Direita' },
  { value: 'middle_left', label: 'Meio Esquerda' },
  { value: 'middle_center', label: 'Meio Centro' },
  { value: 'middle_right', label: 'Meio Direita' },
  { value: 'top_left', label: 'Superior Esquerda' },
  { value: 'top_center', label: 'Superior Centro' },
  { value: 'top_right', label: 'Superior Direita' },
];

const BORDER_STYLE_OPTIONS = [
  { value: 1, label: 'Contorno' },
  { value: 3, label: 'Caixa' },
  { value: 4, label: 'Arredondado' },
];

const POPULAR_FONTS = [
  'Arial',
  'Arial Black',
  'The Luckiest Guy',
  'Impact',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Comic Sans MS',
  'Trebuchet MS',
  'Montserrat',
  'Roboto',
  'Open Sans',
];

export const CaptionStyleEditor: React.FC<CaptionStyleEditorProps> = ({
  initialConfig,
  onChange,
}) => {
  const [captionType, setCaptionType] = useState<CaptionType>(initialConfig?.type || 'highlight');
  const [uppercase, setUppercase] = useState<boolean>(initialConfig?.uppercase ?? false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  // Build preview image URL from environment variables
  const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://minio.automear.com/';
  const imagemPreviewUrl = import.meta.env.VITE_IMAGEM_PREVIEW_URL || 'canais/imagem_preview.jpg';
  const previewImageUrl = `${minioUrl}${imagemPreviewUrl}`;

  // Calculate scale for preview based on 1080p video dimensions
  useEffect(() => {
    const calculateScale = () => {
      if (previewRef.current) {
        const previewHeight = previewRef.current.clientHeight;
        // Scale based on 1080p video height
        const scale = previewHeight / 1080;
        setPreviewScale(scale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // Segments state with defaults
  const [segmentsStyle, setSegmentsStyle] = useState<SegmentsStyle>({
    font: {
      name: 'Arial',
      size: 36,
      bold: true,
    },
    colors: {
      primary: '#FFFFFF',
      outline: '#000000',
    },
    border: {
      style: 1,
      width: 3,
    },
    position: {
      alignment: 'bottom_center',
      marginVertical: 20,
    },
    ...(initialConfig?.type === 'segments' ? initialConfig.style : {}),
  });

  // Highlight state with defaults
  const [highlightStyle, setHighlightStyle] = useState<HighlightStyle>({
    fonte: 'Arial Black',
    tamanho_fonte: 72,
    fundo_cor: '#000000',
    fundo_opacidade: 50,
    fundo_arredondado: true,
    texto_cor: '#FFFFFF',
    highlight_texto_cor: undefined, // Uses texto_cor by default if not set
    highlight_cor: '#D60000',
    highlight_borda: 12,
    padding_horizontal: 40,
    padding_vertical: 80,
    position: 'bottom_center',
    words_per_line: 4,
    max_lines: 2,
    ...(initialConfig?.type === 'highlight' ? initialConfig.style : {}),
  });

  // Initialize parent with default values on mount
  useEffect(() => {
    if (onChange) {
      onChange({
        uppercase,
        type: captionType,
        style: captionType === 'segments' ? segmentsStyle : highlightStyle,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - intentionally ignoring dependencies

  const handleTypeChange = (type: CaptionType) => {
    setCaptionType(type);
    onChange?.({
      uppercase,
      type,
      style: type === 'segments' ? segmentsStyle : highlightStyle,
    });
  };

  const handleUppercaseChange = (value: boolean) => {
    setUppercase(value);
    onChange?.({
      uppercase: value,
      type: captionType,
      style: captionType === 'segments' ? segmentsStyle : highlightStyle,
    });
  };

  const updateSegmentsStyle = (updates: Partial<SegmentsStyle>) => {
    const newStyle = { ...segmentsStyle, ...updates };
    setSegmentsStyle(newStyle);
    onChange?.({ uppercase, type: captionType, style: newStyle });
  };

  const updateHighlightStyle = (updates: Partial<HighlightStyle>) => {
    const newStyle = { ...highlightStyle, ...updates };
    setHighlightStyle(newStyle);
    onChange?.({ uppercase, type: captionType, style: newStyle });
  };

  // Helper to get computed styles for preview (scaled for 1080p representation)
  const getPreviewStyles = () => {
    if (captionType === 'segments') {
      const position = segmentsStyle.position?.alignment || 'bottom_center';
      const [vertical, horizontal] = position.split('_');

      const fontSize = (segmentsStyle.font?.size || 36) * previewScale;
      const borderWidth = (segmentsStyle.border?.width || 3) * previewScale;
      const marginVertical = (segmentsStyle.position?.marginVertical || 20) * previewScale;

      return {
        container: {
          justifyContent: horizontal === 'left' ? 'flex-start' : horizontal === 'right' ? 'flex-end' : 'center',
          alignItems: vertical === 'top' ? 'flex-start' : vertical === 'bottom' ? 'flex-end' : 'center',
          padding: `${marginVertical}px ${20 * previewScale}px`,
        },
        text: {
          fontFamily: segmentsStyle.font?.name || 'Arial',
          fontSize: `${fontSize}px`,
          fontWeight: segmentsStyle.font?.bold ? 'bold' : 'normal',
          color: segmentsStyle.colors?.primary || '#FFFFFF',
          textShadow: `
            -${borderWidth}px -${borderWidth}px 0 ${segmentsStyle.colors?.outline || '#000000'},
            ${borderWidth}px -${borderWidth}px 0 ${segmentsStyle.colors?.outline || '#000000'},
            -${borderWidth}px ${borderWidth}px 0 ${segmentsStyle.colors?.outline || '#000000'},
            ${borderWidth}px ${borderWidth}px 0 ${segmentsStyle.colors?.outline || '#000000'}
          `,
        },
      };
    } else {
      const position = highlightStyle.position || 'bottom_center';
      const [vertical, horizontal] = position.split('_');

      // Calculate opacity in hex
      const opacityHex = Math.round((highlightStyle.fundo_opacidade || 50) * 2.55).toString(16).padStart(2, '0');
      const bgColor = `${highlightStyle.fundo_cor || '#000000'}${opacityHex}`;

      const fontSize = (highlightStyle.tamanho_fonte || 72) * previewScale;
      // FFmpeg renders borders more prominently than CSS, so we use a larger multiplier
      // to better represent the final video appearance (2x the normal scale)
      const highlightBorder = (highlightStyle.highlight_borda || 12) * previewScale * 2;
      const paddingH = (highlightStyle.padding_horizontal || 40) * previewScale;
      const paddingV = (highlightStyle.padding_vertical || 80) * previewScale;
      const borderRadius = highlightStyle.fundo_arredondado ? (12 * previewScale) : 0;
      const bgPadding = 16 * previewScale;

      return {
        container: {
          justifyContent: horizontal === 'left' ? 'flex-start' : horizontal === 'right' ? 'flex-end' : 'center',
          alignItems: vertical === 'top' ? 'flex-start' : vertical === 'bottom' ? 'flex-end' : 'center',
          padding: `${paddingV}px ${paddingH}px`,
        },
        background: {
          backgroundColor: bgColor,
          borderRadius: `${borderRadius}px`,
          padding: `${bgPadding}px ${bgPadding * 1.5}px`,
        },
        text: {
          fontFamily: highlightStyle.fonte || 'Arial Black',
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: highlightStyle.texto_cor || '#FFFFFF',
        },
        highlight: {
          color: highlightStyle.highlight_texto_cor || highlightStyle.texto_cor || '#FFFFFF',
          WebkitTextStroke: `${highlightBorder}px ${highlightStyle.highlight_cor || '#D60000'}`,
          textStroke: `${highlightBorder}px ${highlightStyle.highlight_cor || '#D60000'}`,
          paintOrder: 'stroke fill',
        },
      };
    }
  };

  const previewStyles = getPreviewStyles();

  // Generate dynamic preview text for Karaoke mode based on words_per_line and max_lines
  const generateKaraokePreview = () => {
    const sampleWords = [
      'Esta', 'é', 'uma', 'demonstração', 'visual', 'de', 'legendas', 'no', 'estilo',
      'karaoke', 'com', 'destaque', 'palavra', 'por', 'palavra', 'ajuste', 'os', 'controles'
    ];

    const wordsPerLine = highlightStyle.words_per_line || 4;
    const maxLines = highlightStyle.max_lines || 2;

    // Calculate total words to display
    const totalWords = wordsPerLine * maxLines;
    const words = sampleWords.slice(0, totalWords);

    // Split words into lines
    const lines: string[][] = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine));
    }

    // Highlight middle word in middle line
    const highlightLineIndex = Math.floor(lines.length / 2);
    const highlightWordIndex = Math.floor((lines[highlightLineIndex]?.length || 0) / 2);

    return lines.map((line, lineIndex) => (
      <div key={lineIndex} style={{ marginBottom: lineIndex < lines.length - 1 ? '4px' : '0' }}>
        {line.map((word, wordIndex) => {
          const isHighlighted = lineIndex === highlightLineIndex && wordIndex === highlightWordIndex;
          return (
            <span key={wordIndex}>
              {isHighlighted ? (
                <span style={previewStyles.highlight}>{word}</span>
              ) : (
                <span>{word}</span>
              )}
              {wordIndex < line.length - 1 && ' '}
            </span>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="space-y-8">
      {/* Uppercase Toggle */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-white font-medium text-sm mb-1">
              Texto em Maiúsculas
            </label>
            <p className="text-xs text-gray-400">
              Converte todo o texto das legendas para maiúsculas (UPPERCASE)
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => handleUppercaseChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Type Selector */}
      <div>
        <label className="block text-white font-medium mb-4 text-sm">
          Tipo de Legenda
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleTypeChange('segments')}
            className={`
              p-5 border-2 transition-all text-left rounded-lg group
              ${captionType === 'segments'
                ? 'bg-white/5 border-white text-white shadow-lg'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800/50'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-5 h-5" />
              <div className="font-semibold">Tradicional</div>
            </div>
            <div className="text-xs opacity-70 leading-relaxed">
              Legendas por segmento, ideais para vídeos longos e conteúdo formal
            </div>
          </button>
          <button
            onClick={() => handleTypeChange('highlight')}
            className={`
              p-5 border-2 transition-all text-left rounded-lg group
              ${captionType === 'highlight'
                ? 'bg-white/5 border-white text-white shadow-lg'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800/50'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5" />
              <div className="font-semibold">Karaoke</div>
            </div>
            <div className="text-xs opacity-70 leading-relaxed">
              Destaque palavra por palavra, perfeito para shorts e reels dinâmicos
            </div>
          </button>
        </div>
      </div>

      {/* Preview and Controls Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Preview - Takes 3 columns */}
        <div className="xl:col-span-3">
          <label className="block text-white font-medium mb-4 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Pré-visualização em Tempo Real
            <span className="text-xs text-gray-500 font-normal">(proporção 1080p)</span>
          </label>
          <div
            ref={previewRef}
            className="border-2 border-gray-700 aspect-video flex items-center justify-center relative overflow-hidden rounded-lg shadow-2xl bg-gray-900"
            style={{
              backgroundImage: `url(${previewImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Dark overlay for better caption visibility */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Play button overlay for realism */}
            <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded text-white text-xs font-medium">
              Preview
            </div>

            {/* Caption Preview */}
            <div
              className="absolute inset-0 flex z-10"
              style={previewStyles.container}
            >
              {captionType === 'segments' ? (
                <div style={previewStyles.text}>
                  Este é um exemplo de legenda
                </div>
              ) : (
                <div style={previewStyles.background}>
                  <div style={previewStyles.text}>
                    {generateKaraokePreview()}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 bg-gray-900/50 p-3 rounded border border-gray-800">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-gray-400 text-xs">ℹ️</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {captionType === 'highlight' ? (
                <>
                  O preview ajusta automaticamente a quantidade de linhas e palavras conforme você altera os controles.
                  A palavra destacada representa o efeito karaoke em ação.
                </>
              ) : (
                <>
                  As mudanças nos controles ao lado são refletidas instantaneamente nesta prévia.
                  O visual final será renderizado no vídeo com a mesma aparência.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Controls - Takes 2 columns */}
        <div className="xl:col-span-2">
          <label className="block text-white font-medium mb-4 text-sm">
            Controles de Estilo
          </label>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
            {captionType === 'segments' ? (
              <SegmentsControls
                style={segmentsStyle}
                onChange={updateSegmentsStyle}
              />
            ) : (
              <HighlightControls
                style={highlightStyle}
                onChange={updateHighlightStyle}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Segments Controls Component
const SegmentsControls: React.FC<{
  style: SegmentsStyle;
  onChange: (updates: Partial<SegmentsStyle>) => void;
}> = ({ style, onChange }) => {
  return (
    <div className="space-y-5">
      {/* TEXTO GERAL */}
      <div className="space-y-4 pb-5 border-b-2 border-gray-700">
        <div className="flex items-center gap-2 text-white font-bold text-base bg-gradient-to-r from-blue-600/20 to-transparent -mx-6 px-6 py-3 border-l-4 border-blue-500">
          <Type className="w-5 h-5" />
          TEXTO GERAL
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Fonte</label>
          <select
            value={style.font?.name || 'Arial'}
            onChange={(e) => onChange({ font: { ...style.font, name: e.target.value } })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-600 rounded"
          >
            {POPULAR_FONTS.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">
            Tamanho: {style.font?.size || 36}px
          </label>
          <input
            type="range"
            min="20"
            max="200"
            value={style.font?.size || 36}
            onChange={(e) => onChange({ font: { ...style.font, size: parseInt(e.target.value) } })}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="bold"
            checked={style.font?.bold ?? true}
            onChange={(e) => onChange({ font: { ...style.font, bold: e.target.checked } })}
            className="w-4 h-4 accent-blue-500"
          />
          <label htmlFor="bold" className="text-gray-400 text-sm">Texto em Negrito</label>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Cor do Texto</label>
          <div className="relative">
            <input
              type="color"
              value={style.colors?.primary || '#FFFFFF'}
              onChange={(e) => onChange({ colors: { ...style.colors, primary: e.target.value } })}
              className="absolute left-0 top-0 w-10 h-full cursor-pointer rounded-l border-r-0"
              style={{ padding: 0, margin: 0 }}
            />
            <input
              type="text"
              value={style.colors?.primary || '#FFFFFF'}
              onChange={(e) => onChange({ colors: { ...style.colors, primary: e.target.value } })}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-2 py-2 text-xs focus:outline-none focus:border-gray-600 rounded"
              placeholder="#FFFFFF"
              maxLength={9}
            />
          </div>
        </div>
      </div>

      {/* CONTORNO E BORDA */}
      <div className="space-y-4 pb-5 border-b-2 border-gray-700">
        <div className="flex items-center gap-2 text-white font-bold text-base bg-gradient-to-r from-purple-600/20 to-transparent -mx-6 px-6 py-3 border-l-4 border-purple-500">
          <Square className="w-5 h-5" />
          CONTORNO E BORDA
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Cor do Contorno</label>
          <div className="relative">
            <input
              type="color"
              value={style.colors?.outline || '#000000'}
              onChange={(e) => onChange({ colors: { ...style.colors, outline: e.target.value } })}
              className="absolute left-0 top-0 w-10 h-full cursor-pointer rounded-l border-r-0"
              style={{ padding: 0, margin: 0 }}
            />
            <input
              type="text"
              value={style.colors?.outline || '#000000'}
              onChange={(e) => onChange({ colors: { ...style.colors, outline: e.target.value } })}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-2 py-2 text-xs focus:outline-none focus:border-gray-600 rounded"
              placeholder="#000000"
              maxLength={9}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Estilo da Borda</label>
          <select
            value={style.border?.style || 1}
            onChange={(e) => onChange({ border: { ...style.border, style: parseInt(e.target.value) } })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-600 rounded"
          >
            {BORDER_STYLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">
            Largura da Borda: {style.border?.width || 3}px
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={style.border?.width || 3}
            onChange={(e) => onChange({ border: { ...style.border, width: parseInt(e.target.value) } })}
            className="w-full accent-purple-500"
          />
        </div>
      </div>

      {/* POSICIONAMENTO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-base bg-gradient-to-r from-green-600/20 to-transparent -mx-6 px-6 py-3 border-l-4 border-green-500">
          <Move className="w-5 h-5" />
          POSICIONAMENTO
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Alinhamento na Tela</label>
          <select
            value={style.position?.alignment || 'bottom_center'}
            onChange={(e) => onChange({ position: { ...style.position, alignment: e.target.value } })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-600 rounded"
          >
            {POSITION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">
            Margem Vertical: {style.position?.marginVertical || 20}px
          </label>
          <input
            type="range"
            min="0"
            max="500"
            value={style.position?.marginVertical || 20}
            onChange={(e) => onChange({ position: { ...style.position, marginVertical: parseInt(e.target.value) } })}
            className="w-full accent-green-500"
          />
        </div>
      </div>
    </div>
  );
};

// Highlight Controls Component
const HighlightControls: React.FC<{
  style: HighlightStyle;
  onChange: (updates: Partial<HighlightStyle>) => void;
}> = ({ style, onChange }) => {
  return (
    <div className="space-y-5">
      {/* TEXTO GERAL */}
      <div className="space-y-4 pb-5 border-b-2 border-gray-700">
        <div className="flex items-center gap-2 text-white font-bold text-base bg-gradient-to-r from-blue-600/20 to-transparent -mx-6 px-6 py-3 border-l-4 border-blue-500">
          <Type className="w-5 h-5" />
          TEXTO GERAL
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Fonte</label>
          <select
            value={style.fonte || 'Arial Black'}
            onChange={(e) => onChange({ fonte: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-600 rounded"
          >
            {POPULAR_FONTS.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">
            Tamanho da Fonte: {style.tamanho_fonte || 72}px
          </label>
          <input
            type="range"
            min="20"
            max="200"
            value={style.tamanho_fonte || 72}
            onChange={(e) => onChange({ tamanho_fonte: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Cor do Texto</label>
          <div className="relative">
            <input
              type="color"
              value={style.texto_cor || '#FFFFFF'}
              onChange={(e) => onChange({ texto_cor: e.target.value })}
              className="absolute left-0 top-0 w-10 h-full cursor-pointer rounded-l border-r-0"
              style={{ padding: 0, margin: 0 }}
            />
            <input
              type="text"
              value={style.texto_cor || '#FFFFFF'}
              onChange={(e) => onChange({ texto_cor: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-2 py-2 text-xs focus:outline-none focus:border-gray-600 rounded"
              placeholder="#FFFFFF"
              maxLength={9}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Cor do texto (mantida mesmo quando destacado)</p>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-gray-400 text-xs mb-2 font-medium">Cor do Fundo</label>
            <div className="relative">
              <input
                type="color"
                value={style.fundo_cor || '#000000'}
                onChange={(e) => onChange({ fundo_cor: e.target.value })}
                className="absolute left-0 top-0 w-10 h-full cursor-pointer rounded-l border-r-0"
                style={{ padding: 0, margin: 0 }}
              />
              <input
                type="text"
                value={style.fundo_cor || '#000000'}
                onChange={(e) => onChange({ fundo_cor: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-2 py-2 text-xs focus:outline-none focus:border-gray-600 rounded"
                placeholder="#000000"
                maxLength={9}
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <label className="block text-gray-400 text-xs mb-2 font-medium">
              Opacidade: {style.fundo_opacidade || 50}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={style.fundo_opacidade || 50}
              onChange={(e) => onChange({ fundo_opacidade: parseInt(e.target.value) })}
              className="w-full accent-blue-500 h-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rounded"
            checked={style.fundo_arredondado ?? true}
            onChange={(e) => onChange({ fundo_arredondado: e.target.checked })}
            className="w-4 h-4 accent-blue-500"
          />
          <label htmlFor="rounded" className="text-gray-400 text-sm">Cantos Arredondados no Fundo</label>
        </div>
      </div>

      {/* HIGHLIGHT (DESTAQUE) */}
      <div className="space-y-4 pb-5 border-b-2 border-gray-700">
        <div className="flex items-center gap-2 text-white font-bold text-base bg-gradient-to-r from-red-600/20 to-transparent -mx-6 px-6 py-3 border-l-4 border-red-500">
          <Palette className="w-5 h-5" />
          HIGHLIGHT (DESTAQUE)
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Cor do Texto Destacado</label>
          <div className="relative">
            <input
              type="color"
              value={style.highlight_texto_cor || style.texto_cor || '#FFFFFF'}
              onChange={(e) => onChange({ highlight_texto_cor: e.target.value })}
              className="absolute left-0 top-0 w-10 h-full cursor-pointer rounded-l border-r-0"
              style={{ padding: 0, margin: 0 }}
            />
            <input
              type="text"
              value={style.highlight_texto_cor || style.texto_cor || '#FFFFFF'}
              onChange={(e) => onChange({ highlight_texto_cor: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-2 py-2 text-xs focus:outline-none focus:border-gray-600 rounded"
              placeholder="#FFFF00"
              maxLength={9}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Cor da fonte quando a palavra está em destaque (deixe vazio para usar a cor do texto normal)</p>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Cor da Borda/Glow</label>
          <div className="relative">
            <input
              type="color"
              value={style.highlight_cor || '#D60000'}
              onChange={(e) => onChange({ highlight_cor: e.target.value })}
              className="absolute left-0 top-0 w-10 h-full cursor-pointer rounded-l border-r-0"
              style={{ padding: 0, margin: 0 }}
            />
            <input
              type="text"
              value={style.highlight_cor || '#D60000'}
              onChange={(e) => onChange({ highlight_cor: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-2 py-2 text-xs focus:outline-none focus:border-gray-600 rounded"
              placeholder="#D60000"
              maxLength={9}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Cor do brilho/sombra ao redor da palavra destacada</p>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">
            Tamanho da Borda/Glow: {style.highlight_borda || 12}px
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={style.highlight_borda || 12}
            onChange={(e) => onChange({ highlight_borda: parseInt(e.target.value) })}
            className="w-full accent-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">Intensidade do brilho ao redor da palavra</p>
        </div>
      </div>

      {/* ESPAÇAMENTO E LAYOUT */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-base bg-gradient-to-r from-green-600/20 to-transparent -mx-6 px-6 py-3 border-l-4 border-green-500">
          <Layers className="w-5 h-5" />
          ESPAÇAMENTO E LAYOUT
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2 font-medium">Alinhamento na Tela</label>
          <select
            value={style.position || 'bottom_center'}
            onChange={(e) => onChange({ position: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-600 rounded"
          >
            {POSITION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs mb-2 font-medium">
              Padding Horizontal: {style.padding_horizontal || 40}px
            </label>
            <input
              type="range"
              min="0"
              max="500"
              value={style.padding_horizontal || 40}
              onChange={(e) => onChange({ padding_horizontal: parseInt(e.target.value) })}
              className="w-full accent-green-500"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-2 font-medium">
              Padding Vertical: {style.padding_vertical || 80}px
            </label>
            <input
              type="range"
              min="0"
              max="500"
              value={style.padding_vertical || 80}
              onChange={(e) => onChange({ padding_vertical: parseInt(e.target.value) })}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs mb-2 font-medium">
              Palavras por Linha: {style.words_per_line || 4}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={style.words_per_line || 4}
              onChange={(e) => onChange({ words_per_line: parseInt(e.target.value) })}
              className="w-full accent-green-500"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-2 font-medium">
              Máximo de Linhas: {style.max_lines || 2}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={style.max_lines || 2}
              onChange={(e) => onChange({ max_lines: parseInt(e.target.value) })}
              className="w-full accent-green-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
