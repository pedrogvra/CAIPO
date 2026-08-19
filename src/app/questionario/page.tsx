'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import caipoBoneco from '../../../assets/Caipo boneco.svg';

import type { ConversationResponse, EstadoAtual } from '@/services/caipo/types';
import { calcularPontuacao } from '@/services/caipo/diagnosticoInicial';
import { needsAreaQuestion } from '@/services/caipo/dadosIniciais';

type CaipoProgress = {
  usuario_id: string;
  ultima_pergunta_id: string | null;
  pontuacao_atual: number;
  concluido: boolean;
  respostas_json: EstadoAtual | null;
  updated_at: string;
};

const ETAPA_LABELS: Record<string, { stage: number; label: string }> = {
  apresentacao: { stage: 1, label: 'Boas-vindas' },
  dados_iniciais: { stage: 1, label: 'Dados iniciais' },
  diagnostico_inicial: { stage: 2, label: 'Diagnóstico inicial' },
  resultado_diagnostico: { stage: 3, label: 'Resultado do diagnóstico' },
  cronograma: { stage: 3, label: 'Preparação do cronograma' },
  rotina_diaria: { stage: 5, label: 'Rotina diária' },
  micro_feedback_diario: { stage: 6, label: 'Micro feedback' },
  macro_feedback_semanal: { stage: 7, label: 'Macro feedback' },
  feedback_pendente: { stage: 7, label: 'Feedback' },
  finalizado: { stage: 7, label: 'Finalizado' },
};

function getProgressPercentage(conversation: ConversationResponse | null, estadoAtual: EstadoAtual): number {
  if (!conversation) return 0;

  const dados = estadoAtual.dados_iniciais || {};
  const dadosConcluidos = Object.keys(dados).filter((key) => {
    if (key === 'area_dificuldade') return Array.isArray(dados.area_dificuldade) && dados.area_dificuldade.length > 0;
    return dados[key as keyof typeof dados] !== undefined && dados[key as keyof typeof dados] !== null && String(dados[key as keyof typeof dados]).length > 0;
  }).length;

  const diagnosticoRespondido = Object.keys(estadoAtual.diagnostico_inicial?.respostas || {}).length;

  switch (conversation.etapa) {
    case 'apresentacao':
      return 5;
    case 'dados_iniciais':
      return Math.min(35, 10 + dadosConcluidos * 8);
    case 'diagnostico_inicial':
      return Math.min(90, 35 + diagnosticoRespondido * 6);
    case 'resultado_diagnostico':
      return 90;
    case 'feedback_pendente':
      return 100;
    case 'finalizado':
      return 100;
    default:
      return 100;
  }
}

function normalizeAnswerValue(value: string | string[] | number | undefined) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.trim();
  return value;
}

function getCurrentDiagnosticoId(estadoAtual: EstadoAtual) {
  const answered = Object.keys(estadoAtual.diagnostico_inicial?.respostas || {}).length;
  return `q${answered + 1}`;
}

