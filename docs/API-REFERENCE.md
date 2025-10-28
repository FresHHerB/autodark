# AutoDark - API Reference

**Last Updated**: 2025-01-28
**Version**: 2.1
**Location**: `docs/API-REFERENCE.md`

This document provides a comprehensive mapping of all endpoints, APIs, and integrations in the AutoDark project.

**Other Documentation:**
- [CLAUDE.md](../CLAUDE.md) - Development guide, patterns, conventions
- [README.md](../README.md) - Quick start and overview
- [config/deployment/README.md](../config/deployment/README.md) - Deployment instructions

---

## Table of Contents

1. [N8N Webhook Endpoints](#1-n8n-webhook-endpoints)
2. [Supabase Edge Functions](#2-supabase-edge-functions)
3. [External API Integrations](#3-external-api-integrations)
4. [Database Operations](#4-database-operations)
5. [Data Flow Architecture](#5-data-flow-architecture)

---

## 1. N8N Webhook Endpoints

**Base URL**: Configured via `VITE_API_BASE_URL` environment variable
**Service**: `src/shared/services/api.ts`

All N8N webhooks orchestrate backend workflows for content generation and management.

### 1.1 Core Endpoints

| Method | Endpoint | Purpose | Input | Status |
|--------|----------|---------|-------|--------|
| POST | `/webhook/treinarCanal` | Clone YouTube channel | `CloneChannelPayload` | Active |
| POST | `/webhook/gerarConteudo` | Generate content (titles/scripts/audio/images) | `GenerateContentPayload` | Active |
| POST | `/webhook/gerarTitulo` | Generate video titles | `GenerateTitlePayload` | Internal |
| POST | `/webhook/gerarRoteiro` | Generate video scripts | `GenerateScriptPayload` | Internal |
| POST | `/webhook/processarVideo` | Process/render video | `{ videoId: number }` | Unused |
| POST | `/webhook/publicarVideo` | Publish to YouTube | `{ videoId: number, scheduleDate?: string }` | Unused |
| POST | `/webhook/update` | Update channel/video metadata | `UpdatePayload` | Active |
| POST | `/webhook/gerarVideo` | Render final video | `GenerateVideoPayload` | Active |
| POST | `/webhook/deletar` | Delete content | `DeletePayload` | Active |

### 1.2 Clone Channel Endpoint

**Path**: `/webhook/treinarCanal`

**Payload**:
```typescript
interface CloneChannelPayload {
  channelUrl: string;           // YouTube channel URL
  videos: Array<{               // Selected videos
    title: string;
    link: string;
  }>;
  channelName: string;          // Channel display name
  selectedVideoCount: number;   // Number of videos selected
  action: 'coleta_titulo' | 'transcrever';  // Action type
}
```

**Used In**: `CloneChannelPage.tsx`

**Actions**:
- `coleta_titulo`: Extract video titles only
- `transcrever`: Generate full transcriptions

---

### 1.3 Generate Content Endpoint

**Path**: `/webhook/gerarConteudo`

**Payload**:
```typescript
interface GenerateContentPayload {
  id_canal: number;             // Channel ID
  nova_ideia: string;           // Content idea
  idioma: 'pt-br' | 'en' | 'es';  // Language
  tipo_geracao: 'gerar_titulos' | 'gerar_roteiro_audio' | 'gerar_audio' | 'gerar_imagens';
}
```

**Generation Types**:
1. **gerar_titulos**: Generate multiple title options from idea
2. **gerar_roteiro_audio**: Create script and synthesize audio
3. **gerar_audio**: Convert existing scripts to audio
4. **gerar_imagens**: Generate images for scripts

**Used In**: `GenerateContentV2Page.tsx`, `ViewScriptsPage.tsx`

---

### 1.4 Update Endpoint

**Path**: `/webhook/update`

**Payload**:
```typescript
interface UpdatePayload {
  id?: number;                  // Channel or video ID
  update_type: UpdateType;
  // Additional fields based on update_type
}

type UpdateType =
  | 'basic'           // Update channel name and prompts
  | 'voice'           // Update preferred voice
  | 'captionStyle'    // Update caption style JSONB
  | 'imageChannel'    // Update channel thumbnail
  | 'thumbVideo'      // Update video thumbnail
  | 'driveUrl';       // Update Google Drive folder URL
```

**Examples**:

```typescript
// Update caption style
{
  id: 123,
  update_type: 'captionStyle',
  captionStyle: {
    type: 'highlight',
    uppercase: true,
    style: { /* karaoke config */ }
  }
}

// Update channel voice
{
  id: 123,
  update_type: 'voice',
  voz_prefereida: 456
}
```

**Used In**: `ManageChannelPage.tsx`, `GenerateContentV2Page.tsx`

---

### 1.5 Generate Images Endpoint

**Path**: `/webhook/gerarConteudo` (with `tipo_geracao: 'gerar_imagens'`)

**Payload**:
```typescript
interface GenerateImagesPayload {
  tipo_geracao: 'gerar_imagens';
  roteiros: Array<{
    id_roteiro: number;         // Script ID
    n_imgs: number;             // Number of images to generate
  }>;
  img_model: string;            // Model AIR (e.g., 'runway:gen3@1')
  estilo: string;               // Style prompt
  detalhe_estilo: string;       // Detailed style description
  altura: number;               // Height (multiple of 64, range: 128-2048)
  largura: number;              // Width (multiple of 64, range: 128-2048)
}
```

**Dimension Presets**:
- 16:9 → 1344×768
- 9:16 → 768×1344
- 1:1 → 1024×1024

**Used In**: `GenerateContentV2Page.tsx`

---

### 1.6 Generate Video Endpoint

**Path**: `/webhook/gerarVideo`

**Payload**:
```typescript
interface GenerateVideoPayload {
  videos: Array<{
    id: number;                 // Script ID
    zoom_types: string[];       // Zoom effects (e.g., ['ken_burns'])
  }>;
}
```

**Used In**: `GenerateVideoPage.tsx`

---

### 1.7 Delete Endpoint

**Path**: `/webhook/deletar`

**Payload**:
```typescript
interface DeletePayload {
  id: number;                   // ID to delete
  deleteType: 'deleteScript' | 'deleteVideo' | 'deleteChannel';
}
```

**Used In**: `ViewScriptsPage.tsx`, `ManageChannelPage.tsx`

---

## 2. Supabase Edge Functions

**Base URL**: `{SUPABASE_URL}/functions/v1/`
**Runtime**: Deno
**Location**: `database/supabase/functions/`

All Edge Functions proxy external API calls to protect API keys from frontend exposure.

### 2.1 Voice Listing Functions

| Function | Path | Purpose | API Called | Status |
|----------|------|---------|------------|--------|
| list-elevenlabs-voices | `/functions/v1/list-elevenlabs-voices` | List all ElevenLabs voices | ElevenLabs API | Active |
| list-fish-audio-voices | `/functions/v1/list-fish-audio-voices` | List Fish-Audio voices (paginated) | Fish-Audio API | Active |
| list-minimax-voices | `/functions/v1/list-minimax-voices` | List Minimax voices | Minimax API | Active |

**Common Request**:
```typescript
{
  api_key?: string;      // Optional (fetches from DB if not provided)
  page?: number;         // Page number (Fish-Audio only)
  page_size?: number;    // Items per page (Fish-Audio only)
  search?: string;       // Search query
  language?: string;     // Language filter
}
```

**Common Response**:
```typescript
{
  success: boolean;
  voices: Voice[];
  total?: number;
  pagination?: {
    page: number;
    page_size: number;
    total_pages: number;
  };
}
```

### 2.2 Voice Detail Functions

| Function | Path | Purpose | API Called | Status |
|----------|------|---------|------------|--------|
| fetch-elevenlabs-voice | `/functions/v1/fetch-elevenlabs-voice` | Get single ElevenLabs voice | ElevenLabs API | Active |
| fetch-fish-audio-voice | `/functions/v1/fetch-fish-audio-voice` | Get single Fish-Audio voice | Fish-Audio API | Active |
| fetch-minimax-voice | `/functions/v1/fetch-minimax-voice` | Get single Minimax voice | Minimax API | Active |

**Request**:
```typescript
{
  voice_id: string;      // Voice identifier
  api_key?: string;      // Optional (fetches from DB if not provided)
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    voice_id: string;
    nome_voz: string;
    idioma: string;
    genero: string;
    preview_url?: string;
    // ... platform-specific fields
  };
}
```

### 2.3 Image Model Function

| Function | Path | Purpose | API Called | Status |
|----------|------|---------|------------|--------|
| fetch-runware-model | `/functions/v1/fetch-runware-model` | Get image model by AIR | Runware API | Active |

**Request**:
```typescript
{
  air: string;           // Model AIR identifier (e.g., 'runway:gen3@1')
  api_key?: string;      // Optional
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    air: string;
    name: string;
    // ... model metadata
  };
}
```

---

## 3. External API Integrations

### 3.1 Voice Synthesis APIs

#### ElevenLabs
**Base URL**: `https://api.elevenlabs.io/v1`
**Authentication**: Header `xi-api-key: {API_KEY}`
**Service**: `src/features/content-generation/services/audio/platforms/elevenLabs.ts`

**Endpoints**:
- `GET /voices` - List all voices
- `GET /voices/{voice_id}` - Get voice details
- `GET /user/subscription` - Check credits/usage

**Features**:
- Premium quality
- 29 languages
- Permanent preview URLs
- $0.30/1k characters
- 5k character max per request

---

#### Fish-Audio
**Base URL**: `https://api.fish.audio`
**Authentication**: Header `Authorization: Bearer {API_KEY}`
**Service**: `src/features/content-generation/services/audio/platforms/fishAudio.ts`

**Endpoints**:
- `GET /model` - List voices (paginated)
- `GET /model/{id}` - Get voice details
- `GET /wallet/self/api-credit` - Check credits

**Features**:
- Mid-tier quality
- 15 languages
- Temporary preview URLs (expire after 1 hour)
- $0.10/1k characters
- 3k character max per request

---

#### Minimax
**Base URL**: `https://api.minimax.chat/v1`
**Authentication**: Header `Authorization: Bearer {API_KEY}`
**Service**: `src/features/content-generation/services/audio/platforms/minimax.ts`

**Endpoints**:
- `GET /text_to_speech/voice_list` - List voices

**Features**:
- Budget option
- 8 languages
- System voices only (no cloning)
- $0.02/1k characters
- 2k character max per request

---

### 3.2 Image Generation API

#### Runware
**Base URL**: `https://api.runware.ai/v1`
**Authentication**: Header `Authorization: Bearer {API_KEY}`
**Used In**: Edge Function `fetch-runware-model`

**Request Format**:
```typescript
{
  taskType: "modelSearch",
  searchTerm: "runway:gen3@1"  // AIR identifier
}
```

**Features**:
- Multiple model support
- AIR-based identification
- Customizable dimensions (128-2048px, multiples of 64)
- Style and quality controls

---

### 3.3 YouTube Data API v3

**Base URL**: `https://www.googleapis.com/youtube/v3`
**Authentication**: Query param `key={API_KEY}`
**Service**: `src/shared/services/youtube.ts`

**Endpoints Used**:
- `/channels` - Get channel information
- `/playlistItems` - List videos in playlist
- `/videos` - Get video details
- `/search` - Search channels/videos

**Features**:
- 10,000 units/day quota
- Channel metadata extraction
- Video listing and details
- Transcript fetching (via third-party)

**Important**: Always use `encodeURIComponent()` for query parameters

---

### 3.4 Google Drive API v3

**Base URL**: `https://www.googleapis.com/drive/v3`
**Authentication**: Query param `key={API_KEY}`
**Used In**: `DriveAudioSelector.tsx`, `DriveVideoSelector.tsx`

**Endpoints Used**:
- `/files` - List files with query

**Query Example**:
```typescript
const query = `'${folderId}' in parents and mimeType contains 'audio/'`;
const url = `https://googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}`;
```

**Features**:
- List audio/video files in folders
- File metadata retrieval
- Direct URL access for media

---

### 3.5 Credit Checking APIs

| Platform | Endpoint | Method | Response |
|----------|----------|--------|----------|
| ElevenLabs | `https://api.elevenlabs.io/v1/user/subscription` | GET | `{ character_count, character_limit }` |
| Fish-Audio | `https://api.fish.audio/wallet/self/api-credit` | GET | `{ balance }` |
| OpenRouter | `https://openrouter.ai/api/v1/credits` | GET | `{ credits }` |

**Service**: `src/shared/services/apiCredits.ts`

---

## 4. Database Operations

**Database**: PostgreSQL (Supabase)
**Service**: `src/shared/services/database.ts`

### 4.1 Channel Service

**Table**: `canais`

```typescript
class ChannelService {
  async getAll(): Promise<Channel[]>
  async create(channel: ChannelInsert): Promise<Channel>
  async update(id: number, updates: Partial<Channel>): Promise<void>
  async delete(id: number): Promise<void>
}
```

**Used In**: All channel management pages

---

### 4.2 Script Service

**Table**: `roteiros`

```typescript
class ScriptService {
  async getAll(): Promise<Script[]>
  async getByChannel(channelId: number): Promise<Script[]>
  async create(script: ScriptInsert): Promise<Script>
  async update(id: number, updates: Partial<Script>): Promise<void>
  async delete(id: number): Promise<void>
}
```

**Key Fields**:
- `audio_path`: String (audio file URL)
- `images_path`: JSONB array of image URLs
- `status`: `'gerando' | 'pronto' | 'processando' | 'erro'`

---

### 4.3 Video Service

**Table**: `videos`

```typescript
class VideoService {
  async getAll(): Promise<Video[]>
  async getByChannel(channelId: number): Promise<Video[]>
  async getByStatus(status: VideoStatus): Promise<Video[]>
  async updateStatus(id: number, status: VideoStatus): Promise<void>
  async delete(id: number): Promise<void>
}
```

**Status Flow**: `gerando → pronto → publicado` (or `erro`)

---

### 4.4 Voice Service

**Table**: `vozes`

```typescript
class VoiceService {
  async getAll(): Promise<Voice[]>
  async getByPlatform(platform: string): Promise<Voice[]>
  async create(voice: VoiceInsert): Promise<Voice>
  async update(id: number, updates: Partial<Voice>): Promise<void>
  async delete(id: number): Promise<void>
}
```

**Key Fields**:
- `voice_id`: Platform-specific ID
- `id_plataforma`: Foreign key to `apis` table
- `idioma`: Language code (pt-br, en, es)
- `preview_url`: Audio preview URL

**Unique Constraint**: `(voice_id, id_plataforma)`

---

### 4.5 API Credentials

**Table**: `apis`

```typescript
interface API {
  id: number;
  plataforma: string;     // UNIQUE
  api_key: string;        // Encrypted
  group_ID?: string;
  created_at: string;
}
```

**Security**:
- Service role access only
- Never exposed to frontend
- Retrieved by Edge Functions

**Platforms**:
- ElevenLabs, Fish-Audio, Minimax
- Runware, GDrive, OpenRouter

---

## 5. Data Flow Architecture

### 5.1 Content Generation Flow

```
User Input (Frontend)
    ↓
ApiService.generateContent()
    ↓
N8N Webhook (/webhook/gerarConteudo)
    ↓
N8N Workflow (orchestration)
    ↓
External APIs (AI models, voice synthesis)
    ↓
Database (Supabase) - Insert/Update records
    ↓
Frontend (poll or webhook response) - Update UI
```

### 5.2 Voice Selection Flow

```
User Opens VoiceSelector
    ↓
AudioService.listVoicesFromApi(platform)
    ↓
Edge Function (list-{platform}-voices)
    ↓
Fetch API key from Supabase 'apis' table
    ↓
External Voice API
    ↓
Transform response
    ↓
Return to frontend
    ↓
Display in VoiceSelector with filters
```

### 5.3 Image Generation Flow

```
User Configures Images
    ↓
ApiService.generateContent({ tipo_geracao: 'gerar_imagens', ... })
    ↓
N8N Webhook (/webhook/gerarConteudo)
    ↓
Runware API (image generation)
    ↓
Upload images to storage
    ↓
Update roteiros.images_path (JSONB array)
    ↓
Frontend polls database
    ↓
Display in ImageGallery modal
```

---

## 6. Environment Variables Reference

### 6.1 Required Frontend Variables

All must be prefixed with `VITE_` for Vite to expose them.

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# N8N Base
VITE_API_BASE_URL=https://n8n.yourdomain.com

# N8N Webhooks
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
VITE_YOUTUBE_API_KEY=AIzaSyD...
```

### 6.2 Server-Side Variables (Edge Functions)

Stored in Supabase project settings, not in `.env`:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 6.3 API Keys (Stored in Database)

Never in `.env` files. Always in `apis` table:
- ElevenLabs API Key
- Fish-Audio API Key
- Minimax API Key
- Runware API Key
- Google Drive API Key
- OpenRouter API Key

---

## 7. Status Summary

### Active Endpoints
- ✅ cloneChannel
- ✅ generateContent (all 4 types)
- ✅ update (all update_types)
- ✅ generateVideo
- ✅ deleteContent
- ✅ All 7 Edge Functions

### Unused in UI
- ⚠️ processVideo (webhook exists but not called)
- ⚠️ publishVideo (webhook exists but not called)

### Future Enhancements
- Direct YouTube upload integration
- Real-time video rendering preview
- Batch operations for multiple channels
- Advanced scheduling with calendar UI

---

**Last Updated**: 2025-01-28
**Maintained By**: AutoDark Development Team

*For development patterns and conventions, see [CLAUDE.md](../CLAUDE.md)*
*For quick start and overview, see [README.md](../README.md)*
