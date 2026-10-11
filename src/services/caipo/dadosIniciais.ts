export const SERIE_OPTIONS = ['1º ano', '2º ano', '3º ano'] as const;

const DESEMPENHO_ESCOLAR_OPTIONS_LEGADAS = [
  'Me considero uma aluna(o) boa, sempre tirei notas boas, nunca fiquei de recuperação e não tinha dificuldade em nenhuma área.',
  'Me considero uma aluna(o) mediana, costumava tirar notas na média, mas sempre tive dificuldades em áreas específicas.',
  'Me considero uma aluna(o) abaixo da média, costumava tirar notas não tão boas, mas mesmo assim passava sem recuperação.',
  'Me considero uma aluna(o) ruim, costumava tirar muitas notas vermelhas e acabava indo para muitas recuperações.',
] as const;

export const DESEMPENHO_ESCOLAR_OPTIONS = [
  'Tenho um bom desempenho escolar: costumo tirar boas notas, não tenho dificuldade nas matérias e nunca precisei fazer recuperação.',
  'Meu desempenho escolar é mediano: costumo tirar notas próximas da média, mas tenho dificuldade em algumas matérias.',
  'Tenho dificuldade em algumas matérias: minhas notas nem sempre são boas, mas geralmente consigo passar sem recuperação.',
  'Tenho bastante dificuldade nas matérias: tiro notas baixas e preciso fazer recuperação com frequência.',
] as const;

export const AREA_OPCOES = ['Natureza', 'Exatas', 'Linguagem', 'Humanas'] as const;
export const OBJETIVO_OPTIONS = ['ENEM', 'Vestibular', 'Faculdade', 'Trabalho', 'Ainda não sei'] as const;

export function getSerieHistoricoMensagem(serie: string) {
  switch (serie) {
    case '1º ano':
      return 'Que legal! Você está começando o ensino médio. Pode me dizer como foi o seu ensino fundamental?';
    case '2º ano':
      return 'Que ótimo! O segundo ano é uma ótima oportunidade para fortalecer seus hábitos e dizem por aí que é mais complicado. Como você considera que foi o seu primeiro ano?';
    case '3º ano':
      return 'Uau! Então este é um ano muito importante para você. Não se preocupe, você não precisa dar conta de tudo de uma vez. Vamos organizar um passo de cada vez. Como você considera que está indo para o terceirão?';
    default:
      return 'Como foi o seu histórico escolar?';
  }
}

export function needsAreaQuestion(desempenho: string) {
  return desempenho !== DESEMPENHO_ESCOLAR_OPTIONS[0]
    && desempenho !== DESEMPENHO_ESCOLAR_OPTIONS_LEGADAS[0];
}

export function allowsMultipleAreas(desempenho: string) {
  return desempenho === DESEMPENHO_ESCOLAR_OPTIONS[3]
    || desempenho === DESEMPENHO_ESCOLAR_OPTIONS_LEGADAS[3];
}
