-- Função para buscar roteiros sem áudio contornando RLS
-- Execute este SQL no seu Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_roteiros_sem_audio(canal_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  titulo TEXT,
  roteiro TEXT,
  canal_id SMALLINT,
  audio_path TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Esta linha permite bypass de RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.titulo,
    r.roteiro,
    r.canal_id,
    r.audio_path,
    r.created_at
  FROM roteiros r
  WHERE r.canal_id = canal_param
    AND (r.audio_path IS NULL OR r.audio_path = '');
END;
$$;

-- Dar permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION get_roteiros_sem_audio(INTEGER) TO authenticated;

-- Ou, alternativamente, desabilitar RLS temporariamente para esta tabela:
-- ALTER TABLE roteiros DISABLE ROW LEVEL SECURITY;

-- Ou criar uma política mais permissiva:
-- CREATE POLICY "Allow read access for authenticated users" ON roteiros
--   FOR SELECT TO authenticated USING (true);