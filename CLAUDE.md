# AutoDark - AI YouTube Content Automation

**Stack**: React 18 + TypeScript + Vite + Supabase + N8N
**Pattern**: Feature-Based Modular Architecture
**Pipeline**: User Input → N8N Webhooks → AI APIs → Database → UI

---

## 🚨 CRITICAL RULES

| Rule | Why |
|------|-----|
| **NO** `.env` commits | Security (API keys) |
| **NO** `any` TypeScript | Type safety |
| **NO** editing migrations | Data integrity |
| **NO** components >500 LOC | Maintainability |
| **YES** snake_case DB | PostgreSQL standard |
| **YES** camelCase TS | JS/TS standard |
| **YES** path aliases (@shared, @features) | Avoid `../../..` |
| **YES** encodeURIComponent for URLs | Handle special chars |
| **YES** useCallback/useMemo | Optimize re-renders |

---
###DONT CREATE MD/DOCUMENTATION FILES WITHOUT REQUEST

---

## 🎯 ARCHITECTURE

**Pipeline Flow**:
```
User → Frontend → ApiService → N8N → External APIs → Database → Frontend
```

**What It Does**: Clone YT channels, generate titles/scripts/audio/images, render videos with captions, publish to YouTube

**What It Doesn't**: Real-time rendering, direct YT upload, payment processing, multi-tenancy

**Tech Stack**:
- **Frontend**: React 18.3.1, TS 5.5.3, Vite 5.4.2, Tailwind 3.4.1, React Router 7.8.2
- **Backend**: Supabase (PostgreSQL 15 + Auth + Edge Functions), N8N (workflows), Docker + nginx
- **APIs**: YouTube Data v3, ElevenLabs, Fish-Audio, Minimax, Runware, OpenRouter, Google Drive

---

## 📁 FILE STRUCTURE

```
src/
├── app/                    # App.tsx (routing), main.tsx, index.css
├── shared/                 # Reusable across features
│   ├── components/         # ui/ (LoadingSpinner, ApiCreditsCard)
│   │                       # modals/ (PromptModal, ImageLightbox, VideoPlayer)
│   ├── contexts/           # AuthContext
│   ├── hooks/              # useApi, useDatabase, useYouTube (generic + specific)
│   ├── lib/                # supabase.ts (client + types)
│   └── services/           # api.ts, database.ts, youtube.ts, apiCredits.ts
│
├── features/               # Domain-driven modules
│   ├── auth/               # LoginPage
│   ├── dashboard/          # DashboardPage, ActionCard, DashboardHeader
│   ├── channel-management/ # ManageChannelPage, CloneChannelPage, VideoCard
│   │                       # CaptionStyleEditor (⚠️ 800 LOC, complex)
│   ├── content-generation/ # GenerateContentPage (⚠️ 2915 LOC - NEEDS REFACTOR)
│   │                       # VoiceSelector, DriveAudioSelector, DriveVideoSelector
│   │                       # services/audio/ (Strategy pattern: base, elevenLabs, fishAudio, minimax)
│   ├── settings/           # SettingsPage
│   └── scripts/            # ViewScriptsPage
│
database/
├── supabase/
│   ├── migrations/         # Timestamped SQL (NEVER edit existing)
│   └── functions/          # Edge functions (Deno): fetch-*-voice, list-*-voices, fetch-runware-model
└── scripts/                # supabase_rls_fix.sql
```

---

## 🎨 CONVENTIONS

### Naming
- **Files**: `*Page.tsx`, `*Modal.tsx`, `*Card.tsx`, `*Selector.tsx`, `*Service.ts`, `use*.ts`
- **Components**: PascalCase (`ComponentName.tsx`)
- **Services**: camelCase (`apiService.ts`)
- **Classes**: PascalCase (`ApiService`)
- **Functions**: camelCase (`handleClick`)
- **Constants**: UPPER_SNAKE_CASE (`API_KEY`)
- **Database**: snake_case (`nome_canal`, `created_at`)

