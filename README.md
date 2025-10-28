# AutoDark - AI YouTube Content Automation

**Stack**: React 18 + TypeScript + Vite + Supabase + N8N
**Pattern**: Feature-Based Modular Architecture
**Pipeline**: User Input → N8N Webhooks → AI APIs → Database → UI

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment variables (copy .env.example to .env)
cp .env.example .env

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 📋 What It Does

AutoDark is a complete platform for automating YouTube content creation:

- **Clone YouTube Channels**: Extract titles and transcriptions for AI training
- **Generate Content**: Create titles, scripts, audio, and images with AI
- **Multi-Platform Audio**: ElevenLabs, Fish-Audio, and Minimax voice synthesis
- **Image Generation**: Runware API integration with customizable styles
- **Caption Styles**: Visual editor for traditional and karaoke-style captions
- **Video Rendering**: Final video processing with captions and effects

---

## 🛠 Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **TailwindCSS** for styling
- **React Router 7** for navigation

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **N8N** (workflow orchestration)
- **Docker** + **nginx** for deployment

### APIs
- YouTube Data v3, ElevenLabs, Fish-Audio, Minimax
- Runware (images), OpenRouter (AI), Google Drive

---

## 🎯 Core Features

### 1. Channel Cloning (`/clone-channel`)
- Search YouTube channels by URL
- Select videos for analysis
- Extract titles and transcriptions
- Train AI on channel style

### 2. Content Generation (`/generate-content-v2`)
**Four Generation Types:**
- **Titles**: Generate video titles from ideas
- **Script + Audio**: Create complete scripts with voice synthesis
- **Audio**: Convert existing scripts to audio
- **Images**: Generate images for scripts with Runware API

**Features:**
- Multi-language support (pt-br, en, es)
- Voice platform selection (ElevenLabs, Fish-Audio, Minimax)
- Batch processing for scripts
- Real-time progress tracking

### 3. Channel Management (`/manage-channel`)
**General Tab:**
- Configure default voice and character count
- Customize title and script prompts

**Caption Styles Tab:**
- **Traditional Mode**: Segment-based captions with font, color, and border controls
- **Karaoke Mode**: Word-by-word highlight with glow effects
- Real-time preview in 1080p proportions
- 9 position options with custom margins

### 4. Settings (`/settings`)
- Manage API credentials
- Sync voices from all platforms
- Check credit balances
- Configure image models

---

## 📁 Project Structure

```
src/
├── app/                    # App.tsx, main.tsx, routing
├── shared/                 # Reusable utilities
│   ├── components/         # UI components and modals
│   ├── contexts/           # AuthContext
│   ├── hooks/              # useApi, useDatabase, useYouTube
│   ├── lib/                # supabase.ts (client + types)
│   └── services/           # api.ts, database.ts, youtube.ts
│
├── features/               # Feature-based modules
│   ├── auth/               # LoginPage
│   ├── dashboard/          # DashboardPage
│   ├── channel-management/ # Clone, Manage, Review, Publish
│   ├── content-generation/ # Generate content, videos, audio services
│   ├── settings/           # SettingsPage
│   └── scripts/            # ViewScriptsPage
│
database/
├── supabase/
│   ├── migrations/         # SQL migrations (never edit existing)
│   └── functions/          # Edge Functions (Deno)
```

---

## 🔐 Environment Variables

**Required** (all prefixed with `VITE_`):

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# N8N Webhooks
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
VITE_YOUTUBE_API_KEY=AIzaSyD...
```

**API keys stored in Supabase `apis` table** (not in .env):
- ElevenLabs, Fish-Audio, Minimax, Runware, Google Drive, OpenRouter

---

## 🗄 Database Schema

**Core Tables:**

- **canais**: Channel configurations (prompts, voice, caption styles)
- **roteiros**: Generated scripts (title, text, audio_path, images_path)
- **videos**: Video records (status, paths, thumbnails)
- **vozes**: Voice catalog (multi-platform, metadata)
- **apis**: API credentials (service-role only)
- **modelos_imagem**: Image models (Runware AIR identifiers)

**Relationships:**
```
canais 1:N roteiros 1:N videos
canais N:1 vozes N:1 apis
```

---

## 📝 Git Commits

**Format**: `<Type>: <subject>` (imperative, max 72 chars)

**Types**: `Add`, `Fix`, `Update`, `Refactor`, `Remove`, `Docs`

**Examples**:
- ✅ `Add: karaoke caption mode with highlight effects`
- ✅ `Fix: audio playback fails on Fish-Audio voices`
- ✅ `Update: improve voice selector performance with useMemo`

---

## 🚢 Deployment

### Docker Build
```bash
docker build --build-arg VITE_SUPABASE_URL=$URL -t autodark:latest .
docker run -d -p 80:80 autodark:latest
```

### Easypanel/VPS
- Multi-stage build (node → nginx)
- Auto-deploy from `main` branch
- Environment variables configured in Easypanel

---

## 📚 Documentation

- **CLAUDE.md**: Complete development guide (patterns, conventions, architecture)
- **docs/API-REFERENCE.md**: Comprehensive API and webhook reference
- **README.md**: This file (quick start and overview)
- **config/deployment/README.md**: Deployment guide (Easypanel, Docker)

---

## 🎬 Workflow

```
1. Clone channel → Train AI on style
2. Generate titles → Review and select
3. Generate scripts → Edit if needed
4. Generate audio → Choose voice platform
5. Generate images → Configure style and dimensions
6. Generate video → Render with captions
7. Publish → Schedule on YouTube
```

---

**AutoDark** - Intelligent automation for YouTube content creation with AI.

*For detailed development instructions, see CLAUDE.md*
*For complete API reference, see docs/API-REFERENCE.md*
*For deployment instructions, see config/deployment/README.md*
