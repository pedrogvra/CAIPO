import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';

// ─── Usuários ─────────────────────────────────────────────────────────────────
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senha_hash: text('senha_hash').notNull(),
  foto_url: text('foto_url'),
  serie: text('serie'),
  objetivo: text('objetivo'),
  primeiro_acesso: boolean('primeiro_acesso').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

// ─── Sessões de autenticação ───────────────────────────────────────────────────
export const sessoes = pgTable('sessoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// ─── Questionário ─────────────────────────────────────────────────────────────
export const questionario_perguntas = pgTable('questionario_perguntas', {
  id: uuid('id').primaryKey().defaultRandom(),
  texto: text('texto').notNull(),
  mensagem_caipo: text('mensagem_caipo'),
  tipo: text('tipo').notNull(), // 'unica' | 'multipla' | 'numero' | 'texto'
  etapa: integer('etapa').notNull(),
  ordem: integer('ordem').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const questionario_opcoes = pgTable('questionario_opcoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  pergunta_id: uuid('pergunta_id').notNull().references(() => questionario_perguntas.id, { onDelete: 'cascade' }),
  texto: text('texto').notNull(),
  peso: integer('peso').default(0),
  proxima_pergunta_id: uuid('proxima_pergunta_id'),
  created_at: timestamp('created_at').defaultNow(),
});

export const questionario_respostas = pgTable('questionario_respostas', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  pergunta_id: uuid('pergunta_id').notNull().references(() => questionario_perguntas.id),
  opcao_ids: jsonb('opcao_ids'), // array of option ids for multiple
  resposta_texto: text('resposta_texto'),
  pontuacao: integer('pontuacao').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const questionario_progresso = pgTable('questionario_progresso', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().unique().references(() => usuarios.id, { onDelete: 'cascade' }),
  ultima_pergunta_id: uuid('ultima_pergunta_id'),
  pontuacao_atual: integer('pontuacao_atual').default(0),
  concluido: boolean('concluido').default(false),
  respostas_json: jsonb('respostas_json'),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ─── Cronogramas ──────────────────────────────────────────────────────────────
export const cronogramas = pgTable('cronogramas', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  horario_acordar: text('horario_acordar'),
  horario_dormir: text('horario_dormir'),
  dias_disponiveis: jsonb('dias_disponiveis'), // array of 0-6 (sun-sat)
  periodo_preferido: text('periodo_preferido'), // 'manha'|'tarde'|'noite'
  tempo_max_sem_pausa: integer('tempo_max_sem_pausa').default(50),
  varias_materias_por_dia: boolean('varias_materias_por_dia').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const cronograma_sessoes = pgTable('cronograma_sessoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  cronograma_id: uuid('cronograma_id').notNull().references(() => cronogramas.id, { onDelete: 'cascade' }),
  materia: text('materia').notNull(),
  categoria: text('categoria'),
  dia_semana: integer('dia_semana').notNull(), // 0=Dom ... 6=Sab
  horario_inicio: text('horario_inicio').notNull(),
  horario_fim: text('horario_fim').notNull(),
  tipo: text('tipo').default('estudo'), // 'estudo'|'revisao'|'pausa'
  created_at: timestamp('created_at').defaultNow(),
});

export const atividades_fixas = pgTable('atividades_fixas', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  dias_semana: jsonb('dias_semana').notNull(), // array of 0-6
  horario_inicio: text('horario_inicio').notNull(),
  horario_fim: text('horario_fim').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const materias = pgTable('materias', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  peso_prioridade: integer('peso_prioridade').default(10), // 5|10|15|20|25
  cor: text('cor').default('#1E55A8'),
  created_at: timestamp('created_at').defaultNow(),
});

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
export const pomodoro_sessoes = pgTable('pomodoro_sessoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  materia_id: uuid('materia_id').references(() => materias.id),
  materia_nome: text('materia_nome'),
  duracao_planejada: integer('duracao_planejada').notNull(), // em minutos
  duracao_real: integer('duracao_real'),
  status: text('status').default('andamento'), // 'concluida'|'interrompida'|'andamento'
  motivo_pausa: text('motivo_pausa'),
  created_at: timestamp('created_at').defaultNow(),
});

export const pomodoro_config = pgTable('pomodoro_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().unique().references(() => usuarios.id, { onDelete: 'cascade' }),
  tempo_foco: integer('tempo_foco').default(25), // minutos
  tempo_pausa_curta: integer('tempo_pausa_curta').default(5),
  tempo_pausa_longa: integer('tempo_pausa_longa').default(15),
  sessoes_antes_pausa_longa: integer('sessoes_antes_pausa_longa').default(4),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ─── Progresso / Ofensiva ─────────────────────────────────────────────────────
export const ofensiva = pgTable('ofensiva', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  data: text('data').notNull(), // YYYY-MM-DD
  estudou: boolean('estudou').default(false),
  streak_atual: integer('streak_atual').default(0),
  maior_streak: integer('maior_streak').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const historico_diario = pgTable('historico_diario', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  data: text('data').notNull(), // YYYY-MM-DD
  humor: text('humor'), // 'bem'|'mais_ou_menos'|'mal'
  tempo_total: integer('tempo_total').default(0), // minutos
  sessoes_concluidas: integer('sessoes_concluidas').default(0),
  sessoes_interrompidas: integer('sessoes_interrompidas').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

// ─── Configurações ────────────────────────────────────────────────────────────
export const configuracoes = pgTable('configuracoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().unique().references(() => usuarios.id, { onDelete: 'cascade' }),
  tema: text('tema').default('dark'),
  notificacoes: boolean('notificacoes').default(true),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const preferencias_sistema = pgTable('preferencias_sistema', {
  id: uuid('id').primaryKey().defaultRandom(),
  chave: text('chave').notNull().unique(),
  valor: jsonb('valor'),
  tipo: text('tipo').default('string'),
  descricao: text('descricao'),
  ativo: boolean('ativo').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const conversas_caipo = pgTable('conversas_caipo', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  mensagem_caipo: text('mensagem_caipo').notNull(),
  resposta_usuario: text('resposta_usuario'),
  contexto: text('contexto'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const frequencia_perguntas = pgTable('frequencia_perguntas', {
  id: integer('id').primaryKey(),
  categoria: text('categoria').notNull(),
  pilar_id: integer('pilar_id').notNull(),
  pergunta: text('pergunta').notNull(),
  opcoes: jsonb('opcoes').notNull(),
  respostas_caipo: jsonb('respostas_caipo').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const frequencia_historico = pgTable('frequencia_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  pergunta_id: integer('pergunta_id').notNull().references(() => frequencia_perguntas.id),
  data: text('data').notNull(),
  opcao_indice: integer('opcao_indice').notNull(),
  resposta_usuario: text('resposta_usuario').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const frequencia_perguntas_usadas = pgTable('frequencia_perguntas_usadas', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  pergunta_id: integer('pergunta_id').notNull().references(() => frequencia_perguntas.id),
  created_at: timestamp('created_at').defaultNow(),
});
