import { ConversationResponse, EstadoAtual } from './types';
import { AREA_OPCOES, DESEMPENHO_ESCOLAR_OPTIONS, getSerieHistoricoMensagem, allowsMultipleAreas, OBJETIVO_OPTIONS, SERIE_OPTIONS } from './dadosIniciais';
import { DIAGNOSTICO_PERGUNTAS, classificarDiagnostico, buildResumoDiagnostico } from './diagnosticoInicial';
import { ROTINA_ATRAPALHA_OPCOES, ROTINA_NAO_OPCOES } from './rotina';
import { CHECKLIST_OPCOES } from './pomodoro';
import {
  MICRO_FOCUS_OPTIONS,
  MICRO_DIFICULDADE_OPTIONS,
  MICRO_BOM_OPTIONS,
  MICRO_MELHORAR_OPTIONS,
  SEMANAL_ESCALA_OPTIONS,
  SEMANAL_CRONOGRAMA_OPCOES,
  SEMANAL_RENDIMENTO_OPTIONS,
  SEMANAL_ATENCAO_OPTIONS,
  SEMANAL_ATRAPALHOU_OPTIONS,
  SEMANAL_MUDAR_OPTIONS,
} from './feedback';

function getSerieHistoricoPergunta(serie?: string): string {
  if (!serie || !SERIE_OPTIONS.includes(serie as typeof SERIE_OPTIONS[number])) {
    return 'Como foi o seu histórico escolar?';
  }
  return getSerieHistoricoMensagem(serie);
}

function needsAreaQuestion(desempenho?: string) {
  return Boolean(desempenho) && desempenho !== DESEMPENHO_ESCOLAR_OPTIONS[0];
}

function getNextDadosIniciaisStep(estado: EstadoAtual): ConversationResponse {
  const dados = estado.dados_iniciais || {};

  if (!dados.serie) {
    return {
      etapa: 'dados_iniciais',
      mensagem: 'Para começarmos, me diga: o que você está cursando atualmente?',
      tipo_input: 'single_select',
      opcoes: [...SERIE_OPTIONS],
      campo_salvo: 'dados_iniciais',
      pontua: false,
      proxima_etapa: 'dados_iniciais',
    };
  }

  if (!dados.desempenho_escolar) {
    return {
      etapa: 'dados_iniciais',
      mensagem: getSerieHistoricoPergunta(dados.serie),
      tipo_input: 'single_select',
      opcoes: [...DESEMPENHO_ESCOLAR_OPTIONS],
      campo_salvo: 'dados_iniciais',
      pontua: false,
      proxima_etapa: 'dados_iniciais',
    };
  }

  if (needsAreaQuestion(dados.desempenho_escolar) && !dados.area_dificuldade) {
    return {
      etapa: 'dados_iniciais',
      mensagem: 'Qual a área de maior dificuldade?',
      tipo_input: allowsMultipleAreas(dados.desempenho_escolar) ? 'multi_select' : 'single_select',
      opcoes: [...AREA_OPCOES],
      campo_salvo: 'dados_iniciais',
      pontua: false,
      proxima_etapa: 'dados_iniciais',
    };
  }

  if (dados.serie === '3º ano' && !dados.objetivo) {
    return {
      etapa: 'dados_iniciais',
      mensagem: 'Qual o seu objetivo para este ano?',
      tipo_input: 'single_select',
      opcoes: [...OBJETIVO_OPTIONS],
      campo_salvo: 'dados_iniciais',
      pontua: false,
      proxima_etapa: 'dados_iniciais',
    };
  }

  return {
    etapa: 'diagnostico_inicial',
    mensagem: 'Agora vamos para o Diagnóstico Inicial. Estas são as 10 perguntas que vão ajudar a entender como você regula seus estudos.',
    tipo_input: 'nenhum',
    campo_salvo: 'diagnostico_inicial',
    pontua: false,
    proxima_etapa: 'diagnostico_inicial',
  };
}

function getNextDiagnosticoStep(estado: EstadoAtual): ConversationResponse {
  const diagnostico = estado.diagnostico_inicial || { respostas: {} };
  const respostas = diagnostico.respostas || {};
  const answeredCount = Object.keys(respostas).length;

  if (answeredCount < DIAGNOSTICO_PERGUNTAS.length) {
    const pergunta = DIAGNOSTICO_PERGUNTAS[answeredCount];
    const mensagem = answeredCount === 0
      ? 'Show, já te conheço melhor agora! Só mais um pouquinho — algumas perguntas rápidas sobre como você estuda hoje, pra eu montar algo que realmente funcione pra você.\n\n' + pergunta.texto
      : pergunta.texto;

    return {
      etapa: 'diagnostico_inicial',
      mensagem,
      tipo_input: 'single_select',
      opcoes: pergunta.opcoes,
      campo_salvo: 'diagnostico_inicial',
      pontua: true,
      pontos_por_opcao: pergunta.pontos,
      proxima_etapa: 'diagnostico_inicial',
    };
  }

  const total = DIAGNOSTICO_PERGUNTAS.reduce((sum, pergunta) => {
    const resposta = respostas[pergunta.id];
    return sum + (pergunta.pontos[resposta] ?? 0);
  }, 0);
  const classificacao = classificarDiagnostico(total);

  return {
    etapa: 'resultado_diagnostico',
    mensagem: buildResumoDiagnostico(classificacao),
    tipo_input: 'nenhum',
    campo_salvo: 'diagnostico_inicial',
    pontua: false,
    proxima_etapa: 'criar_cronograma',
  };
}

