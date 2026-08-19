import { Pergunta, Resposta, ClassificacaoPerfil } from '@/types/questionario';

export interface PerfilCalculado {
  classificacao: ClassificacaoPerfil;
  pontuacao: number;
  descricao: string;
  pontos_fortes: string[];
  habitos_desenvolver: string[];
}

export function calcularPerfil(
  pontuacao: number,
  respostas: Record<string, Resposta>,
  perguntas: Pergunta[]
): PerfilCalculado {
  let classificacao: ClassificacaoPerfil;
  let descricao: string;

  if (pontuacao >= 80) {
    classificacao = 'verde';
    descricao = 'Você já possui hábitos sólidos de estudo.';
  } else if (pontuacao >= 40) {
    classificacao = 'amarelo';
    descricao = 'Você possui hábitos medianos. Vamos melhorá-los juntos.';
  } else {
    classificacao = 'vermelho';
    descricao = 'Percebemos que você enfrenta dificuldades. Vamos construir esse hábito juntos.';
  }

  const pontos_fortes: string[] = [];
  const habitos_desenvolver: string[] = [];

  // Analyze responses to identify strengths and areas to improve
  Object.entries(respostas).forEach(([, resposta]) => {
    if (resposta.pontuacao >= 8) {
      pontos_fortes.push('Excelente metacognição e autoconhecimento sobre seus estudos');
    } else if (resposta.pontuacao >= 6) {
      pontos_fortes.push('Bons hábitos de revisão e prática de exercícios');
    } else if (resposta.pontuacao <= 0) {
      habitos_desenvolver.push('Criar e manter uma rotina consistente de estudos');
    } else if (resposta.pontuacao <= 2) {
      habitos_desenvolver.push('Reduzir distrações e melhorar o foco durante os estudos');
    }
  });

  // Deduplicate
  const unique_fortes = [...new Set(pontos_fortes)].slice(0, 3);
  const unique_desenvolver = [...new Set(habitos_desenvolver)].slice(0, 3);

  if (unique_fortes.length === 0) {
    if (classificacao === 'verde') {
      unique_fortes.push('Forte disciplina e consistência nos estudos', 'Boa organização do tempo');
    } else {
      unique_fortes.push('Consciência sobre suas dificuldades', 'Disposição para melhorar');
    }
  }

  if (unique_desenvolver.length === 0) {
    if (classificacao === 'verde') {
      unique_desenvolver.push('Explorar técnicas avançadas de revisão espaçada');
    } else {
      unique_desenvolver.push('Estabelecer horários fixos de estudo', 'Praticar técnicas de memorização');
    }
  }

  return { classificacao, pontuacao, descricao, pontos_fortes: unique_fortes, habitos_desenvolver: unique_desenvolver };
}
