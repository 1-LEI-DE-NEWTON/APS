# Scraper Service (Python)

Servico Python reaproveitado do projeto original, agora exposto via FastAPI para integracao com o backend Nest.

## Endpoints

- `GET /health`
- `GET /editais`
- `GET /editais/{id}`
- `POST /coletas/executar`
- `GET /coletas/status/latest`

## Execucao local

```bash
cd apps/scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Variaveis de ambiente

Veja `.env.example`.

## IA local (opcional)

O scraper pode enriquecer cada edital com:

- `resumo_ia` (resumo curto)
- `tags_ia` (ate 5 tags)

Configuracao:

1. Suba o Ollama localmente.
2. Baixe o modelo:

```bash
ollama pull granite3-dense:2b
```

3. No `.env`, ajuste:

```bash
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=granite3-dense:2b
AI_TIMEOUT_SECONDS=15
```
