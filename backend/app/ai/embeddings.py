"""Текстовые эмбеддинги для семантического матчинга резюме ↔ вакансия.

Используется модель OpenAI ``text-embedding-3-small`` (1536 измерений) —
дёшево и достаточно точно. Вектор хранится в Postgres-колонке типа ``vector``
(расширение pgvector) и сравнивается по косинусному расстоянию.
"""

from __future__ import annotations

import os
from typing import List

from app.exceptions import EDSServiceException

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIM = 1536
# Лимит модели ~8191 токенов; режем по символам с запасом.
_MAX_CHARS = 8000


def _require_client():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise EDSServiceException(
            code="OPENAI_NOT_CONFIGURED",
            message_ru="OPENAI_API_KEY не настроен",
            message_kz="OPENAI_API_KEY орнатылмаған",
            message_en="OpenAI API key is not configured",
        )
    from openai import OpenAI

    return OpenAI(api_key=api_key)


def embed_text(text: str) -> List[float]:
    """Возвращает вектор-эмбеддинг для текста (синхронно, блокирующе).

    Вызывать через ``asyncio.to_thread`` из async-кода.
    """
    return embed_texts([text])[0]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Векторизует список текстов одним запросом к OpenAI.

    Пустые строки получают нулевой вектор и не отправляются в API.
    """
    cleaned = [(t or "").strip()[:_MAX_CHARS] for t in texts]
    non_empty = [(i, t) for i, t in enumerate(cleaned) if t]

    result: List[List[float]] = [[0.0] * EMBEDDING_DIM for _ in texts]
    if not non_empty:
        return result

    client = _require_client()
    resp = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[t for _, t in non_empty],
    )
    for (idx, _), item in zip(non_empty, resp.data):
        result[idx] = list(item.embedding)
    return result


def to_pgvector(vector: List[float]) -> str:
    """Сериализует список чисел в литерал pgvector: ``[0.1,0.2,...]``.

    asyncpg не знает тип ``vector`` нативно, поэтому передаём строкой
    и кастуем в SQL через ``$1::vector``.
    """
    return "[" + ",".join(f"{x:.7f}" for x in vector) + "]"
