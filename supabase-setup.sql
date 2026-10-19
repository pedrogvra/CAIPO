-- SQL para criar as tabelas no projeto Supabase CAIPO
-- Execute este script no SQL Editor do Supabase.
-- ATENÇÃO: remove as tabelas legadas abaixo, incluindo todos os dados nelas.

DROP TABLE IF EXISTS questionario_opcoes;
DROP TABLE IF EXISTS questionario_respostas;
DROP TABLE IF EXISTS questionario_perguntas;
DROP TABLE IF EXISTS sessoes;
DROP TABLE IF EXISTS atividades_fixas;
DROP TABLE IF EXISTS configuracoes;
DROP TABLE IF EXISTS preferencias_sistema;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  foto_url TEXT,
  serie TEXT,
  objetivo TEXT,
  primeiro_acesso BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionario_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  ultima_pergunta_id UUID,
  pontuacao_atual INTEGER DEFAULT 0,
  concluido BOOLEAN DEFAULT FALSE,
  respostas_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cronogramas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  horario_acordar TEXT,
  horario_dormir TEXT,
  dias_disponiveis JSONB,
  periodo_preferido TEXT,
  tempo_max_sem_pausa INTEGER DEFAULT 50,
  varias_materias_por_dia BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cronogramas
  ADD COLUMN IF NOT EXISTS intervalo_entre_sessoes INTEGER NOT NULL DEFAULT 15;

CREATE TABLE IF NOT EXISTS cronograma_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,
  materia TEXT NOT NULL,
  dia_semana INTEGER NOT NULL,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
  tipo TEXT DEFAULT 'estudo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  peso_prioridade INTEGER DEFAULT 10,
  cor TEXT DEFAULT '#1E55A8',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pomodoro_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  materia_id UUID REFERENCES materias(id),
  materia_nome TEXT,
  duracao_planejada INTEGER NOT NULL,
  duracao_real INTEGER,
  status TEXT DEFAULT 'andamento',
  motivo_pausa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pomodoro_sessoes_usuario_status_created_idx
  ON pomodoro_sessoes (usuario_id, status, created_at);

CREATE OR REPLACE FUNCTION public.caipo_frequencia_sessoes_diarias(p_usuario_id UUID, p_time_zone TEXT)
RETURNS TABLE(data TEXT, tempo_total DOUBLE PRECISION, sessoes_concluidas DOUBLE PRECISION)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    TO_CHAR((sessao.created_at AT TIME ZONE p_time_zone)::DATE, 'YYYY-MM-DD') AS data,
    SUM(COALESCE(NULLIF(sessao.duracao_real, 0), sessao.duracao_planejada, 0))::DOUBLE PRECISION AS tempo_total,
    COUNT(*)::DOUBLE PRECISION AS sessoes_concluidas
  FROM public.pomodoro_sessoes AS sessao
  WHERE sessao.usuario_id = p_usuario_id
    AND sessao.status = 'concluida'
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.caipo_frequencia_sessoes_diarias(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caipo_frequencia_sessoes_diarias(UUID, TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS pomodoro_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  tempo_foco INTEGER DEFAULT 25,
  tempo_pausa_curta INTEGER DEFAULT 5,
  tempo_pausa_longa INTEGER DEFAULT 15,
  sessoes_antes_pausa_longa INTEGER DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ofensiva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  estudou BOOLEAN DEFAULT FALSE,
  streak_atual INTEGER DEFAULT 0,
  maior_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historico_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  humor TEXT,
  tempo_total INTEGER DEFAULT 0,
  sessoes_concluidas INTEGER DEFAULT 0,
  sessoes_interrompidas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversas_caipo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem_caipo TEXT NOT NULL,
  resposta_usuario TEXT,
  contexto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frequencia_perguntas (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  categoria TEXT NOT NULL,
  pilar_id INTEGER NOT NULL,
  pergunta TEXT NOT NULL,
  opcoes JSONB NOT NULL,
  respostas_caipo JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS frequencia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pergunta_id INTEGER NOT NULL,
  opcao_indice INTEGER NOT NULL,
  resposta_usuario TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frequencia_perguntas_usadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pergunta_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT frequencia_perguntas_usadas_usuario_pergunta_unique UNIQUE (usuario_id, pergunta_id)
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'usuarios'
      AND policyname = 'usuarios_select_public'
  ) THEN
    CREATE POLICY "usuarios_select_public" ON usuarios
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'usuarios'
      AND policyname = 'usuarios_insert_public'
  ) THEN
    CREATE POLICY "usuarios_insert_public" ON usuarios
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'usuarios'
      AND policyname = 'usuarios_update_owner'
  ) THEN
    CREATE POLICY "usuarios_update_owner" ON usuarios
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;