function getNextRotinaDiariaStep(estado: EstadoAtual): ConversationResponse {
  const rotina = estado.rotina_diaria || {};

  if (!rotina.humor) {
    return {
      etapa: 'rotina_diaria',
      mensagem: 'Que bom que você voltou! Como você está se sentindo hoje?',
      tipo_input: 'single_select',
      opcoes: ['bem', 'mais ou menos', 'mal'],
      campo_salvo: 'rotina_diaria',
      pontua: false,
      proxima_etapa: 'rotina_diaria',
    };
  }

  if (rotina.humor === 'mais ou menos' && rotina.adaptar_rotina === undefined) {
    return {
      etapa: 'rotina_diaria',
      mensagem: 'Quer adaptar sua rotina para hoje?',
      tipo_input: 'single_select',
      opcoes: ['Sim', 'Não'],
      campo_salvo: 'rotina_diaria',
      pontua: false,
      proxima_etapa: 'rotina_diaria',
    };
  }

  if (rotina.humor === 'mal' && rotina.mal_ajuste === undefined) {
    return {
      etapa: 'rotina_diaria',
      mensagem: 'Podemos encontrar uma forma mais leve de estudar hoje.',
      tipo_input: 'single_select',
      opcoes: ['Sim, quero uma forma mais leve', 'Não, sigo o plano'],
      campo_salvo: 'rotina_diaria',
      pontua: false,
      proxima_etapa: 'rotina_diaria',
    };
  }

  if (!rotina.checklist) {
    return {
      etapa: 'rotina_diaria',
      mensagem: 'Vamos dar uma olhadinha no seu planejamento de hoje. Antes de começarmos, me confirme:',
      tipo_input: 'multi_select',
      opcoes: CHECKLIST_OPCOES,
      campo_salvo: 'rotina_diaria',
      pontua: false,
      proxima_etapa: 'rotina_diaria',
    };
  }

  if (!rotina.verificado) {
    return {
      etapa: 'rotina_diaria',
      mensagem: 'Agora está tudo pronto para podermos começar a focar.',
      tipo_input: 'nenhum',
      campo_salvo: 'rotina_diaria',
      pontua: false,
      proxima_etapa: 'micro_feedback_diario',
    };
  }

  return getNextMicroFeedbackStep(estado);
}

function getNextMicroFeedbackStep(estado: EstadoAtual): ConversationResponse {
  const feedback = estado.micro_feedback_diario || {};
  const perguntas = [
    {
      id: 'f1',
      texto: 'Como você avalia seu FOCO hoje?',
      tipo: 'single_select' as const,
      opcoes: MICRO_FOCUS_OPTIONS,
      campo_salvo: 'micro_feedback_diario',
    },
    {
      id: 'f2',
      texto: 'Qual foi a MAIOR DIFICULDADE que você encontrou hoje?',
      tipo: 'single_select' as const,
      opcoes: MICRO_DIFICULDADE_OPTIONS,
      campo_salvo: 'micro_feedback_diario',
    },
    {
      id: 'f3',
      texto: 'O que você ACHOU BOM hoje?',
      tipo: 'multi_select' as const,
      opcoes: MICRO_BOM_OPTIONS,
      campo_salvo: 'micro_feedback_diario',
    },
    {
      id: 'f4',
      texto: 'O que você gostaria de MELHORAR amanhã?',
      tipo: 'single_select' as const,
      opcoes: MICRO_MELHORAR_OPTIONS,
      campo_salvo: 'micro_feedback_diario',
    },
    {
      id: 'f5',
      texto: 'Em uma palavra, como você descreve seu dia de estudos hoje?',
      tipo: 'texto' as const,
      campo_salvo: 'micro_feedback_diario',
    },
  ];

  const answered = Object.keys(feedback).filter((key) => key.startsWith('f')).length;
  if (answered < perguntas.length) {
    const pergunta = perguntas[answered];
    return {
      etapa: 'micro_feedback_diario',
      mensagem: pergunta.texto,
      tipo_input: pergunta.tipo,
      opcoes: pergunta.tipo === 'texto' ? undefined : pergunta.opcoes,
      campo_salvo: pergunta.campo_salvo,
      pontua: false,
      proxima_etapa: 'micro_feedback_diario',
    };
  }

  return {
    etapa: 'micro_feedback_diario',
    mensagem: 'Obrigado pelo feedback! 🧠 Já anotei tudo. Com base no que você me disse, amanhã vou tentar ajustar sua rotina para ficar mais leve e eficiente.',
    tipo_input: 'nenhum',
    campo_salvo: 'micro_feedback_diario',
    pontua: false,
    proxima_etapa: 'macro_feedback_semanal',
  };
}

