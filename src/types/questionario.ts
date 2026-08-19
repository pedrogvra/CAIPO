export interface Pergunta {
  id: string;
  texto: string;
  mensagem_caipo?: string | null;
  tipo: 'unica' | 'multipla' | 'numero' | 'texto';
  etapa: number;
  ordem: number;
  opcoes?: Opcao[];
}

export interface Opcao {
  id: string;
  pergunta_id: string;
  texto: string;
  peso: number;
  proxima_pergunta_id?: string | null;
}

export interface Resposta {
  pergunta_id: string;
  opcao_ids?: string[];
  resposta_texto?: string;
  pontuacao: number;
}

export interface Progresso {
  usuario_id: string;
  ultima_pergunta_id?: string | null;
  pontuacao_atual: number;
  concluido: boolean;
  respostas_json?: Record<string, Resposta> | null;
}

export type ClassificacaoPerfil = 'verde' | 'amarelo' | 'vermelho';

export interface Perfil {
  classificacao: ClassificacaoPerfil;
  pontuacao: number;
  descricao: string;
  pontos_fortes: string[];
  habitos_desenvolver: string[];
}
