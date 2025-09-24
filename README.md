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

```
autodark/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── ActionCard.tsx   # Cards de ação do dashboard
│   │   ├── VideoCard.tsx    # Cards de vídeos
│   │   ├── VoiceSelector.tsx # Seletor de vozes
│   │   ├── ImageModelCard.tsx # Cards de modelos de imagem
│   │   └── DashboardHeader.tsx # Cabeçalho padrão
│   ├── contexts/            # Contexts do React
│   │   └── AuthContext.tsx  # Autenticação global
│   ├── hooks/               # Hooks personalizados
│   │   ├── useApi.ts        # Hook para chamadas de API
│   │   ├── useDatabase.ts   # Hook para operações de banco
│   │   └── useAudio.ts      # Hook para controles de áudio
│   ├── pages/               # Páginas da aplicação
│   │   ├── DashboardPage.tsx
│   │   ├── CloneChannelPage.tsx
│   │   ├── GenerateContentPage.tsx # UI redesenhada
│   │   ├── SettingsPage.tsx # Sistema de configurações
│   │   └── ReviewEditPage.tsx
│   ├── services/            # Serviços e integrações
│   │   ├── api.ts           # Configuração de APIs
│   │   ├── audio/           # Serviços de áudio
│   │   ├── youtube.ts       # Integração YouTube
│   │   └── database.ts      # Operações de banco
│   └── lib/
│       └── supabase.ts      # Configuração Supabase
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── fetch-elevenlabs-voice/
│   │   ├── fetch-fish-audio-voice/
│   │   ├── fetch-runware-model/
│   │   └── list-elevenlabs-voices/
│   └── migrations/          # Migrações de banco
└── public/                  # Arquivos estáticos
```

## 🗄 Banco de Dados

### Tabelas Principais

#### `canais`
- Informações dos canais configurados
- Prompts personalizados
- Configurações específicas

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

---

**AutoDark** - Automação inteligente para criação de conteúdo no YouTube com IA.

*Versão: 2.0 - Atualizada com geração de imagens e UI redesenhada*