export interface DiagnosticoPergunta {
  id: string;
  texto: string;
  opcoes: string[];
  pontos: Record<string, number>;
}

export const DIAGNOSTICO_PERGUNTAS: DiagnosticoPergunta[] = [
  {
    id: 'q1',
    texto: 'Você costuma pensar sobre a forma como estuda?',
    opcoes: ['Sempre', 'Às vezes', 'Raramente', 'Nunca'],
    pontos: { 'Sempre': 10, 'Às vezes': 6, 'Raramente': 3, 'Nunca': 0 },
  },
  {
    id: 'q2',
    texto: 'Você sabe como aprende melhor?',
    opcoes: ['Sim', 'Mais ou menos', 'Não'],
    pontos: { 'Sim': 10, 'Mais ou menos': 5, 'Não': 0 },
  },
  {
    id: 'q3',
    texto: 'Você acredita que consegue aprender qualquer matéria se se dedicar?',
    opcoes: ['Sim, totalmente', 'Mais ou menos', 'Não'],
    pontos: { 'Sim, totalmente': 10, 'Mais ou menos': 5, 'Não': 0 },
  },
  {
    id: 'q4',
    texto: 'Qual método você sente que te ajuda MAIS?',
    opcoes: ['Revisão espaçada', 'Explicar pra alguém', 'Exercícios', 'Resumos', 'Videoaulas', 'Anotações'],
    pontos: { 'Revisão espaçada': 10, 'Explicar pra alguém': 8, 'Exercícios': 6, 'Resumos': 4, 'Videoaulas': 2, 'Anotações': 0 },
  },
  {
    id: 'q5',
    texto: 'Quando você não entende um conteúdo, o que costuma fazer?',
    opcoes: ['Procuro outra explicação', 'Peço ajuda', 'Faço exercícios', 'Releio', 'Deixo pra depois'],
    pontos: { 'Procuro outra explicação': 10, 'Peço ajuda': 8, 'Faço exercícios': 6, 'Releio': 4, 'Deixo pra depois': 0 },
  },
  {
    id: 'q6',
    texto: 'Você consegue perceber quando realmente aprendeu um conteúdo?',
    opcoes: ['Sim', 'Mais ou menos', 'Não'],
    pontos: { 'Sim': 10, 'Mais ou menos': 5, 'Não': 0 },
  },
  {
    id: 'q7',
    texto: 'Você costuma revisar conteúdos antigos?',
    opcoes: ['Sempre', 'Às vezes', 'Quase nunca', 'Nunca'],
    pontos: { 'Sempre': 10, 'Às vezes': 6, 'Quase nunca': 3, 'Nunca': 0 },
  },
  {
    id: 'q8',
    texto: 'Você consegue estudar sem distrações?',
    opcoes: ['Sim', 'Às vezes', 'Não'],
    pontos: { 'Sim': 10, 'Às vezes': 5, 'Não': 0 },
  },
  {
    id: 'q9',
    texto: 'Com que frequência se sente ansioso/frustrado/entediado ao estudar?',
    opcoes: ['Nunca', 'Raramente', 'Às vezes', 'Muito frequente'],
    pontos: { 'Nunca': 10, 'Raramente': 6, 'Às vezes': 3, 'Muito frequente': 0 },
  },
  {
    id: 'q10',
    texto: 'O que mais te motiva a estudar?',
    opcoes: ['Prazer em aprender', 'Aprender de verdade', 'Orgulho da família', 'Passar de ano', 'Notas'],
    pontos: { 'Prazer em aprender': 10, 'Aprender de verdade': 8, 'Orgulho da família': 6, 'Passar de ano': 4, 'Notas': 2 },
  },
];

export function calcularPontuacao(respostas: Record<string, string>) {
  return DIAGNOSTICO_PERGUNTAS.reduce((total, pergunta) => {
    const resposta = respostas[pergunta.id];
    return total + (pergunta.pontos[resposta] ?? 0);
  }, 0);
}

export function classificarDiagnostico(pontuacao: number) {
  if (pontuacao >= 70) return 'regulado';
  if (pontuacao >= 40) return 'parcialmente regulado';
  return 'pouco regulado';
}

export function buildResumoDiagnostico(classificacao: string) {
  if (classificacao === 'regulado') {
    return 'Analisando tudo que você me contou, dá pra ver que você já tem hábitos fortes e vamos montar um cronograma que aproveite essa base. Bora montar seu cronograma?';
  }
  if (classificacao === 'parcialmente regulado') {
    return 'Analisando tudo que você me contou, dá pra ver que você já tem algumas estratégias boas e a gente vai trabalhar nos pontos que ainda precisam de força. Bora montar seu cronograma?';
  }
  return 'Analisando tudo que você me contou, dá pra ver que você ainda está construindo seus hábitos de estudo. Vamos montar um cronograma leve e eficiente para você ganhar confiança. Bora lá?';
}
