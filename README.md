# AutoDark - Sistema de Geração de Conteúdo para YouTube

**AutoDark** é uma plataforma completa para automação de criação de conteúdo para YouTube, oferecendo ferramentas para clonagem de canais, geração de roteiros, criação de áudio e geração de imagens com IA.

## 📋 Índice

- [Recursos Principais](#recursos-principais)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Instalação e Configuração](#instalação-e-configuração)
- [Funcionalidades Detalhadas](#funcionalidades-detalhadas)
- [API e Integrações](#api-e-integrações)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [Deploy e Produção](#deploy-e-produção)

## 🚀 Recursos Principais

### 1. **Clonagem de Canais**
- Análise e extração de conteúdo de canais do YouTube
- Coleta de títulos e transcrições de vídeos
- Sistema de seleção de vídeos para análise
- Treinamento de IA baseado no conteúdo coletado

### 2. **Geração de Conteúdo Avançada**
- **Geração de Títulos**: Criação automática de títulos baseados em ideias
- **Geração de Roteiros**: Criação de roteiros completos com áudio
- **Geração de Áudio**: Conversão de roteiros existentes em áudio
- **Geração de Imagens**: Criação de imagens personalizadas para os roteiros
- Suporte a múltiplos modelos de IA (Claude Sonnet, GPT, etc.)
- Sistema de idiomas personalizáveis

### 3. **Gestão de Áudio Multi-Plataforma**
- Integração com múltiplas plataformas de síntese de voz:
  - **ElevenLabs**: Vozes premium em vários idiomas
  - **Fish Audio**: Vozes com clonagem personalizada
  - **Minimax**: Alternativa econômica para síntese de voz
- Player de áudio integrado com controles play/pause
- Download de arquivos de áudio gerados
- Controle de velocidade de reprodução

### 4. **Sistema de Geração de Imagens**
- Integração com **Runware API** para geração de imagens
- Configurações universais (estilo, dimensões, qualidade)
- Configurações individuais (quantidade de imagens por roteiro)
- Presets de dimensões para diferentes formatos (16:9, 9:16, quadrado)
- Galeria modal para visualização das imagens geradas
- Download individual ou em lote das imagens

### 5. **Interface de Usuário Moderna**
- Dashboard responsivo com tema escuro moderno
- Sistema de autenticação seguro via Supabase
- Modais interativos para revisão de conteúdo
- Seleção múltipla de roteiros para processamento
- Layout progressivo com fluxo step-by-step
- Loading states e feedback visual em tempo real

### 6. **Sistema de Configurações Avançado**
- Gerenciamento de APIs com coleta automática de metadados
- Catálogo de modelos de IA (áudio e imagem)
- Teste de vozes em tempo real
- Configuração de prompts personalizados por canal
- Histórico de conteúdo gerado

### 7. **Gestão Avançada de Canais** 🆕
- **Editor de Estilo de Legendas**: Configuração visual completa de legendas
  - **Modo Tradicional**: Legendas por segmento com controle de fonte, cor e contorno
  - **Modo Karaoke**: Destaque palavra por palavra com efeito glow personalizado
  - Preview em tempo real com proporção 1080p
  - Controles de posicionamento e espaçamento
- **Configuração de Canal**:
  - Seleção de voz padrão com preview integrado
  - Média de caracteres por roteiro (controle de duração)
  - Prompts personalizados para título e roteiro
  - Interface com tabs para melhor organização
- **Preview de Áudio**: Teste de vozes ElevenLabs e Fish-Audio diretamente no modal

## 🛠 Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** como bundler para desenvolvimento rápido
- **TailwindCSS** para estilização responsiva
- **React Router DOM** para navegação
- **Lucide React** para ícones modernos

### Backend e Banco de Dados
- **Supabase** como backend-as-a-service
- **PostgreSQL** com Row Level Security (RLS)
- **Edge Functions** para processamento de APIs externas
- Sistema de autenticação integrado com JWT

### APIs e Integrações
- **YouTube Data API** para coleta de informações
- **N8N** como orquestrador de workflows
- **Runware API** para geração de imagens
- **ElevenLabs, Fish Audio, Minimax** para síntese de voz
- Sistema de webhooks para comunicação assíncrona

## 🏗 Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Supabase      │    │   N8N Workflows │
│   (Frontend)    │◄───┤   (Database)    │◄───┤   (Automation)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   APIs Externas │    │  Edge Functions │    │   Runware API   │
│   (IA & Audio)  │    │   (Supabase)    │    │   (Imagens)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn
- Conta Supabase configurada
- Chaves de API das plataformas integradas

### 1. Clone o Repositório
```bash
git clone <repository-url>
cd autodark
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configuração do Ambiente
Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```env
# Supabase Configuration
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-supabase

# API Configuration
VITE_API_BASE_URL=https://sua-instancia-n8n.com
VITE_WEBHOOK_CLONE_CHANNEL=/webhook/treinarCanal
VITE_WEBHOOK_GERAR_CONTEUDO=/webhook/gerarConteudo

# YouTube API Configuration
VITE_YOUTUBE_API_KEY=sua-chave-youtube-api
```

### 4. Configure o Banco de Dados
Execute as migrações no Supabase:

```sql
-- Configurar tabelas principais
-- Arquivo: supabase/migrations/create_tables.sql
```

### 5. Execute o Projeto
```bash
npm run dev
```

## 🎯 Funcionalidades Detalhadas

### Dashboard Principal (`/dashboard`)
- Visão geral dos canais configurados
- Acesso rápido a todas as funcionalidades
- Estatísticas de uso e performance

### Clonagem de Canais (`/clone-channel`)
- **Busca de Canal**: Input de URL do YouTube
- **Seleção de Vídeos**: Interface para escolher vídeos específicos
- **Ações Disponíveis**:
  - `coleta_titulo`: Extrai títulos dos vídeos
  - `transcrever`: Gera transcrições completas
- **Progresso em Tempo Real**: Acompanhamento via webhooks

### Geração de Conteúdo (`/generate-content`)

#### Fluxo Redesenhado com UI/UX Aprimorada

**1. Configuração Inicial**
- Seleção do canal de destino
- Escolha do tipo de geração
- Layout progressivo step-by-step

**2. Tipos de Geração:**

#### **Gerar Títulos (`gerar_titulos`)**
- Input de nova ideia
- Seleção de modelo de IA
- Configuração de idioma
- Lista de títulos gerados para seleção

#### **Gerar Roteiro e Áudio (`gerar_roteiro_audio`)**
- Criação completa de roteiro com áudio
- Seleção de voz para síntese
- Controle de velocidade de áudio
- Player integrado para preview

#### **Gerar Áudio (`gerar_audio`)**
- Carregamento automático de roteiros sem áudio
- Seleção múltipla de roteiros
- Interface simplificada (apenas controles de áudio)
- Layout otimizado para processamento em lote

#### **Gerar Imagens (`gerar_imagens`)** 🆕
**Fluxo Progressivo:**
1. **Configuração Inicial**: Modelo de IA + Busca de roteiros
2. **Roteiros Disponíveis**: Lista de roteiros sem imagens
3. **Configurações Universais**: Estilo, dimensões, qualidade
4. **Geração**: Botão com loading "Gerando Imagens..."

**Características:**
- Filtro automático por `images_path IS NULL`
- Configurações universais aplicadas a todos os roteiros
- Configurações individuais (quantidade de imagens)
- Validação de dimensões (múltiplos de 64, range 128-2048)
- Presets otimizados: 16:9 (1344×768), 9:16 (768×1344)
- Modal de galeria com preview das imagens
- Download individual ou em lote

### Gerenciamento de Canais (`/manage-channel`) 🆕

**Interface Moderna com Tabs:**

#### **Aba Geral**
- **Configuração de Voz e Caracteres**:
  - Dropdown de vozes organizadas por plataforma
  - Campo de média de caracteres (controle de duração)
  - Alinhamento responsivo em grid
- **Prompts de Geração**:
  - Prompt de Título: Define como títulos são gerados
  - Prompt de Roteiro: Define estrutura e estilo dos roteiros
  - Contador de caracteres em tempo real
  - Placeholders com exemplos práticos

#### **Aba Estilo de Legendas**
- **Tipo de Legenda**:
  - **Tradicional (Segments)**: Legendas por segmento
  - **Karaoke (Highlight)**: Destaque palavra por palavra

**Controles Tradicionais:**
- Fonte, tamanho e negrito
- Cor do texto e contorno
- Estilo da borda (outline, caixa, arredondado)
- Largura da borda
- Alinhamento na tela (9 posições)
- Margem vertical

**Controles Karaoke:**
- Fonte e tamanho customizáveis
- Cor do texto e fundo com opacidade
- Cor do highlight com intensidade de glow
- Cantos arredondados configuráveis
- Padding horizontal e vertical
- Palavras por linha e máximo de linhas
- Alinhamento em 9 posições

**Preview em Tempo Real:**
- Proporção 1080p (escala automática)
- Visualização instantânea das mudanças
- Background realista para teste de visibilidade
- Indicador de modo preview

**Comportamento:**
- Modal permanece aberto após salvar
- Mensagem de sucesso temporária (3 segundos)
- Sincronização com webhook N8N
- Persistência em Supabase

### Configurações (`/settings`)
- **Gerenciamento de APIs**: Configuração automática com coleta de metadados
- **Modelos de Áudio**: Cadastro e teste de vozes personalizadas
- **Modelos de Imagem**: Integração com Runware API
- **Configurações de Canal**: Prompts personalizados

## 🔌 API e Integrações

### Estrutura de Serviços

#### `apiService` (src/services/api.ts)
Centraliza todas as chamadas para APIs externas:
- Configuração de endpoints via variáveis de ambiente
- Sistema de webhooks para N8N
- Tratamento de erros e logging
- Suporte a CORS

#### Serviços de Áudio (src/services/audio/)
- **Base Service**: Interface comum para todas as plataformas
- **ElevenLabs**: Implementação para API da ElevenLabs
- **Fish Audio**: Integração com Fish Audio API
- **Minimax**: Suporte para Minimax TTS

### Payload para Geração de Imagens
```javascript
{
  roteiros: [
    { id_roteiro: 123, n_imgs: 2 },
    { id_roteiro: 124, n_imgs: 1 }
  ],
  img_model: "runway:gen3@1",
  estilo: "fotorrealista, alta qualidade",
  detalhe_estilo: "4K, cores vibrantes, iluminação profissional",
  altura: 768,
  largura: 1344,
  tipo_geracao: "gerar_imagens"
}
```

## 📁 Estrutura do Projeto

### Nova Arquitetura (Feature-Based)
```
autodark/
├── config/                  # Arquivos de configuração
│   ├── docker/             # Configurações Docker
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── .dockerignore
│   ├── deployment/         # Configurações de deploy
│   │   ├── easypanel.json
│   │   ├── easypanel.yml
│   │   └── README-DEPLOY.md
│   ├── build/              # Configurações de build
│   │   ├── eslint.config.js
│   │   ├── postcss.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.app.json
│   │   └── tsconfig.node.json
│   └── env/
│       ├── .env.example
│       └── .gitignore
│
├── database/               # Database related files
│   ├── supabase/          # Supabase configuration
│   │   ├── config.toml
│   │   ├── functions/     # Edge Functions
│   │   │   ├── fetch-elevenlabs-voice/
│   │   │   ├── fetch-fish-audio-voice/
│   │   │   ├── fetch-runware-model/
│   │   │   └── list-elevenlabs-voices/
│   │   └── migrations/    # Migrações de banco
│   ├── scripts/           # Database scripts
│   │   └── supabase_rls_fix.sql
│   └── local/             # Local databases
│       └── vozes.db
│
├── src/
│   ├── app/               # App configuration
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── shared/            # Shared utilities
│   │   ├── components/
│   │   │   ├── ui/        # UI components
│   │   │   │   └── LoadingSpinner.tsx
│   │   │   └── modals/    # Modal components
│   │   │       └── PromptModal.tsx
│   │   ├── hooks/         # Shared hooks
│   │   │   ├── useApi.ts
│   │   │   └── useDatabase.ts
│   │   ├── contexts/      # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── lib/           # Libraries & configs
│   │   │   └── supabase.ts
│   │   └── services/      # Shared services
│   │       ├── api.ts
│   │       ├── database.ts
│   │       └── youtube.ts
│   │
│   ├── features/          # Feature-based organization
│   │   ├── auth/
│   │   │   └── pages/
│   │   │       └── LoginPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   └── ActionCard.tsx
│   │   │   └── pages/
│   │   │       └── DashboardPage.tsx
│   │   │
│   │   ├── content-generation/
│   │   │   ├── components/
│   │   │   │   └── VoiceSelector.tsx
│   │   │   ├── pages/
│   │   │   │   ├── GenerateContentPage.tsx
│   │   │   │   └── GenerateVideoPage.tsx
│   │   │   └── services/
│   │   │       └── audio/     # Audio generation services
│   │   │           ├── audioService.ts
│   │   │           └── platforms/
│   │   │               ├── base.ts
│   │   │               ├── elevenLabs.ts
│   │   │               ├── fishAudio.ts
│   │   │               └── minimax.ts
│   │   │
│   │   ├── channel-management/
│   │   │   ├── components/
│   │   │   │   ├── VideoCard.tsx
│   │   │   │   ├── VideoReviewModal.tsx
│   │   │   │   ├── ImageModelCard.tsx
│   │   │   │   └── CaptionStyleEditor.tsx  # Editor visual de legendas
│   │   │   ├── pages/
│   │   │   │   ├── CloneChannelPage.tsx
│   │   │   │   ├── ManageChannelPage.tsx   # Modal com tabs (Geral + Legendas)
│   │   │   │   ├── PublishSchedulePage.tsx
│   │   │   │   └── ReviewEditPage.tsx
│   │   │   └── hooks/
│   │   │       └── useYouTube.ts
│   │   │
│   │   └── settings/
│   │       └── pages/
│   │           └── SettingsPage.tsx
│   │
│   └── types/             # Type definitions
│       └── index.ts
│
├── public/                # Static files
│   └── index.html
│
└── dist/                  # Build output
```

## 🗄 Banco de Dados

### Tabelas Principais

#### `canais`
- Informações dos canais configurados
- `prompt_titulo`: Prompt para geração de títulos
- `prompt_roteiro`: Prompt para geração de roteiros
- `voz_prefereida`: ID da voz padrão (FK para `vozes`)
- `media_chars`: Média de caracteres por roteiro
- `caption_style`: JSONB com configurações de legenda
  ```json
  {
    "type": "highlight" | "segments",
    "style": {
      // Karaoke (highlight)
      "fonte": "Arial Black",
      "tamanho_fonte": 72,
      "texto_cor": "#FFFFFF",
      "fundo_cor": "#000000",
      "fundo_opacidade": 50,
      "fundo_arredondado": true,
      "highlight_texto_cor": "#FFFF00",  // Cor do texto quando destacado (opcional)
      "highlight_cor": "#D60000",
      "highlight_borda": 12,
      "padding_horizontal": 40,
      "padding_vertical": 80,
      "position": "bottom_center",
      "words_per_line": 4,
      "max_lines": 2

      // Tradicional (segments)
      "font": { "name": "Arial", "size": 36, "bold": true },
      "colors": { "primary": "#FFFFFF", "outline": "#000000" },
      "border": { "style": 1, "width": 3 },
      "position": { "alignment": "bottom_center", "marginVertical": 20 }
    }
  }
  ```

#### `roteiros`
- Roteiros gerados
- Associação com canais
- `audio_path`: Caminhos para arquivos de áudio
- `images_path`: Array JSONB com URLs das imagens

#### `apis`
- Credenciais de APIs externas
- Configurações de plataformas (ElevenLabs, Fish Audio, Minimax, Runware)

#### `vozes`
- Catálogo de vozes disponíveis
- Metadados coletados automaticamente
- Configurações específicas por plataforma

#### `modelos_imagem` 🆕
- Catálogo de modelos Runware
- Metadados coletados via API
- AIR (identificador único do modelo)

### Políticas de Segurança (RLS)

O sistema implementa Row Level Security para:
- Isolamento de dados por usuário
- Controle de acesso granular
- Funções de bypass para operações sistema

## 🚀 Deploy e Produção

### Deployment no Easypanel/VPS Hostinger

O projeto está otimizado para deployment em VPS com Easypanel:

1. **Build de Produção**:
```bash
npm run build
```

2. **Variáveis de Ambiente**: Todas as APIs essenciais configuradas

3. **Estrutura Limpa**:
   - ✅ Console.log de debug removidos
   - ✅ Arquivos backup eliminados
   - ✅ Imports otimizados
   - ✅ Código morto removido

4. **Performance**:
   - Bundle otimizado com Vite
   - Lazy loading de componentes
   - Cache de API calls
   - Compressão de assets

### Monitoramento

- Error tracking via console.error (mantidos para produção)
- Health checks das APIs externas
- Logs de performance e uso

## 🔧 Manutenção

### Limpeza de Código Implementada

- ❌ **Removidos**: 218+ console.log de debug
- ❌ **Removidos**: Arquivos backup (SettingsPage.tsx.backup, nul)
- ❌ **Corrigidos**: Imports incorretos (ActionCard.tsx)
- ❌ **Removidas**: Rotas duplicadas (/publish-schedule)
- ✅ **Mantidos**: console.error para tracking de produção

### Próximas Melhorias Recomendadas

1. **Sistema de Notificações**: Substituir alert() por toast notifications
2. **Variáveis de Ambiente**: Mover URLs hardcoded para .env
3. **Error Boundaries**: Implementar error boundaries do React
4. **Testing**: Adicionar testes unitários e de integração
5. **Exportação de Configurações**: Permitir exportar/importar configs de canal

---

## 📝 Changelog

### Versão 2.1 (Atual) - Sistema de Legendas Avançado
- ✅ **Editor Visual de Legendas**: Configuração completa com preview em tempo real
- ✅ **Dois Modos de Legenda**: Tradicional e Karaoke com controles específicos
- ✅ **Gestão de Canais Aprimorada**: Modal com tabs e interface moderna
- ✅ **Preview de Áudio Integrado**: Teste de vozes ElevenLabs e Fish-Audio
- ✅ **Média de Caracteres**: Controle de duração por roteiro
- ✅ **Sincronização N8N**: Webhook `/webhook/update` com `update_type`
- ✅ **Persistência Completa**: Caption styles salvos em JSONB no Supabase

### Versão 2.0 - Geração de Imagens
- ✅ Integração com Runware API
- ✅ UI redesenhada para geração de conteúdo
- ✅ Sistema de imagens com galeria e download

### Versão 1.0 - Lançamento Inicial
- ✅ Clonagem de canais do YouTube
- ✅ Geração de títulos e roteiros
- ✅ Síntese de voz multi-plataforma
- ✅ Sistema de autenticação

---

**AutoDark** - Automação inteligente para criação de conteúdo no YouTube com IA.

*Versão: 2.1 - Sistema de Legendas Avançado e Gestão de Canais*