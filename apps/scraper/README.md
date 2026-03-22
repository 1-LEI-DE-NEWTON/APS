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
