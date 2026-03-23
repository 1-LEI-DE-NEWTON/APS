# Edital Notify

Interface para visualização de informações obtidas a partir de um sistema de **scraping de editais**. Backend NestJS + Frontend React, com autenticação JWT (access + refresh), logout e senhas com Argon2 + salt.

O sistema de scraping (Python) foi integrado ao monorepo; os dados coletados sao consumidos pela API Nest e exibidos no frontend.

O scraper tambem pode enriquecer os editais com IA local (resumo e tags) usando Ollama + `mistral:latest`.

## Estrutura

- `apps/backend` — API NestJS, PostgreSQL, TypeORM
- `apps/frontend` — React (Vite) + TypeScript — landing page (Login / Cadastre-se) e área logada para consulta aos editais
- `apps/scraper` — Servico Python (FastAPI) com scraping, persistencia e notificacoes WhatsApp

## Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente (ou via Docker)

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

### Frontend

O frontend usa proxy para `/api` apontando para `http://localhost:3000`. Não é obrigatório configurar nada além de:

```bash
cd apps/frontend
npm install
```

Para usar outra URL da API:

```bash
# .env ou .env.local
VITE_API_URL=http://localhost:3000
```

## Executando

Na raiz do monorepo:

```bash
npm install
npm run dev       # sobe backend + frontend
npm run scraper   # sobe servico Python (porta 8000)
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

## Arquitetura do Backend

Cada entidade segue a pasta em `src/api/<entidade>/`:

- `entities/` — entidades TypeORM
- `repository/` — repositórios
- `services/` — regras de negócio
- `dtos/` — DTOs e validação
- `docs/` — decorators Swagger
- `<entidade>.controller.ts`
- `<entidade>.module.ts`

Ex.: `src/api/user/`, `src/api/auth/`.

## Frontend (fluxo)

- **`/`** — Landing page com botões **Login** e **Cadastre-se** no topo à direita; texto sobre visualização de editais via scraping.
- **`/login`** — Tela de login; **`/login?cadastro`** abre já no modo “Criar conta”.
- **`/app`** — Área autenticada (editais); usuário logado que acessa `/` é redirecionado para `/app`.
- Logout redireciona para a landing (`/`).

## IA local (resumo e tags)

No `apps/scraper/.env`:

```bash
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:latest
AI_TIMEOUT_SECONDS=15
```

Com Ollama ativo:

```bash
ollama pull mistral:latest
```