function getNextMacroFeedbackStep(estado: EstadoAtual): ConversationResponse {
  const feedback = estado.macro_feedback_semanal || {};
  const perguntas = [
    {
      id: 'm1',
      texto: 'Em uma escala de 0 a 10, como você avalia sua semana de estudos?',
      tipo: 'escala' as const,
      opcoes: SEMANAL_ESCALA_OPTIONS,
      campo_salvo: 'macro_feedback_semanal',
    },
    {
      id: 'm2',
      texto: 'Você conseguiu seguir o cronograma que criamos?',
      tipo: 'single_select' as const,
      opcoes: SEMANAL_CRONOGRAMA_OPCOES,
      campo_salvo: 'macro_feedback_semanal',
    },
    {
      id: 'm3',
      texto: 'Qual matéria você sente que RENDEU MAIS esta semana?',
      tipo: 'single_select' as const,
      opcoes: SEMANAL_RENDIMENTO_OPTIONS,
      campo_salvo: 'macro_feedback_semanal',
    },
    {
      id: 'm4',
      texto: 'Qual matéria você sente que PRECISA DE MAIS ATENÇÃO na próxima semana?',
      tipo: 'single_select' as const,
      opcoes: SEMANAL_ATENCAO_OPTIONS,
      campo_salvo: 'macro_feedback_semanal',
    },
    {
      id: 'm5',
      texto: 'O que MAIS ATRAPALHOU seus estudos nesta semana?',
      tipo: 'multi_select' as const,
      opcoes: SEMANAL_ATRAPALHOU_OPTIONS,
      campo_salvo: 'macro_feedback_semanal',
    },
    {
      id: 'm6',
      texto: 'Qual foi a sua MAIOR CONQUISTA nesta semana?',
      tipo: 'texto' as const,
      campo_salvo: 'macro_feedback_semanal',
    },
    {
      id: 'm7',
      texto: 'Para a semana que vem, você gostaria de MUDAR ALGO?',
      tipo: 'single_select' as const,
      opcoes: SEMANAL_MUDAR_OPTIONS,
      campo_salvo: 'macro_feedback_semanal',
    },
  ];

  const answered = Object.keys(feedback).filter((key) => key.startsWith('m')).length;
  if (answered < perguntas.length) {
    const pergunta = perguntas[answered];
    return {
      etapa: 'macro_feedback_semanal',
      mensagem: pergunta.texto,
      tipo_input: pergunta.tipo,
      opcoes: pergunta.tipo === 'texto' ? undefined : pergunta.opcoes,
      campo_salvo: pergunta.campo_salvo,
      pontua: false,
      proxima_etapa: 'macro_feedback_semanal',
    };
  }

  return {
    etapa: 'macro_feedback_semanal',
    mensagem: 'Uau! Que semana! Muito obrigado por compartilhar isso comigo. Com base no seu feedback, já estou ajustando seu cronograma para a próxima semana. Vamos com tudo na próxima semana?',
    tipo_input: 'nenhum',
    campo_salvo: 'macro_feedback_semanal',
    pontua: false,
    proxima_etapa: 'finalizado',
  };
}

export function getNextConversation(estado: EstadoAtual): ConversationResponse {
  if (!estado.apresentacao_concluida) {
    return {
      etapa: 'apresentacao',
      mensagem: `Olá! Meu nome é Caipo, prazer em conhecer${estado.nome ? ` ${estado.nome.split(' ')[0]}` : ''}! Estou muito ansioso para poder te ajudar. Antes de começarmos, gostaria de fazer algumas perguntinhas!`,
      tipo_input: 'nenhum',
      campo_salvo: 'apresentacao',
      pontua: false,
      proxima_etapa: 'dados_iniciais',
    };
  }

  const dadosIniciais = estado.dados_iniciais;
  const diagnostico = estado.diagnostico_inicial;

  if (!dadosIniciais || !dadosIniciais.serie || !dadosIniciais.desempenho_escolar || (dadosIniciais.serie === '3º ano' && !dadosIniciais.objetivo) || (needsAreaQuestion(dadosIniciais.desempenho_escolar) && !dadosIniciais.area_dificuldade)) {
    return getNextDadosIniciaisStep(estado);
  }

  if (!diagnostico || !diagnostico.respostas || Object.keys(diagnostico.respostas).length < DIAGNOSTICO_PERGUNTAS.length) {
    return getNextDiagnosticoStep(estado);
  }

  return {
    etapa: 'feedback_pendente',
    mensagem: 'Parabéns! Seu diagnóstico inicial foi concluído. Agora vou analisar seu perfil e te mostrar o feedback personalizado.',
    tipo_input: 'nenhum',
    campo_salvo: 'finalizado',
    pontua: false,
    proxima_etapa: 'feedback',
  };
}
