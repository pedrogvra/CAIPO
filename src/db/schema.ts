import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  real,
  serial,
  index,
  uniqueIndex,
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
  intervalo_entre_sessoes: integer('intervalo_entre_sessoes').notNull().default(15),
  varias_materias_por_dia: boolean('varias_materias_por_dia').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const cronograma_sessoes = pgTable('cronograma_sessoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  cronograma_id: uuid('cronograma_id').notNull().references(() => cronogramas.id, { onDelete: 'cascade' }),
  materia: text('materia').notNull(),
  dia_semana: integer('dia_semana').notNull(), // 0=Dom ... 6=Sab
  horario_inicio: text('horario_inicio').notNull(),
  horario_fim: text('horario_fim').notNull(),
  tipo: text('tipo').default('estudo'), // 'estudo'|'revisao'|'pausa'
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
export const pomodoro_sessoes = pgTable(
  'pomodoro_sessoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    materia_id: uuid('materia_id').references(() => materias.id),
    materia_nome: text('materia_nome'),
    duracao_planejada: integer('duracao_planejada').notNull(), // em minutos
    duracao_real: integer('duracao_real'),
    status: text('status').default('andamento'), // 'concluida'|'interrompida'|'andamento'
    motivo_pausa: text('motivo_pausa'),
    created_at: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    frequenciaUsuarioStatusCreatedIdx: index('pomodoro_sessoes_usuario_status_created_idx')
      .on(table.usuario_id, table.status, table.created_at),
  }),
);

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
  id: serial('id').primaryKey(),
  categoria: text('categoria').notNull(),
  pilar_id: integer('pilar_id').notNull(),
  pergunta: text('pergunta').notNull(),
  opcoes: jsonb('opcoes').notNull(),
  respostas_caipo: jsonb('respostas_caipo').notNull(),
});

export const frequencia_historico = pgTable('frequencia_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  pergunta_id: integer('pergunta_id').notNull(),
  opcao_indice: integer('opcao_indice').notNull(),
  resposta_usuario: text('resposta_usuario').notNull(),
  data: text('data').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const frequencia_perguntas_usadas = pgTable(
  'frequencia_perguntas_usadas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_id: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    pergunta_id: integer('pergunta_id').notNull(),
    created_at: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    usuarioPerguntaUnique: uniqueIndex('frequencia_perguntas_usadas_usuario_pergunta_unique').on(
      table.usuario_id,
      table.pergunta_id,
    ),
  }),
);
