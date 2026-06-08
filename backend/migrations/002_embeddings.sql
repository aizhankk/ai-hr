-- Семантический матчинг резюме ↔ вакансия через pgvector.
-- Запускать один раз против рабочей БД (Supabase это поддерживает нативно).

-- 1. Расширение pgvector (тип vector + операторы расстояния)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Вектор-эмбеддинг описания вакансии.
--    1536 измерений = размерность модели OpenAI text-embedding-3-small.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Индекс для быстрого поиска ближайших по косинусному расстоянию.
--    HNSW не требует предварительного «обучения» (в отличие от ivfflat).
CREATE INDEX IF NOT EXISTS idx_job_postings_embedding
    ON job_postings USING hnsw (embedding vector_cosine_ops);