function updateEstadoAtualWithAnswer(
  conversation: ConversationResponse,
  value: string | string[] | number | undefined,
  estadoAtual: EstadoAtual,
): EstadoAtual {
  const nextState: EstadoAtual = { ...estadoAtual };

  if (conversation.campo_salvo === 'apresentacao') {
    return { ...nextState, apresentacao_concluida: true };
  }

  if (conversation.campo_salvo === 'criacao_cronograma') {
    return { ...nextState, criacao_cronograma: true };
  }

  if (conversation.campo_salvo === 'dados_iniciais') {
    const dados = { ...(nextState.dados_iniciais || {}) };
    if (!dados.serie) {
      dados.serie = normalizeAnswerValue(value) as string;
    } else if (!dados.desempenho_escolar) {
      dados.desempenho_escolar = normalizeAnswerValue(value) as string;
    } else if (needsAreaQuestion(dados.desempenho_escolar || '') && !dados.area_dificuldade) {
      dados.area_dificuldade = Array.isArray(value) ? value : [normalizeAnswerValue(value) as string];
    } else if (dados.serie === '3º ano' && !dados.objetivo) {
      dados.objetivo = normalizeAnswerValue(value) as string;
    }
    return { ...nextState, dados_iniciais: dados };
  }

  if (conversation.campo_salvo === 'diagnostico_inicial') {
    const diagnostico = { ...(nextState.diagnostico_inicial || { respostas: {} }) };
    diagnostico.respostas = { ...(diagnostico.respostas || {}) };
    const questionId = getCurrentDiagnosticoId(nextState);
    if (questionId && typeof value === 'string') {
      diagnostico.respostas[questionId] = value;
    }
    return { ...nextState, diagnostico_inicial: diagnostico };
  }

  if (conversation.campo_salvo === 'historico_rotina') {
    return nextState;
  }

  if (conversation.campo_salvo === 'rotina_diaria') {
    const rotina = { ...(nextState.rotina_diaria || {}) };
    if (!rotina.humor) {
      rotina.humor = normalizeAnswerValue(value) as string;
    } else if (rotina.humor === 'mais ou menos' && rotina.adaptar_rotina === undefined) {
      rotina.adaptar_rotina = normalizeAnswerValue(value) as string;
    } else if (rotina.humor === 'mal' && rotina.mal_ajuste === undefined) {
      rotina.mal_ajuste = normalizeAnswerValue(value) as string;
    } else if (!rotina.checklist) {
      rotina.checklist = Array.isArray(value) ? value : [normalizeAnswerValue(value) as string];
    } else if (!rotina.verificado) {
      rotina.verificado = true;
    }
    return { ...nextState, rotina_diaria: rotina };
  }

  if (conversation.campo_salvo === 'micro_feedback_diario') {
    const feedback = { ...(nextState.micro_feedback_diario || {}) };
    const questionId = `f${Object.keys(nextState.micro_feedback_diario || {}).filter((key) => key.startsWith('f')).length + 1}`;
    if (questionId) {
      feedback[questionId] = value;
    }
    return { ...nextState, micro_feedback_diario: feedback };
  }

  if (conversation.campo_salvo === 'macro_feedback_semanal') {
    const feedback = { ...(nextState.macro_feedback_semanal || {}) };
    const questionId = `m${Object.keys(nextState.macro_feedback_semanal || {}).filter((key) => key.startsWith('m')).length + 1}`;
    if (questionId) {
      feedback[questionId] = value;
    }
    return { ...nextState, macro_feedback_semanal: feedback };
  }

  return nextState;
}