### Component Structure
```typescript
// 1. IMPORTS (react → libraries → @shared → @features → local)
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@shared/hooks';
import { ComponentCard } from '@features/feature-name/components';

// 2. CONSTANTS
const DEBOUNCE_MS = 300;
const MAX_RETRIES = 3;

// 3. TYPES
interface Props {
  channelId: number;
  onSuccess?: () => void;
}

// 4. COMPONENT
export default function ComponentName({ channelId, onSuccess }: Props) {
  // 4.1 Hooks (never conditional, always same order)
  const navigate = useNavigate();
  const [state, setState] = useState<LocalState>({ isLoading: false });

  // 4.2 Effects
  useEffect(() => { /* ... */ }, [channelId]);

  // 4.3 Handlers (prefix: handle*, use useCallback for stable refs)
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    // Implementation
  }, [/* dependencies */]);

  // 4.4 Early returns
  if (loading) return <LoadingSpinner />;

  // 4.5 Render
  return <div>{/* JSX */}</div>;
}

// 5. Helper functions (after component, not exported unless needed elsewhere)
function formatDate(date: Date): string {
  // Implementation
}
```

### Service Pattern (Strategy)
```typescript
// base.ts - Abstract class
export abstract class BasePlatformService {
  abstract fetchVoices(): Promise<Voice[]>;
  abstract synthesize(text: string, voiceId: string): Promise<AudioResult>;

  protected handleError(error: unknown): never {
    console.error('Service error:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

// elevenLabs.ts - Implementation
export class ElevenLabsService extends BasePlatformService {
  async fetchVoices(): Promise<Voice[]> {
    try {
      // Platform-specific implementation
    } catch (error) {
      this.handleError(error);
    }
  }
}

// audioService.ts - Orchestrator
export class AudioService {
  private platforms: Map<string, BasePlatformService>;

  async playVoicePreview(voice: Voice): Promise<void> {
    const platform = this.platforms.get(voice.plataforma);
    if (!platform) throw new Error(`Platform ${voice.plataforma} not found`);
    return platform.synthesize(voice.preview_text, voice.voice_id);
  }
}
```

---

## 🧪 COMMANDS

```bash
# Dev
npm install          # Install deps
npm run dev          # Dev server (localhost:5173, HMR <200ms)
npm run lint         # ESLint (must pass before commit)

# Production
npm run build        # Build → dist/ (~2MB gzipped)
npm run preview      # Preview build (localhost:4173)

# Docker (multi-stage: node → nginx)
docker build --build-arg VITE_SUPABASE_URL=$URL ... -t autodark:latest .
docker run -d -p 80:80 autodark:latest

# Git (main auto-deploys to Easypanel)
git checkout -b feature/name
npm run lint && git add . && git commit -m "Add: feature"
git push origin feature/name
# Merge to main → auto-deploy
```

---

## 📝 GIT COMMITS

**Format**: `<Type>: <subject>` (imperative, max 72 chars)

**Types**: `Add`, `Fix`, `Update`, `Refactor`, `Remove`, `Docs`

**Examples**:
- ✅ `Add: karaoke caption mode with highlight effects`
- ✅ `Fix: audio playback fails on Fish-Audio voices`
- ✅ `Update: improve voice selector performance with useMemo`
- ❌ `Added new feature` (not imperative, vague)
- ❌ `fix bug` (no capitalization)

---

## 🔐 ENV VARIABLES

**Required** (all prefixed with `VITE_` for Vite):
```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Public anon key (safe)

# N8N
VITE_API_BASE_URL=https://n8n.yourdomain.com
VITE_WEBHOOK_CLONE_CHANNEL=/webhook/treinarCanal
VITE_WEBHOOK_GERAR_CONTEUDO=/webhook/gerarConteudo
VITE_WEBHOOK_GENERATE_TITLE=/webhook/gerarTitulo
VITE_WEBHOOK_GENERATE_SCRIPT=/webhook/gerarRoteiro
VITE_WEBHOOK_PROCESS_VIDEO=/webhook/processarVideo
VITE_WEBHOOK_PUBLISH_VIDEO=/webhook/publicarVideo
VITE_WEBHOOK_UPDATE=/webhook/update
VITE_WEBHOOK_GERAR_VIDEO=/webhook/gerarVideo
VITE_WEBHOOK_DELETAR=/webhook/deletar

# YouTube
VITE_YOUTUBE_API_KEY=AIzaSyD...  # Quota: 10k units/day
```

