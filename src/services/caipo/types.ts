export type TipoInput = 'single_select' | 'multi_select' | 'texto' | 'numero' | 'escala' | 'nenhum';

export interface ConversationResponse {
  etapa: string;
  mensagem: string;
  tipo_input: TipoInput;
  opcoes?: readonly string[];
  campo_salvo: string;
  pontua: boolean;
  pontos_por_opcao?: Record<string, number>;
  proxima_etapa: string;
}

export interface DadosIniciaisState {
  serie?: string;
  desempenho_escolar?: string;
  area_dificuldade?: string[];
  quantidade_materias?: number;
  objetivo?: string;
}

export interface DiagnosticoInicialState {
  respostas?: Record<string, string>;
  pontuacao_total?: number;
  classificacao?: string;
}

export interface HistoricoRotinaState {
  criou_rotina?: string;
  conseguiu_seguir?: string;
  o_que_atrapalha?: string[];
  porque_nao?: string;
}

export interface RotinaDiariaState {
  humor?: string;
  adaptar_rotina?: string;
  mal_ajuste?: string;
  checklist?: string[];
  verificado?: boolean;
}

export interface EstadoAtual {
  salvo_para_depois?: boolean;
  nome?: string;
  apresentacao_concluida?: boolean;
  dados_iniciais?: DadosIniciaisState;
  diagnostico_inicial?: DiagnosticoInicialState;
  historico_rotina?: HistoricoRotinaState;
  criacao_cronograma?: boolean;
  rotina_diaria?: RotinaDiariaState;
  micro_feedback_diario?: Record<string, unknown>;
  macro_feedback_semanal?: Record<string, unknown>;
}
