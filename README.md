# AutoDark - Sistema de Geração de Conteúdo para YouTube

**AutoDark** é uma plataforma completa para automação de criação de conteúdo para YouTube, oferecendo ferramentas para clonagem de canais, geração de roteiros, criação de áudio e gerenciamento de vídeos.

## 📋 Índice

- [Recursos Principais](#recursos-principais)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Instalação e Configuração](#instalação-e-configuração)
- [Funcionalidades Detalhadas](#funcionalidades-detalhadas)
- [API e Integrações](#api-e-integrações)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [Contribuição](#contribuição)

## 🚀 Recursos Principais

### 1. **Clonagem de Canais**
- Análise e extração de conteúdo de canais do YouTube
- Coleta de títulos e transcrições de vídeos
- Sistema de seleção de vídeos para análise
- Treinamento de IA baseado no conteúdo coletado

### 2. **Geração de Conteúdo**
- **Geração de Títulos**: Criação automática de títulos baseados em ideias
- **Geração de Roteiros**: Criação de roteiros completos com áudio
- **Geração de Áudio**: Conversão de roteiros existentes em áudio
- Suporte a múltiplos modelos de IA (Claude Sonnet, GPT, etc.)
- Sistema de idiomas personalizáveis

### 3. **Gestão de Áudio**
- Integração com múltiplas plataformas de síntese de voz:
  - **ElevenLabs**: Vozes premium em vários idiomas
  - **Fish Audio**: Vozes com clonagem personalizada
  - **Minimax**: Alternativa econômica para síntese de voz
- Player de áudio integrado com controles play/pause
- Download de arquivos de áudio gerados
- Controle de velocidade de reprodução

### 4. **Interface de Usuário Avançada**
- Dashboard responsivo com tema escuro
- Sistema de autenticação seguro via Supabase
- Modais interativos para revisão de conteúdo
- Seleção múltipla de roteiros para geração de áudio
- Layout adaptativo para diferentes tipos de geração

### 5. **Gerenciamento de Canais**
- Criação e edição de canais personalizados
- Configuração de prompts específicos por canal
- Histórico de conteúdo gerado
- Estatísticas de performance

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
- Sistema de autenticação integrado

### APIs e Integrações
- **YouTube Data API** para coleta de informações
- **N8N** como orquestrador de workflows
- **Webhook System** para comunicação com serviços externos
- Integração com múltiplas APIs de IA e síntese de voz

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
│   APIs Externas │    │  Edge Functions │    │   YouTube API   │
│   (IA & Audio)  │    │   (Supabase)    │    │   (Coleta)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn
- Conta Supabase configurada
- Chaves de API das plataformas de áudio

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
VITE_WEBHOOK_TREINAR_CANAL=/webhook/treinarCanal
VITE_WEBHOOK_GERAR_CONTEUDO=/webhook/gerarConteudo

# YouTube API Configuration
VITE_YOUTUBE_API_KEY=sua-chave-youtube-api
```

### 4. Configure o Banco de Dados
Execute o script SQL fornecido para configurar as tabelas e políticas RLS:

```sql
-- Execute no SQL Editor do Supabase
-- Arquivo: supabase_rls_fix.sql
```

### 5. Deploy das Edge Functions
```bash
# Configure as Edge Functions no Supabase
supabase functions deploy fetch-elevenlabs-voice
supabase functions deploy fetch-fish-audio-voice
supabase functions deploy list-elevenlabs-voices
# ... outras functions
```

### 6. Execute o Projeto
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
- **Progresso em Tempo Real**: Acompanhamento do processo via webhooks

### Geração de Conteúdo (`/generate-content`)

#### Tipos de Geração:

1. **Gerar Títulos (`gerar_titulos`)**
   - Input de nova ideia
   - Seleção de modelo de IA
   - Configuração de idioma
   - Lista de títulos gerados para seleção

2. **Gerar Roteiro e Áudio (`gerar_roteiro_audio`)**
   - Criação completa de roteiro com áudio
   - Seleção de voz para síntese
   - Controle de velocidade de áudio
   - Player integrado para preview

3. **Gerar Áudio (`gerar_audio`)**
   - Carregamento de roteiros existentes sem áudio
   - Seleção múltipla de roteiros
   - Interface simplificada (apenas controles de áudio)
   - Layout 50/50 para modelo de voz e velocidade

### Configurações (`/settings`)
- **Gerenciamento de APIs**: Configuração de chaves para ElevenLabs, Fish Audio, etc.
- **Modelos de Voz**: Cadastro e teste de vozes personalizadas
- **Configurações de Canal**: Prompts personalizados e preferências

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

#### Edge Functions (supabase/functions/)
Funções serverless para:
- Listagem de vozes disponíveis
- Busca de detalhes específicos de vozes
- Proxy seguro para APIs externas
- Cache e otimização de requests

### Webhooks e Automação

O sistema utiliza N8N para orquestração de workflows:

```javascript
// Exemplo de payload para geração de conteúdo
{
  id_canal: "uuid-do-canal",
  nova_ideia: "Ideia para o vídeo",
  idioma: "pt-br",
  tipo_geracao: "gerar_roteiro_audio",
  // Campos adicionais baseados no tipo
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
│   │   └── ...
│   ├── contexts/            # Contexts do React
│   │   └── AuthContext.tsx  # Autenticação global
│   ├── hooks/               # Hooks personalizados
│   │   ├── useApi.ts        # Hook para chamadas de API
│   │   └── useDatabase.ts   # Hook para operações de banco
│   ├── pages/               # Páginas da aplicação
│   │   ├── DashboardPage.tsx
│   │   ├── CloneChannelPage.tsx
│   │   ├── GenerateContentPage.tsx
│   │   └── ...
│   ├── services/            # Serviços e integrações
│   │   ├── api.ts           # Configuração de APIs
│   │   ├── audio/           # Serviços de áudio
│   │   └── database.ts      # Operações de banco
│   └── lib/
│       └── supabase.ts      # Configuração Supabase
├── supabase/
│   └── functions/           # Edge Functions
│       ├── fetch-elevenlabs-voice/
│       ├── fetch-fish-audio-voice/
│       └── ...
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
- Caminhos para arquivos de áudio

#### `apis`
- Credenciais de APIs externas
- Configurações de plataformas

#### `voices`
- Catálogo de vozes disponíveis
- Metadados de cada voz
- Configurações específicas

### Políticas de Segurança (RLS)

O sistema implementa Row Level Security para:
- Isolamento de dados por usuário
- Controle de acesso granular
- Funções de bypass para operações sistema

```sql
-- Exemplo de função para bypass de RLS
CREATE OR REPLACE FUNCTION get_roteiros_sem_audio(canal_param INTEGER)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER -- Permite bypass de RLS
AS $$
-- Implementação da função
$$;
```

## 🎨 Interface de Usuário

### Design System
- **Tema**: Escuro com acentos azuis (#3B82F6)
- **Tipografia**: Inter (system fonts)
- **Grid**: TailwindCSS com breakpoints responsivos
- **Componentes**: Modulares e reutilizáveis

### Estados da Interface
- **Loading**: Spinners e esqueletos para carregamento
- **Empty States**: Mensagens informativas quando não há dados
- **Error States**: Tratamento visual de erros
- **Success States**: Feedback visual de sucesso

### Acessibilidade
- Navegação por teclado
- Contraste adequado para texto
- Labels descritivos em formulários
- Estados de foco visíveis

## 🤝 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código
- TypeScript obrigatório
- ESLint para linting
- Prettier para formatação
- Commit messages descritivos

### Estrutura de Commits
```
tipo(escopo): descrição breve

Descrição detalhada do que foi alterado e por quê.

- Item específico alterado
- Outro item alterado
```

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

**AutoDark** - Automação inteligente para criação de conteúdo no YouTube.