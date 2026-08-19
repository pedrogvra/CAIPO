export interface Cronograma {
  id: string;
  usuario_id: string;
  nome: string;
  horario_acordar?: string | null;
  horario_dormir?: string | null;
  dias_disponiveis?: number[] | null;
  periodo_preferido?: string | null;
  tempo_max_sem_pausa?: number | null;
  varias_materias_por_dia?: boolean | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CronogramaSessao {
  id: string;
  cronograma_id: string;
  materia: string;
  categoria?: string | null;
  dia_semana: number;
  horario_inicio: string;
  horario_fim: string;
  tipo?: string | null;
}

export interface AtividadeFixa {
  id: string;
  usuario_id: string;
  nome: string;
  dias_semana: number[];
  horario_inicio: string;
  horario_fim: string;
}

export interface Materia {
  id: string;
  usuario_id: string;
  nome: string;
  peso_prioridade: number;
  cor: string;
}

export interface CronogramaCompleto extends Cronograma {
  sessoes: CronogramaSessao[];
}
