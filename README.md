# Edital Notify

Interface para visualização de informações obtidas a partir de um sistema de **scraping de editais**. Backend NestJS + Frontend React, com autenticação JWT (access + refresh), logout e senhas com Argon2 + salt.

O sistema de scraping (Python) foi integrado ao monorepo; os dados coletados sao consumidos pela API Nest e exibidos no frontend.

O scraper tambem pode enriquecer os editais com IA local (resumo e tags) usando Ollama + `granite3-dense:2b`.

## Estrutura

- `apps/backend` — API NestJS, PostgreSQL, TypeORM
- `apps/frontend` — React (Vite) + TypeScript — landing page, página `/sobre` e área logada
- `apps/scraper` — Servico Python (FastAPI) com scraping, persistencia e notificacoes WhatsApp

## Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente (ou via Docker)
- Python 3.10+ (para `apps/scraper`)

## Configuração

### Backend

```bash
cd apps/backend
cp .env.example .env
# Ajuste .env (DB_*, JWT_ACCESS_SECRET)
npm install
```

### Banco de dados

Crie o banco e rode a API (o TypeORM sobe com `synchronize: true` em desenvolvimento e cria as tabelas):

```sql
CREATE DATABASE aps;
```

### Scraper (Python)

```bash
cd apps/scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Frontend

O frontend usa proxy para `/api` apontando para a porta definida em `apps/backend/.env` (`PORT`, fallback `3000`). Não é obrigatório configurar nada além de:

```bash
cd apps/frontend
npm install
```

Para usar outra URL da API:

```bash
# .env ou .env.local
VITE_API_URL=http://localhost:3000
```

Para forçar um alvo específico do proxy do Vite em desenvolvimento:

```bash
# apps/frontend/.env.local
VITE_API_PROXY_TARGET=http://localhost:3001
```

## Executando

Na raiz do monorepo:

```bash
npm install
npm run dev       # sobe backend + frontend
npm run scraper   # sobe servico Python (porta 8000) usando apps/scraper/.venv
npm run dev:all   # sobe backend + frontend + scraper
```

Ou separadamente:

```bash
npm run backend   # http://localhost:3000, Swagger em /docs
npm run frontend  # http://localhost:5173
```

Em terminais separados:

```bash
# Terminal 1
npm run start:dev -w apps/backend

# Terminal 2
npm run dev -w apps/frontend
```

## Autenticação

1. **Registro**: use "Criar conta" na tela de login ou `POST /user` com `username` e `password`.
2. **Login**: `POST /auth/login` com `username` e `password` → retorna `accessToken` e `refreshToken`.
3. **Refresh**: `POST /auth/refresh` com `refreshToken` no body → retorna novo par de tokens.
4. **Logout**: `POST /auth/logout` com `refreshToken` no body invalida aquele refresh token.
5. **Logout em todos os dispositivos**: `POST /auth/logout-all` com `Authorization: Bearer <accessToken>`.

Senhas são armazenadas com **Argon2** (argon2id) e **salt no final** (password + salt antes de hashear); o salt é guardado por usuário na tabela `users`.

## Endpoints principais (backend)

- `GET /editais` — lista editais com filtros (`orgao`, `q`, `status`, `limit`, `offset`). Cada item traz também `applicationStatus` (candidatura) e `reminder` (lembrete) do usuário.
- `POST /editais/coleta` — dispara coleta imediata no scraper.
- `GET /editais/coleta/status` — status da última coleta.
- `GET /editais/assistente/status` — informa se o assistente de IA está habilitado e qual modelo usa.
- `POST /editais/:id/chat` — conversa com o assistente de IA sobre um edital (`{ message, history }`).
- `GET /tracking/candidaturas` — lista os editais que o usuário acompanha (pipeline de candidaturas).
- `PUT /tracking/editais/:id/status` — define/atualiza o status de candidatura (`{ status }`).
- `DELETE /tracking/editais/:id/status` — remove o acompanhamento.
- `PUT /tracking/editais/:id/reminder` — define um lembrete de prazo (`{ daysBefore }`).
- `DELETE /tracking/editais/:id/reminder` — remove o lembrete.
- `GET /user/profile` — lê palavras-chave de perfil de relevância.
- `PATCH /user/profile` — atualiza palavras-chave do perfil.
- `PATCH /user/me` — atualiza `username` e/ou `password` do usuário autenticado.
- `DELETE /user/me` — desativa a conta autenticada.
- `GET /ops/health` — health agregado de backend + scraper.
- `GET /ops/metrics` — métricas de integração backend->scraper.

Todos os endpoints acima (exceto auth/registro/login) exigem JWT.

## Frontend (fluxo)

- **`/`** — Landing page pública.
- **`/sobre`** — Página institucional do projeto.
- **`/login`** — Tela de login; **`/login?cadastro`** abre já no modo “Criar conta”.
- **`/app`** — Área autenticada:
  - filtros dinâmicos (sem botão "Filtrar")
  - atualização manual de coleta
  - perfil de relevância por palavras-chave
  - score de relevância por edital
  - status operacional do scraper
  - **Assistente IA** por edital (chat) — botão "💬 Assistente IA" em cada card
  - **Acompanhamento de candidaturas** — seletor de status por edital + aba "Minhas candidaturas" (pipeline)
  - **Lembretes de prazo** — escolha "X dias antes" e veja o destaque "⏰ Faltam N dias" / "Prazo encerrado"
- **`/app/settings`** — Configurações do usuário:
  - atualização de username
  - atualização de senha
  - desativação de conta
- Logout redireciona para a landing (`/`).

## IA local (resumo e tags)

No `apps/scraper/.env`:

```bash
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=granite3-dense:2b
AI_TIMEOUT_SECONDS=15
```

Com Ollama ativo:

```bash
ollama pull granite3-dense:2b
```

Observação: a IA é opcional. Se `AI_ENABLED=false`, o sistema continua funcionando sem resumo/tags gerados.

## Assistente de IA (chat do edital)

Funcionalidade de IA com **modelo local** (sem serviços online por padrão). O backend
NestJS expõe um chat que responde dúvidas sobre um edital específico usando apenas o
conteúdo daquele edital. É totalmente parametrizável via `apps/backend/.env`:

```bash
LLM_ENABLED=true
LLM_PROVIDER=ollama            # ollama (local) | openai (API compatível)
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=granite3-dense:2b
LLM_API_KEY=
LLM_TIMEOUT_MS=30000
LLM_TEMPERATURE=0.3
```

Com Ollama local:

```bash
ollama pull granite3-dense:2b
```

Para **comparar com uma LLM online**, basta trocar o provedor (nenhuma mudança de código):

```bash
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-xxxxxxxx
```

No frontend, o chat fica no botão "💬 Assistente IA" de cada edital.

## Acompanhamento de candidaturas e lembretes (negócio)

- **Acompanhamento de candidaturas**: cada usuário marca um status por edital
  (`Tenho interesse` → `Vou me inscrever` → `Inscrito` → `Concluído` / `Descartado`).
  A aba **"Minhas candidaturas"** mostra os editais agrupados por status (pipeline pessoal).
- **Lembretes de prazo**: o usuário escolhe "X dias antes" do `data_fim`. A listagem
  destaca automaticamente "⏰ Faltam N dias" quando o prazo se aproxima e "Prazo encerrado"
  quando passa. Os dados ficam por usuário, nas tabelas `user_applications` e `user_reminders`
  (criadas automaticamente pelo TypeORM em desenvolvimento).
