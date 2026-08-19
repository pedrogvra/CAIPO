-- Tabelas para o Supabase / PostgreSQL
-- 1) Usuários
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

-- 2) Sessões de autenticação
CREATE TABLE IF NOT EXISTS sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Questionário
CREATE TABLE IF NOT EXISTS questionario_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto TEXT NOT NULL,
  mensagem_caipo TEXT,
  tipo TEXT NOT NULL,
  etapa INTEGER NOT NULL,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionario_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id UUID NOT NULL REFERENCES questionario_perguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  peso INTEGER DEFAULT 0,
  proxima_pergunta_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionario_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES questionario_perguntas(id),
  opcao_ids JSONB,
  resposta_texto TEXT,
  pontuacao INTEGER DEFAULT 0,
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

-- 4) Cronograma
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

CREATE TABLE IF NOT EXISTS cronograma_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,
  materia TEXT NOT NULL,
  categoria TEXT,
  dia_semana INTEGER NOT NULL,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
  tipo TEXT DEFAULT 'estudo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cronogramas_usuario_id_idx ON cronogramas(usuario_id);
CREATE INDEX IF NOT EXISTS cronograma_sessoes_cronograma_id_idx ON cronograma_sessoes(cronograma_id);

ALTER TABLE cronograma_sessoes ADD COLUMN IF NOT EXISTS categoria TEXT;

CREATE TABLE IF NOT EXISTS atividades_fixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dias_semana JSONB NOT NULL,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS materias_usuario_id_idx ON materias(usuario_id);

-- 5) Pomodoro
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

CREATE INDEX IF NOT EXISTS pomodoro_sessoes_usuario_id_idx ON pomodoro_sessoes(usuario_id);

CREATE TABLE IF NOT EXISTS pomodoro_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  tempo_foco INTEGER DEFAULT 25,
  tempo_pausa_curta INTEGER DEFAULT 5,
  tempo_pausa_longa INTEGER DEFAULT 15,
  sessoes_antes_pausa_longa INTEGER DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) Progresso / Ofensiva
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

CREATE INDEX IF NOT EXISTS historico_diario_usuario_data_idx ON historico_diario(usuario_id, data);

-- 7) Configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  tema TEXT DEFAULT 'dark',
  notificacoes BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8) Preferências do sistema
CREATE TABLE IF NOT EXISTS preferencias_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor JSONB,
  tipo TEXT DEFAULT 'string',
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9) Conversas do Caipô
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
  id INTEGER PRIMARY KEY,
  categoria TEXT NOT NULL,
  pilar_id INTEGER NOT NULL,
  pergunta TEXT NOT NULL,
  opcoes JSONB NOT NULL,
  respostas_caipo JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frequencia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pergunta_id INTEGER NOT NULL REFERENCES frequencia_perguntas(id),
  data DATE NOT NULL,
  opcao_indice INTEGER NOT NULL,
  resposta_usuario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS frequencia_historico_usuario_data_idx
  ON frequencia_historico(usuario_id, data);

CREATE UNIQUE INDEX IF NOT EXISTS frequencia_historico_unique_answer_idx
  ON frequencia_historico(usuario_id, pergunta_id, data);

CREATE TABLE IF NOT EXISTS frequencia_perguntas_usadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pergunta_id INTEGER NOT NULL REFERENCES frequencia_perguntas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, pergunta_id)
);

-- Dados iniciais de exemplo para preferências do sistema
INSERT INTO preferencias_sistema (chave, valor, tipo, descricao, ativo)
VALUES
  ('tema_padrao', '"dark"'::jsonb, 'string', 'Tema visual padrão do sistema', TRUE),
  ('notificacoes_ativas', 'true'::jsonb, 'boolean', 'Habilitar notificações por padrão', TRUE),
  ('pomodoro_tempo_foco', '25'::jsonb, 'number', 'Tempo padrão de foco do Pomodoro', TRUE),
  ('pomodoro_pausa_curta', '5'::jsonb, 'number', 'Tempo padrão de pausa curta', TRUE),
  ('pomodoro_pausa_longa', '15'::jsonb, 'number', 'Tempo padrão de pausa longa', TRUE)
ON CONFLICT (chave) DO NOTHING;