**Access**:
```typescript
// ✅ Correct
const url = import.meta.env.VITE_SUPABASE_URL;

// ❌ Wrong (Node.js only)
const url = process.env.VITE_SUPABASE_URL;
```

---

## 🛠️ PATTERNS & BEST PRACTICES

### 1. URL Encoding & Normalization

**ALWAYS encode URLs and query parameters to handle special characters:**

```typescript
// ✅ Correct - encode query parameters
const query = `'${folderId}' in parents and mimeType contains 'audio/'`;
const url = `https://googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}`;

// ✅ Correct - YouTube search
const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&type=channel`;

// ❌ Wrong - no encoding, breaks with spaces/special chars
const url = `https://api.com/search?q=${query}`;  // Fails with "React Tutorial"
```

**Pattern**: All external API calls with user input MUST use `encodeURIComponent()`

**Files**: `youtube.ts:268`, `DriveAudioSelector.tsx:148`, `DriveVideoSelector.tsx`

---

### 2. Custom Hooks Pattern

**Generic + Specific Pattern** - All hooks follow this structure:

```typescript
// Generic base hook
function useYouTube<T = any>() {
  const [state, setState] = useState<UseYouTubeState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// Specific hook using the generic
export function useChannelSearch() {
  const { execute, ...state } = useYouTube<YouTubeChannel>();

  const searchChannel = useCallback((channelUrl: string) => {
    return execute(() => youtubeService.getChannelInfo(channelUrl));
  }, [execute]);

  return { ...state, searchChannel };
}
```

**All hooks MUST return**:
- `data` (typed or null)
- `loading` (boolean)
- `error` (string | null)
- `execute`/`refetch` (action method)
- `reset` (clear state)

**Files**: `useApi.ts`, `useDatabase.ts`, `useYouTube.ts`

---

### 3. Error Handling

**Standard try-catch + console.error pattern:**

```typescript
// ✅ Frontend - Services
try {
  const result = await apiService.generateContent(payload);
  if (!result.success) {  // N8N may return 200 with error object
    setError(result.error || 'Erro desconhecido');
    return;
  }
  setData(result.data);
} catch (error) {
  console.error('API failed:', { endpoint, payload, error });
  setError('Erro de conexão. Verifique sua internet.');
}

// ✅ Database operations - always throw
async getAll(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('canais')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;  // Let hook handle it
  return data || [];       // Always return array fallback
}

// ❌ Wrong - swallow error
async getAll() {
  const { data } = await supabase.from('canais').select('*');
  return data;  // Could be null!
}
```

**Edge Functions - Structured error responses:**
```typescript
try {
  // Logic
} catch (error) {
  console.error('🚨 Erro na Edge Function:', {
    error: error.message,
    stack: error.stack
  });

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
```

---

### 4. Database Queries (Supabase)

```typescript
// ✅ With joins + error handling + fallback
async getAll(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('canais')
    .select('*, vozes:voz_prefereida(id, nome_voz, plataforma)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];  // ALWAYS return fallback
}

// ✅ Nested joins
async getVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      roteiros (
        id,
        titulo,
        roteiro,
        canais (
          id,
          nome_canal
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ❌ No error handling
async getAll() {
  const { data } = await supabase.from('canais').select('*');
  return data;  // Could be null, no error handling!
}
```

**Pattern**:
1. Destructure `{ data, error }`
2. Check `if (error) throw error`
3. Return `data || []` (or `null` for single)

---

### 5. Logging Conventions

**Use structured logging with context:**

```typescript
// ✅ Frontend - console.error with context
console.error('API failed:', {
  endpoint: '/webhook/gerarConteudo',
  payload: { id_canal, nova_ideia },
  error
});

// ✅ Edge Functions - emoji prefixes for visual scanning
console.log('🐟 Edge Function: Iniciando list-fish-audio-voices');
console.log('📥 Parâmetros recebidos:', { tem_api_key: !!api_key, page, page_size });
console.log('📤 Fazendo requisição para Fish Audio:', url);
console.log('✅ Processamento concluído:', { voices_processed: voices.length });
console.error('❌ Erro na Fish Audio API:', errorText);

// ❌ Wrong - no context
console.log('error');
console.log(error);
```

**Emoji Convention** (Edge Functions only):
- 🐟/🎤/🖼️ - Service identifier
- 📥 - Received input
- 📤 - External request
- ✅ - Success
- ❌ - Error
- 🚨 - Critical error
- 🔑 - API key related

---

### 6. Context Pattern

**AuthContext is the template for all contexts:**

```typescript
// 1. Define interface
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// 2. Create context with undefined (force provider)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup effects and methods
  useEffect(() => {
    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Custom hook with error handling
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Pattern**: Always throw error if context is undefined (prevents usage outside provider)

---

### 7. Performance Optimizations

```typescript
// ✅ useMemo for expensive computations
const filteredVoices = useMemo(() => {
  return voices.filter(v =>
    v.nome_voz.toLowerCase().includes(search.toLowerCase()) &&
    (!selectedLanguage || v.idioma === selectedLanguage)
  );
}, [voices, search, selectedLanguage]);

// ✅ useCallback for stable function references
const handleVoiceSelect = useCallback((voiceId: number) => {
  onVoiceChange?.(voiceId);
  setSelectedVoice(voiceId);
}, [onVoiceChange]);

// ✅ React.memo for components that don't change often
export const VideoCard = React.memo<VideoCardProps>(({ video, isSelected, onSelect }) => {
  return (
    <div onClick={onSelect}>
      {/* ... */}
    </div>
  );
}, (prev, next) => {
  // Custom comparison - only re-render if these change
  return prev.isSelected === next.isSelected && prev.video.id === next.video.id;
});

// ✅ Pagination for large datasets (Edge Functions)
const params = new URLSearchParams({
  page: page.toString(),
  page_size: page_size.toString()  // Default: 20
});
```

**When to optimize**:
- Lists with >50 items → useMemo for filtering/sorting
- Callbacks passed to child components → useCallback
- Heavy components in lists → React.memo
- External API calls → Pagination (20-50 items/page)

---

### 8. Edge Functions Pattern (Deno)

**All Edge Functions follow this template:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎤 Edge Function: Iniciando list-voices')

    // 2. Parse input
    const { api_key, page = 1, page_size = 20, search } = await req.json()
    console.log('📥 Parâmetros recebidos:', { tem_api_key: !!api_key, page, page_size })

    // 3. Init Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Get API key from DB if not provided
    let apiKey = api_key
    if (!apiKey) {
      const { data, error } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'PlatformName')
        .single()

      if (error || !data?.api_key) {
        throw new Error('API key not found')
      }
      apiKey = data.api_key
    }

    // 5. Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString()
    })
    if (search) params.append('search', search)

    // 6. Fetch from external API
    const url = `https://api.external.com/voices?${params.toString()}`
    console.log('📤 Requisição:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erro na API:', errorText)
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Dados recebidos:', { items: data.items?.length })

    // 7. Transform response
    const voices = data.items.map(item => ({
      voice_id: item.id,
      nome_voz: item.name,
      // ... other fields
    }))

    // 8. Return success
    return new Response(
      JSON.stringify({ success: true, voices, total: data.total }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🚨 Erro:', { error: error.message, stack: error.stack })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

**Checklist**:
- [ ] CORS preflight handler
- [ ] Structured logging with emojis
- [ ] API key from DB or param
- [ ] URLSearchParams for query building
- [ ] Error response with success: false
- [ ] CORS headers in all responses

---

### N8N Webhook Payloads

```typescript
// Generate Content
interface GenerateContentPayload {
  id_canal: number;
  nova_ideia: string;
  idioma: 'pt-br' | 'en' | 'es';
  tipo_geracao: 'gerar_titulos' | 'gerar_roteiro_audio' | 'gerar_audio' | 'gerar_imagens';
}

// Clone Channel
interface CloneChannelPayload {
  channelUrl: string;
  videos: Array<{ title: string; link: string; }>;
  channelName: string;
  selectedVideoCount: number;
  action: 'coleta_titulo' | 'transcrever';
}

// Generate Images
interface GenerateImagesPayload {
  roteiros: Array<{ id_roteiro: number; n_imgs: number; }>;
  img_model: string;  // e.g., 'runway:gen3@1'
  estilo: string;
  detalhe_estilo: string;
  altura: number;
  largura: number;
  tipo_geracao: 'gerar_imagens';
}
```

### Caption Styles (JSONB in canais.caption_style)
```typescript
interface CaptionStyle {
  type: 'highlight' | 'segments';  // Karaoke vs Traditional
  uppercase: boolean;
  style: KaraokeStyle | TraditionalStyle;
}

// Karaoke: word-by-word highlight
interface KaraokeStyle {
  fonte: string; tamanho_fonte: number;
  texto_cor: string; fundo_cor: string; fundo_opacidade: number;
  highlight_cor: string; highlight_borda: number;
  padding_horizontal: number; padding_vertical: number;
  position: 'top_center' | 'middle_center' | 'bottom_center';
  words_per_line: number; max_lines: number;
}

// Traditional: segment-based
interface TraditionalStyle {
  font: { name: string; size: number; bold: boolean; };
  colors: { primary: string; outline: string; };
  border: { style: 1 | 3; width: number; };
  position: { alignment: string; marginVertical: number; };
}
```

### Audio Platforms
- **ElevenLabs**: Premium, $0.30/1k chars, 5k max, permanent previews, 29 languages
- **Fish-Audio**: Mid-tier, $0.10/1k chars, 3k max, temp previews, 15 languages
- **Minimax**: Budget, $0.02/1k chars, 2k max, system voices only, 8 languages

### Tailwind Patterns
```typescript
// Cards
'bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors'

// Buttons
'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50'

// Inputs
'bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500'

// Gradients (modern cards)
'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-purple-500/20'
```

---

## 📊 DATABASE SCHEMA

**Core Tables**:

**canais** (Channels)
- `id`, `nome_canal`, `prompt_titulo`, `prompt_roteiro`, `voz_prefereida` → vozes(id)
- `url_canal`, `profile_image`, `drive_url`, `trilha_url`
- `caption_style` (JSONB), `detailed_style` (JSONB), `media_chars`, `created_at`
- **RLS enabled**

**roteiros** (Scripts)
- `id`, `id_canal` → canais(id) CASCADE, `titulo`, `roteiro` (TEXT)
- `audio_path`, `images_path` (JSONB), `status` (gerando/pronto/processando/erro)
- `created_at`, `updated_at`
- **Status flow**: gerando → pronto → processando → erro

**videos** (Videos)
- `id`, `id_roteiro` → roteiros(id) CASCADE, `id_canal` → canais(id) CASCADE
- `status` (gerando/pronto/publicado/erro), `video_path`, `thumbnail_path`, `created_at`

**vozes** (Voices)
- `id`, `nome_voz`, `voice_id`, `id_plataforma` → apis(id)
- `idioma` (pt-br/en/es), `genero`, `preview_url`, `created_at`
- UNIQUE(voice_id, id_plataforma)

**apis** (API Credentials)
- `id`, `plataforma` UNIQUE, `api_key` (NEVER exposed to frontend), `group_ID`, `created_at`
- **RLS: Service role only**

**modelos_imagem** (Image Models)
- `id`, `air` UNIQUE (e.g., 'runway:gen3@1'), `name`, `created_at`

**Relationships**:
```
canais 1:N roteiros 1:N videos
canais N:1 vozes N:1 apis
```

---

## 🔍 KEY FILES

**Critical** (frequent modification):
- `src/features/content-generation/pages/GenerateContentPage.tsx` (2915 LOC) - ⚠️ **NEEDS REFACTOR**
- `src/shared/services/api.ts` - ApiService, all N8N webhooks
- `src/shared/services/database.ts` - ChannelService, VideoService, VoiceService
- `src/shared/lib/supabase.ts` - Supabase client + types
- `src/features/channel-management/components/CaptionStyleEditor.tsx` (800 LOC)

**Services**:
- `src/shared/services/api.ts` - Webhook orchestration
- `src/shared/services/youtube.ts` - YouTube Data API v3
- `src/shared/services/apiCredits.ts` - API credits tracking
- `src/features/content-generation/services/audio/` - Strategy pattern (base, elevenLabs, fishAudio, minimax)
- `src/shared/services/database.ts` - CRUD operations

**Edge Functions**: `database/supabase/functions/` - fetch/list voices, models (Deno)

---

## 🐛 TECHNICAL DEBT

**P1** (high priority):
- GenerateContentPage.tsx (2915 LOC) - Split into TitleGenSection, ScriptGenSection, AudioGenSection, ImageGenSection
- No Error Boundaries - Add to App.tsx + feature routes
- Console.log statements (337 occurrences) - Replace with console.error or remove in production

**P2** (medium):
- Zero test coverage - Add Jest + React Testing Library
- No loading skeletons - Add skeleton screens
- Hardcoded retry logic - Create useRetry hook

---

## 💡 QUICK TASKS

**Add Feature**:
```bash
mkdir -p src/features/my-feature/{pages,components,hooks}
# Create index.ts, MyFeaturePage.tsx
# Add route in src/app/App.tsx
npm run dev && npm run lint
```

**Modify Schema**:
```bash
# ⚠️ NEVER edit existing migrations!
# 1. Create: supabase migration new add_column
# 2. Write SQL in database/supabase/migrations/[timestamp]_*.sql
# 3. Update types in src/shared/lib/supabase.ts
# 4. Deploy: git commit + push (auto-migrates on Supabase)
```

**Debug Webhooks**:
```typescript
console.log('Webhook:', import.meta.env.VITE_WEBHOOK_GERAR_CONTEUDO);
console.log('Full URL:', apiService.getWebhook('GERAR_CONTEUDO'));
// Check N8N dashboard → Executions tab for errors
```

**Add Edge Function**:
```bash
# 1. Create: database/supabase/functions/my-function/index.ts
# 2. Follow Edge Function Pattern (see section above)
# 3. Deploy: supabase functions deploy my-function
# 4. Test: supabase functions serve
```

---

## 🚀 PERFORMANCE TIPS

1. **Path Aliases**: Always use `@shared`, `@features`, `@app` (avoid `../../../`)
2. **URL Encoding**: Always use `encodeURIComponent()` for query params
3. **Memoization**: Use `useMemo` for filtering/sorting lists >50 items
4. **Callbacks**: Use `useCallback` for functions passed to children
5. **Pagination**: Limit API calls to 20-50 items per page
6. **Lazy Loading**: Use React.lazy() for heavy feature pages
7. **Database**: Minimize joins, use indexes on frequently queried columns

---

**Path Aliases** (vite.config.ts):
```
@shared → /src/shared
@features → /src/features
@app → /src/app
```

**TS Config**: strict mode, noUnusedLocals, noUnusedParameters
**ESLint**: react-hooks/rules-of-hooks (error), exhaustive-deps (warn)

---

> **Single source of truth** for AutoDark project context. Keep updated, concise, accurate.
> Last updated: 2025-01-25 - Added patterns for URL encoding, hooks, Edge Functions, performance, logging
