export interface PomodoroConfig {
  id?: string;
  usuario_id: string;
  tempo_foco: number;
  tempo_pausa_curta: number;
  tempo_pausa_longa: number;
  sessoes_antes_pausa_longa: number;
}

export interface PomodoroSessao {
  id: string;
  usuario_id: string;
  materia_id?: string | null;
  materia_nome?: string | null;
  duracao_planejada: number;
  duracao_real?: number | null;
  status: 'andamento' | 'concluida' | 'interrompida';
  motivo_pausa?: string | null;
  created_at?: Date | null;
}

export type PomodoroEstado = 'idle' | 'focus' | 'pausa_curta' | 'pausa_longa' | 'checklist';
