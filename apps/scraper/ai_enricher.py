import json
import os
from typing import Any

import requests

AI_ENABLED = os.getenv('AI_ENABLED', 'false').lower() == 'true'
AI_PROVIDER = os.getenv('AI_PROVIDER', 'ollama').lower()
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434').rstrip('/')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'mistral:latest')
AI_TIMEOUT_SECONDS = float(os.getenv('AI_TIMEOUT_SECONDS', '15'))


def enriquecer_edital_com_ia(edital: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(edital)
    enriched.setdefault('resumo_ia', None)
    enriched.setdefault('tags_ia', [])

    if not AI_ENABLED or AI_PROVIDER != 'ollama':
        return enriched

    prompt = _build_prompt(edital)
    payload = {
        'model': OLLAMA_MODEL,
        'prompt': prompt,
        'stream': False,
        'format': 'json',
        'options': {
            'temperature': 0.2,
        },
    }

    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json=payload,
            timeout=AI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        content = response.json().get('response', '')
        parsed = _parse_response_json(content)
        enriched['resumo_ia'] = _normalize_summary(parsed.get('resumo'))
        enriched['tags_ia'] = _normalize_tags(parsed.get('tags'))
    except Exception as exc:
        print(f'Falha ao enriquecer edital com IA ({edital.get("url")}): {exc}')

    return enriched


def _build_prompt(edital: dict[str, Any]) -> str:
    titulo = (edital.get('titulo') or '').strip()
    descricao = (edital.get('descricao') or '').strip()
    orgao = (edital.get('orgao') or '').strip()
    data_inicio = (edital.get('data_inicio') or '').strip()
    data_fim = (edital.get('data_fim') or '').strip()

    return f'''
Você é um assistente que resume editais de pesquisa em português do Brasil.
Responda APENAS JSON válido no formato:
{{
  "resumo": "string curta com 2 a 4 frases",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}}

Regras:
- Resumo objetivo e sem inventar fatos.
- Máximo 5 tags, termos curtos e úteis para busca.
- Não use markdown.

Dados do edital:
Título: {titulo}
Órgão: {orgao}
Data de início: {data_inicio}
Data de fim: {data_fim}
Descrição: {descricao}
'''.strip()


def _parse_response_json(raw: str) -> dict[str, Any]:
    text = (raw or '').strip()
    if not text:
        return {}

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1 or end <= start:
            return {}
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return {}


def _normalize_summary(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    resumo = ' '.join(value.split())
    return resumo if resumo else None


def _normalize_tags(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    tags: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        tag = item.strip()
        if not tag:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        tags.append(tag)
        if len(tags) == 5:
            break
    return tags