export default function QuestionarioPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();

  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [estadoAtual, setEstadoAtual] = useState<EstadoAtual>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const pontuacao = calcularPontuacao(estadoAtual.diagnostico_inicial?.respostas || {});
  const progresso = Math.round(getProgressPercentage(conversation, estadoAtual));
  const etapaLabel = conversation ? ETAPA_LABELS[conversation.etapa]?.label ?? 'Em andamento' : 'Carregando';

  useEffect(() => {
    if (!loading && !usuario) {
      router.push('/login');
    }
  }, [usuario, loading, router]);

  const fetchConversation = async (estado: EstadoAtual) => {
    const response = await fetch('/api/caipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_atual: estado }),
    });

    if (!response.ok) {
      throw new Error('Não foi possível carregar a conversa.');
    }

    return response.json() as Promise<ConversationResponse>;
  };

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch('/api/questionario/progresso');
        const data = await response.json();

        if (data.progresso) {
          const p = data.progresso as CaipoProgress;
          if (p.concluido) {
            router.push('/feedback');
            return;
          }
          const estado = p.respostas_json ?? {};
          setEstadoAtual(estado);
          const conversationData = await fetchConversation(estado);
          setConversation(conversationData);
        } else {
          const conversationData = await fetchConversation({});
          setConversation(conversationData);
        }
      } catch (err) {
        console.error('Erro ao carregar progresso ou conversa:', err);
        setApiError('Não foi possível carregar o questionário. Tente novamente.');
      } finally {
        setLoadingState(false);
      }
    };

    if (!loading && usuario && loadingState) {
      loadProgress();
    }
  }, [usuario, loading, loadingState, router]);

  const saveProgress = async (ultimaPerguntaId: string | null, estado: EstadoAtual, concluido = false) => {
    const response = await fetch('/api/questionario/progresso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ultima_pergunta_id: ultimaPerguntaId,
        pontuacao_atual: calcularPontuacao(estado.diagnostico_inicial?.respostas || {}),
        concluido,
        respostas_json: estado,
      }),
    });

    if (!response.ok) {
      throw new Error('Não foi possível salvar o progresso.');
    }
  };

  const getAnswerValue = () => {
    if (!conversation) return undefined;
    if (conversation.tipo_input === 'nenhum') return undefined;
    if (conversation.tipo_input === 'numero') return numberInput;
    if (conversation.tipo_input === 'texto') return textInput.trim();
    if (conversation.tipo_input === 'multi_select') return selectedOptions;
    return selectedOptions[0] ?? undefined;
  };

  const canProceed = () => {
    if (!conversation) return false;
    if (conversation.tipo_input === 'nenhum') return true;
    if (conversation.tipo_input === 'numero') return numberInput.trim().length > 0;
    if (conversation.tipo_input === 'texto') return textInput.trim().length > 0;
    if (conversation.tipo_input === 'multi_select') return selectedOptions.length > 0;
    return selectedOptions.length === 1;
  };

  const handleResponder = async () => {
    if (!conversation) return;
    setSaving(true);
    setApiError(null);

    try {
      const answerValue = getAnswerValue();
      const nextState = updateEstadoAtualWithAnswer(conversation, answerValue, estadoAtual);
      if (nextState.salvo_para_depois) {
        delete nextState.salvo_para_depois;
      }
      const nextConversation = await fetchConversation(nextState);
      const concluded = nextConversation.etapa === 'finalizado';

      await saveProgress(nextConversation.etapa, nextState, concluded);
      setEstadoAtual(nextState);
      setConversation(nextConversation);
      setSelectedOptions([]);
      setTextInput('');
      setNumberInput('');

      if (nextConversation.etapa === 'feedback_pendente') {
        return;
      }

      if (concluded) {
        router.push('/feedback');
      }
    } catch (err) {
      console.error('Erro ao avançar no questionário:', err);
      setApiError('Não foi possível avançar no questionário. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarDepois = async () => {
    setSaving(true);
    setApiError(null);

    try {
      await saveProgress(conversation?.etapa ?? null, { ...estadoAtual, salvo_para_depois: true }, false);
      router.push('/dashboard');
    } catch (err) {
      console.error('Erro ao salvar para continuar depois:', err);
      setApiError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !usuario || loadingState) {
    return (
      <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Não foi possível iniciar a conversa.</div>
      </div>
    );
  }

  const isSingle = conversation.tipo_input === 'single_select' || conversation.tipo_input === 'escala';

  return (
    <div className="questionario-shell" style={{
      minHeight: '100%',
      height: '100%',
      background: '#091541',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      fontFamily: 'Poppins',
    }}>
      <div className="questionario-content" style={{ width: '100%', maxWidth: 560, padding: '20px 0 12px' }}>
      <div style={{ width: '100%', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ color: '#FFDE68', fontSize: 15, fontWeight: 600 }}>{etapaLabel}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>{progresso}% concluído</div>
        </div>
        <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${progresso}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #FFDE68, #F8FF87)',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div className="questionario-card" style={{
        width: '100%',
        maxWidth: 560,
        background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
        borderRadius: 18,
        padding: 22,
        boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
      }}>
        {conversation.etapa !== 'feedback_pendente' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Image src={caipoBoneco} alt="Caipo" width={52} height={52} style={{ objectFit: 'contain' }} />
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#091541',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: '20px',
              flex: 1,
            }}>
              {conversation.etapa === 'apresentacao'
                ? `Olá, ${usuario.nome?.split(' ')[0] || 'amigo'}! Meu nome é Caipo. Vamos iniciar sua jornada de estudos.`
                : 'Responda com sinceridade. Isso me ajuda a criar seu melhor plano de estudo!'}
            </div>
          </div>
        )}

        <h2 style={{
          color: 'white',
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 18,
          lineHeight: '28px',
        }}>
          {conversation.mensagem}
        </h2>

        {conversation.tipo_input !== 'numero' && conversation.tipo_input !== 'texto' && conversation.tipo_input !== 'nenhum' && conversation.opcoes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conversation.opcoes.map((opcao) => {
              const selecionada = selectedOptions.includes(opcao);
              return (
                <button
                  key={opcao}
                  onClick={() => {
                    if (isSingle) {
                      setSelectedOptions([opcao]);
                    } else {
                      setSelectedOptions((prev) => (prev.includes(opcao) ? prev.filter((x) => x !== opcao) : [...prev, opcao]));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: selecionada ? '2px solid #FFDE68' : '2px solid rgba(255,255,255,0.2)',
                    background: selecionada ? 'rgba(255,222,104,0.2)' : 'rgba(255,255,255,0.07)',
                    color: selecionada ? '#FFDE68' : 'white',
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: 'Poppins',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{
                    width: 18,
                    height: 18,
                    borderRadius: isSingle ? '50%' : 4,
                    border: selecionada ? '2px solid #FFDE68' : '2px solid rgba(255,255,255,0.4)',
                    background: selecionada ? '#FFDE68' : 'transparent',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {selecionada && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1" stroke="#091541" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                  {opcao}
                </button>
              );
            })}
          </div>
        )}

        {conversation.tipo_input === 'texto' && (
          <textarea
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            rows={4}
            placeholder="Digite sua resposta"
            style={{
              width: '100%',
              minHeight: 110,
              padding: 14,
              borderRadius: 12,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontFamily: 'Poppins',
              color: '#091541',
              resize: 'vertical',
            }}
          />
        )}

        {conversation.tipo_input === 'numero' && (
          <div>
            <input
              type="number"
              value={numberInput}
              onChange={(e) => setNumberInput(e.target.value)}
              placeholder="Digite um número"
              min="1"
              max="20"
              style={{
                width: '100%',
                height: 52,
                padding: '0 14px',
                background: 'white',
                borderRadius: 8,
                border: 'none',
                outline: 'none',
                fontSize: 20,
                fontWeight: 600,
                fontFamily: 'Poppins',
                color: '#091541',
              }}
            />
          </div>
        )}

        {conversation.tipo_input === 'multi_select' && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
            Selecione todas as opções que se aplicam.
          </div>
        )}

        {apiError && (
          <div style={{ marginTop: 16, color: '#f87171', fontWeight: 600 }}>{apiError}</div>
        )}

        <button
          onClick={async () => {
            if (conversation.etapa === 'feedback_pendente') {
              router.push('/feedback');
              return;
            }
            await handleResponder();
          }}
          disabled={saving || (conversation.tipo_input !== 'nenhum' && !canProceed())}
          style={{
            width: '100%',
            height: 48,
            marginTop: 18,
            borderRadius: 12,
            border: 'none',
            background: !saving && (conversation.tipo_input === 'nenhum' || canProceed()) ? '#FFDE68' : 'rgba(255,255,255,0.2)',
            color: !saving && (conversation.tipo_input === 'nenhum' || canProceed()) ? '#091541' : 'rgba(255,255,255,0.4)',
            fontSize: 17,
            fontWeight: 700,
            fontFamily: 'Poppins',
            cursor: !saving && (conversation.tipo_input === 'nenhum' || canProceed()) ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {saving
            ? 'Salvando...'
            : conversation.etapa === 'feedback_pendente'
              ? 'Ver feedback'
              : conversation.etapa === 'finalizado'
                ? 'Finalizar'
                : 'Próxima'}
        </button>
      </div>

      <button
        onClick={handleSalvarDepois}
        disabled={saving}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          color: saving ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
          fontSize: 15,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'Poppins',
        }}
      >
        {saving ? 'Salvando...' : 'Salvar e continuar depois'}
      </button>
      </div>
    </div>
  );
}