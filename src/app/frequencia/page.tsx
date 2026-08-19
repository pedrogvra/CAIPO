'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';
import Image from 'next/image';
import caipoBoneco from '../../../assets/Caipo boneco.svg';
import arrowIcon from '../../../assets/icons/angulo-direito.svg';
import chamaIcon from '../../../assets/icons/chama.svg';
import trofeuIcon from '../../../assets/icons/trofeu.svg';
import livrosIcon from '../../../assets/icons/livros.svg';
import despertadorIcon from '../../../assets/icons/despertador.svg';
import alvoIcon from '../../../assets/icons/seta-de-alvo.svg';
import tomateIcon from '../../../assets/icons/tomate.svg';
import verificarIcon from '../../../assets/icons/verificar.svg';
import cruzIcon from '../../../assets/icons/cruz.svg';
import { calcularPerfil } from '@/services/algoritmos/calcularPerfil';
import type { Resposta } from '@/types/questionario';

interface OfensivaData {
  streak_atual: number;
  maior_streak: number;
  frequencia_ativa: boolean;
}

interface FrequenciaData {
  has_history: boolean;
  frequencia_ativa: boolean;
  streak: { current: number; best: number; active_today: boolean };
  week: Array<{ date: string; label: string; studied: boolean; minutes: number }>;
  stats: { studied_days: number; total_minutes: number; routine_percent: number | null; pomodoros: number };
  previous_week_minutes: number;
  difference_minutes: number;
}

type PainelFrequencia = 'sequencia' | 'estatisticas' | null;
type PerfilFeedback = ReturnType<typeof calcularPerfil>;

type MensagemChat = { id: string; autor: 'caipo' | 'usuario'; texto: string };

type PerguntaCaipo = {
  id: number;
  categoria?: string;
  pergunta: string;
  opcoes: string[];
  respostas_caipo?: Record<string, string>;
};

type RespostaHistorico = { pergunta_id: number; opcao_indice: number; resposta_usuario: string };

const REACOES_CAIPO = [
  'Entendi! Obrigado por compartilhar isso comigo.',
  'Que legal! Cada dia conta.',
  'Anotado! Você está indo muito bem.',
  'Continue assim! Estou orgulhoso de você.',
];

const MENSAGEM_FINAL_CAIPO =
  'Obrigado por conversar comigo! Você está construindo um hábito incrível. Nos vemos amanhã!';

const FILTRO_AZUL_ESCURO =
  'brightness(0) saturate(100%) invert(8%) sepia(34%) saturate(1367%) hue-rotate(183deg) brightness(96%) contrast(99%)';
const SOMBRA_CARD = '6px 6px 10.6px rgba(0, 0, 0, 0.25)';
const FILTRO_VERDE = 'brightness(0) saturate(100%) invert(58%) sepia(56%) saturate(669%) hue-rotate(75deg) brightness(91%) contrast(88%)';
const FILTRO_VERMELHO = 'brightness(0) saturate(100%) invert(35%) sepia(86%) saturate(1961%) hue-rotate(337deg) brightness(91%) contrast(92%)';
const FILTRO_BRANCO = 'brightness(0) saturate(100%) invert(1)';
const MENSAGEM_SEM_HISTORICO = 'Ainda não temos dados suficientes para mostrar suas estatísticas. Comece seu primeiro estudo e eu vou acompanhar seu progresso com você!';

const gerarId = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatarTempo = (minutos: number) => {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h ${resto}min`;
};

const obterDataLocal = () => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
};

export default function FrequenciaPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const [ofensiva, setOfensiva] = useState<OfensivaData>({ streak_atual: 0, maior_streak: 0, frequencia_ativa: false });
  const [isCompact, setIsCompact] = useState(false);
  const [frequenciaAtiva, setFrequenciaAtiva] = useState<boolean | null>(null);
  const [frequenciaData, setFrequenciaData] = useState<FrequenciaData | null>(null);
  const [painelAberto, setPainelAberto] = useState<PainelFrequencia>(null);
  const [feedbackAberto, setFeedbackAberto] = useState(false);
  const [feedback, setFeedback] = useState<PerfilFeedback | null>(null);
  const [carregandoFeedback, setCarregandoFeedback] = useState(false);

  const [chatAberto, setChatAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [perguntasDoDia, setPerguntasDoDia] = useState<PerguntaCaipo[]>([]);
  const [indicePergunta, setIndicePergunta] = useState(0);
  const [reacaoAtual, setReacaoAtual] = useState(0);
  const [caipoDigitando, setCaipoDigitando] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 819px)');
    const atualizar = () => setIsCompact(mq.matches);
    atualizar();
    mq.addEventListener('change', atualizar);
    return () => mq.removeEventListener('change', atualizar);
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const atualizarFrequencia = () => {
      fetch('/api/frequencia', { headers: { 'x-time-zone': Intl.DateTimeFormat().resolvedOptions().timeZone } })
        .then((r) => r.json())
        .then((data: FrequenciaData) => {
          setFrequenciaData(data);
          setOfensiva({
            streak_atual: data.streak.current,
            maior_streak: data.streak.best,
            frequencia_ativa: data.frequencia_ativa,
          });
          setFrequenciaAtiva(data.frequencia_ativa);
        })
        .catch(() => {
          setFrequenciaData(null);
          setFrequenciaAtiva(false);
        });
    };
    atualizarFrequencia();
    const intervalo = window.setInterval(atualizarFrequencia, 30000);
    return () => window.clearInterval(intervalo);
  }, [usuario]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens, chatAberto]);

  if (loading || !usuario)
    return (
      <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
      </div>
    );

  const ativa = frequenciaAtiva === true;

  const abrirFeedback = async () => {
    setFeedbackAberto(true);
    if (feedback || carregandoFeedback) return;
    setCarregandoFeedback(true);
    try {
      const response = await fetch('/api/questionario/progresso');
      const data = await response.json();
      if (data.progresso) {
        const progresso = data.progresso;
        const estado = progresso.respostas_json || {};
        const respostas = (estado.diagnostico_inicial?.respostas || estado) as Record<string, Resposta>;
        setFeedback(calcularPerfil(progresso.pontuacao_atual || 0, respostas, []));
      }
    } finally {
      setCarregandoFeedback(false);
    }
  };

  const abrirChat = async () => {
    if (chatAberto) return;
    let perguntas: PerguntaCaipo[] = [];
    let perguntasHistorico: PerguntaCaipo[] = [];
    let respondidas: RespostaHistorico[] = [];
    try {
      const response = await fetch('/api/frequencia/conversa', { headers: { 'x-time-zone': Intl.DateTimeFormat().resolvedOptions().timeZone } });
      if (response.ok) {
        const data = await response.json();
        perguntas = Array.isArray(data.perguntas) ? data.perguntas : [];
        perguntasHistorico = Array.isArray(data.perguntas_historico) ? data.perguntas_historico : [];
        respondidas = Array.isArray(data.respondidas) ? data.respondidas : [];
      }
    } catch {
      perguntas = [];
    }
    setPerguntasDoDia(perguntas);
    const primeira = perguntas[0];
    const historicoMensagens: MensagemChat[] = respondidas.flatMap((resposta) => {
      const pergunta = perguntasHistorico.find((item) => item.id === resposta.pergunta_id);
      if (!pergunta) return [];
      const reacao = pergunta.respostas_caipo?.[String(resposta.opcao_indice)] || REACOES_CAIPO[resposta.opcao_indice % REACOES_CAIPO.length];
      return [
        { id: gerarId(), autor: 'caipo' as const, texto: pergunta.pergunta },
        { id: gerarId(), autor: 'usuario' as const, texto: resposta.resposta_usuario },
        { id: gerarId(), autor: 'caipo' as const, texto: reacao },
      ];
    });
    setMensagens([
      {
        id: gerarId(),
        autor: 'caipo',
        texto: 'Oi! Eu sou o Caipo! Que bom te ver por aqui. Vou te fazer algumas perguntinhas sobre os seus estudos, pode ser?',
      },
      ...historicoMensagens,
      ...(primeira ? [{ id: gerarId(), autor: 'caipo' as const, texto: primeira.pergunta }] : []),
      ...(!primeira && respondidas.length > 0 ? [{ id: gerarId(), autor: 'caipo' as const, texto: MENSAGEM_FINAL_CAIPO }] : []),
    ]);
    setIndicePergunta(0);
    setReacaoAtual(0);
    setCaipoDigitando(false);
    enviandoRef.current = false;
    setChatAberto(true);
  };

  const enviarResposta = async (opcao: string) => {
    const texto = opcao.trim();
    if (!texto || indicePergunta >= perguntasDoDia.length) return;
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setCaipoDigitando(true);

    const perguntaAtual = perguntasDoDia[indicePergunta];
    const opcaoIndice = perguntaAtual.opcoes.indexOf(texto);
    const respostaSalva = await fetch('/api/frequencia/conversa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pergunta_id: perguntaAtual.id,
        opcao_indice: opcaoIndice,
        resposta_usuario: texto,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }).catch(() => null);

    if (!respostaSalva?.ok) {
      setMensagens((prev) => [...prev, { id: gerarId(), autor: 'caipo', texto: 'Não consegui salvar sua resposta agora. Tente novamente.' }]);
      setCaipoDigitando(false);
      enviandoRef.current = false;
      return;
    }

    setMensagens((prev) => [...prev, { id: gerarId(), autor: 'usuario', texto }]);

    const proximo = indicePergunta + 1;
    setIndicePergunta(proximo);

    const reacao = perguntaAtual.respostas_caipo?.[String(opcaoIndice)] ?? REACOES_CAIPO[reacaoAtual % REACOES_CAIPO.length];
    setReacaoAtual((r) => r + 1);

    window.setTimeout(() => {
      const proximaPergunta = perguntasDoDia[proximo];
      if (proximaPergunta) {
        setMensagens((prev) => [
          ...prev,
          { id: gerarId(), autor: 'caipo', texto: reacao },
          { id: gerarId(), autor: 'caipo', texto: proximaPergunta.pergunta },
        ]);
      } else {
        setMensagens((prev) => [...prev, { id: gerarId(), autor: 'caipo', texto: MENSAGEM_FINAL_CAIPO }]);
      }
      enviandoRef.current = false;
      setCaipoDigitando(false);
    }, 450);
  };

  const botoes = [
    { id: 'sequencia', texto: 'Ver minha sequência de estudos', acao: () => setPainelAberto('sequencia') },
    { id: 'estatisticas', texto: 'Minhas estatísticas da semana', acao: () => setPainelAberto('estatisticas') },
    { id: 'conversar', texto: 'Conversar com o Caipo', acao: abrirChat },
    { id: 'feedback', texto: 'Rever meu feedback inicial', acao: abrirFeedback },
  ];

  const cardStyle: CSSProperties = {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative',
    background: 'linear-gradient(45deg, #1E55A8 27%, #0C3067 100%)',
    boxShadow: SOMBRA_CARD,
    borderRadius: 20,
    padding: 'var(--page-padding)',
    paddingBottom: 'calc(var(--page-padding) * 2)',
    display: 'flex',
    flexDirection: isCompact ? 'column' : 'row',
    gap: isCompact ? 24 : 32,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  };

  const botaoEstilo: CSSProperties = {
    width: '100%',
    maxWidth: 470,
    height: 65,
    background: '#F8FF87',
    boxShadow: SOMBRA_CARD,
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    fontFamily: 'Poppins',
  };

  const balaoEstilo: CSSProperties = isCompact
    ? {
        position: 'relative',
        marginBottom: 8,
        background: 'white',
        borderRadius: 12,
        padding: '10px 18px',
        color: '#091541',
        fontSize: 18,
        fontWeight: 700,
        fontFamily: 'Poppins',
        lineHeight: '24px',
        textAlign: 'center',
        width: 'min(70vw, 250px)',
        maxWidth: 250,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }
    : {
        position: 'relative',
        marginBottom: 6,
        background: 'white',
        borderRadius: 12,
        padding: '14px 22px',
        color: '#091541',
        fontSize: 20,
        fontWeight: 600,
        fontFamily: 'Poppins',
        lineHeight: '30px',
        maxWidth: 280,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      };

  const rabinhoEstilo: CSSProperties = isCompact
    ? {
        position: 'absolute',
        top: -8,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: 16,
        height: 16,
        background: 'white',
        borderRadius: 2,
      }
    : {
        position: 'absolute',
        top: -8,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: 16,
        height: 16,
        background: 'white',
        borderRadius: 2,
      };

  const opcoesAtuais = indicePergunta < perguntasDoDia.length ? perguntasDoDia[indicePergunta]?.opcoes : undefined;

  return (
    <div className="flex flex-1 flex-col h-full w-full gap-6 bg-transparent">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <HeaderUsuario />
      </div>

      <div style={cardStyle}>
        <div
          style={{
            flex: isCompact ? '1 1 auto' : '1 1 50%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontSize: isCompact ? 28 : 36, fontWeight: 600, marginBottom: isCompact ? 8 : 12, fontFamily: 'Poppins' }}>
              <span style={{ color: 'white' }}>Frequência </span>
              <span style={{ color: ativa ? '#FFDE68' : 'rgba(255,255,255,0.75)' }}>
                {ativa ? 'ativada' : 'desativada'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ color: ativa ? '#FFDE68' : 'rgba(255,222,104,0.58)', fontSize: isCompact ? 96 : 128, fontWeight: 600, lineHeight: 1, fontFamily: 'Poppins' }}>
                {ofensiva.streak_atual}
              </span>
              <span
                style={{
                  color: ativa ? '#FFDE68' : 'rgba(255,222,104,0.58)',
                  fontSize: isCompact ? 56 : 80,
                  fontWeight: 600,
                  lineHeight: 1,
                  fontFamily: 'Poppins',
                  marginLeft: isCompact ? 12 : 15,
                  marginTop: isCompact ? 25 : 36,
                }}
              >
                {ofensiva.streak_atual === 1 ? 'dia' : 'dias'}
              </span>
            </div>

            {!ativa && (
              <div
                style={{
                  maxWidth: 470,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 16,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div style={{ color: 'white', fontSize: 16, fontWeight: 600, lineHeight: '24px', fontFamily: 'Poppins' }}>
                  Sua frequência será ativada após você concluir o primeiro Pomodoro do dia (modo Foco completo).
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/pomodoro')}
                  style={{
                    background: '#FFDE68',
                    color: '#091541',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Poppins',
                  }}
                >
                  Ir para o Pomodoro
                </button>
              </div>
            )}

            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: 600, marginBottom: 20, fontFamily: 'Poppins' }}>
              Maior sequência de dias: {ofensiva.maior_streak}
            </div>

            <div
              style={{
                color: 'white',
                fontSize: isCompact ? 24 : 32,
                fontWeight: 600,
                lineHeight: isCompact ? '34px' : '48px',
                maxWidth: 470,
                fontFamily: 'Poppins',
              }}
            >
              Que tal conversar com o Caipo?
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, paddingBottom: isCompact ? 12 : 24 }}>
            {botoes.map((b) => (
              <button key={b.id} type="button" onClick={b.acao} style={botaoEstilo}>
                <span style={{ color: '#091541', fontSize: 20, fontWeight: 600, fontFamily: 'Poppins' }}>{b.texto}</span>
                <Image src={arrowIcon} alt="Abrir" width={29} height={29} style={{ filter: FILTRO_AZUL_ESCURO }} />
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            flex: isCompact ? '0 0 auto' : '1 1 50%',
            width: isCompact ? '100%' : '100%',
            maxWidth: isCompact ? 360 : 'none',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            paddingBottom: isCompact ? 8 : 16,
            margin: isCompact ? '0 auto' : '0 auto',
            alignSelf: isCompact ? 'center' : 'stretch',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              width: '100%',
              height: isCompact ? 'auto' : '100%',
              gap: 30,
              marginTop: 50,
            }}
          >
            <Image
              src={caipoBoneco}
              alt="Caipo"
              width={isCompact ? 220 : 260}
              height={isCompact ? 220 : 260}
              style={{
                objectFit: 'contain',
                width: isCompact ? 'min(70vw, 220px)' : 260,
                height: 'auto',
                display: 'block',
                margin: '0 auto',
              }}
            />
            <div style={balaoEstilo}>
              Vamos estudar?
              <div style={rabinhoEstilo} />
            </div>
          </div>
        </div>
      </div>

      {painelAberto && frequenciaData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={painelAberto === 'sequencia' ? 'Minha sequência de estudos' : 'Minhas estatísticas da semana'}
          onClick={() => setPainelAberto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            background: 'rgba(0,0,0,0.7)',
            padding: isCompact ? 12 : 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 20,
              padding: isCompact ? 18 : 28,
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              color: 'white',
              fontFamily: 'Poppins',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: isCompact ? 22 : 30, fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Image src={painelAberto === 'sequencia' ? chamaIcon : livrosIcon} alt="" width={30} height={30} style={{ filter: FILTRO_BRANCO }} />
                  {painelAberto === 'sequencia' ? 'Minha sequência de estudos' : 'Minhas estatísticas da semana'}
                </span>
              </h2>
              <button
                type="button"
                aria-label="Fechar painel"
                onClick={() => setPainelAberto(null)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 28, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {!frequenciaData.has_history ? (
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 20, lineHeight: '26px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Image src={caipoBoneco} alt="Caipo" width={30} height={30} style={{ objectFit: 'contain', flexShrink: 0 }} />
                  {MENSAGEM_SEM_HISTORICO}
                </span>
              </div>
            ) : painelAberto === 'sequencia' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <div style={{ background: '#F8FF87', color: '#091541', borderRadius: 16, padding: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Sequência atual</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isCompact ? 38 : 48, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}><Image src={chamaIcon} alt="" width={isCompact ? 36 : 46} height={isCompact ? 36 : 46} />{frequenciaData.streak.current} {frequenciaData.streak.current === 1 ? 'dia' : 'dias'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, fontWeight: 600 }}><Image src={trofeuIcon} alt="" width={18} height={18} style={{ filter: FILTRO_BRANCO }} />Melhor sequência</div>
                    <div style={{ fontSize: isCompact ? 32 : 40, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}>{frequenciaData.streak.best} {frequenciaData.streak.best === 1 ? 'dia' : 'dias'}</div>
                  </div>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 19, fontWeight: 600 }}>Calendário semanal</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: isCompact ? 4 : 8 }}>
                    {frequenciaData.week.map((day) => {
                      const atual = day.date === obterDataLocal();
                      return (
                        <div key={day.date} style={{ textAlign: 'center', minWidth: 0 }}>
                          <div style={{ fontSize: isCompact ? 11 : 14, fontWeight: 600, marginBottom: 7 }}>{day.label}</div>
                          <div style={{
                            border: atual ? '2px solid #FFDE68' : '1px solid rgba(255,255,255,0.22)',
                            borderRadius: 12,
                            minHeight: isCompact ? 46 : 52,
                            padding: isCompact ? 8 : 10,
                            background: day.studied ? 'rgba(248,255,135,0.2)' : 'rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Image
                              src={day.studied ? verificarIcon : cruzIcon}
                              alt={day.studied ? 'Estudou' : 'Não estudou'}
                              width={20}
                              height={20}
                              style={{ filter: day.studied ? FILTRO_VERDE : FILTRO_VERMELHO, display: 'block' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ background: 'white', color: '#091541', borderRadius: 16, padding: 18, fontWeight: 600, lineHeight: '24px' }}>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Image src={caipoBoneco} alt="Caipo" width={30} height={30} style={{ objectFit: 'contain', flexShrink: 0 }} />
                    {frequenciaData.streak.current > 0
                      ? 'Você está construindo uma ótima sequência! Continue assim, um dia de cada vez.'
                      : 'Tudo bem! Uma pausa não apaga tudo o que você já conquistou. Vamos começar uma nova sequência?'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    [livrosIcon, 'Dias estudados', `${frequenciaData.stats.studied_days} dias`],
                    [despertadorIcon, 'Tempo total de estudo', formatarTempo(frequenciaData.stats.total_minutes)],
                    [alvoIcon, 'Rotina concluída', frequenciaData.stats.routine_percent === null ? '--' : `${frequenciaData.stats.routine_percent}%`],
                    [tomateIcon, 'Pomodoros realizados', String(frequenciaData.stats.pomodoros)],
                  ].map(([icone, titulo, valor]) => (
                    <div key={titulo} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: isCompact ? 12 : 14, minWidth: 0 }}>
                      <Image src={icone} alt="" width={22} height={22} style={{ filter: FILTRO_BRANCO }} />
                      <div style={{ fontSize: 12, lineHeight: '17px', marginTop: 5, minHeight: 34 }}>{titulo}</div>
                      <div style={{ color: '#FFDE68', fontSize: isCompact ? 19 : 22, fontWeight: 700, marginTop: 5, overflowWrap: 'anywhere' }}>{valor}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 600 }}>Tempo de estudo da semana</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: isCompact ? 5 : 10, height: 190, padding: '10px 4px 0', borderBottom: '1px solid rgba(255,255,255,0.28)' }}>
                    {frequenciaData.week.map((day) => {
                      const maximo = Math.max(...frequenciaData.week.map((item) => item.minutes), 1);
                      const altura = day.minutes === 0 ? 4 : Math.max(12, (day.minutes / maximo) * 150);
                      return (
                        <div key={day.date} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                          <div title={`${day.minutes} minutos`} style={{ width: 'min(34px, 80%)', height: altura, background: day.minutes > 0 ? '#FFDE68' : 'rgba(255,255,255,0.25)', borderRadius: '7px 7px 2px 2px' }} />
                          <span style={{ fontSize: isCompact ? 10 : 13, fontWeight: 600 }}>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16, lineHeight: '24px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#FFDE68', marginBottom: 5 }}><Image src={alvoIcon} alt="" width={20} height={20} style={{ filter: FILTRO_BRANCO }} />Seu progresso</div>
                  {frequenciaData.difference_minutes > 0
                    ? `Você estudou ${formatarTempo(frequenciaData.difference_minutes)} a mais que na semana passada.`
                    : frequenciaData.difference_minutes < 0
                      ? `Você estudou ${formatarTempo(Math.abs(frequenciaData.difference_minutes))} a menos que na semana passada.`
                      : 'Você manteve um ritmo parecido com o da semana passada.'}
                </div>
                <div style={{ background: 'white', color: '#091541', borderRadius: 16, padding: 18, fontWeight: 600, lineHeight: '24px' }}>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Image src={caipoBoneco} alt="Caipo" width={30} height={30} style={{ objectFit: 'contain', flexShrink: 0 }} />
                    {frequenciaData.difference_minutes >= 0
                      ? 'Você está conseguindo acompanhar sua rotina com mais frequência. Continue assim!'
                      : 'Essa semana foi um pouco mais difícil, mas tudo bem. O importante é continuar tentando e encontrar uma rotina que funcione para você.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {feedbackAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Meu feedback inicial"
          onClick={() => setFeedbackAberto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 950,
            background: 'rgba(0,0,0,0.7)',
            padding: isCompact ? 12 : 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 20,
              padding: isCompact ? 18 : 28,
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              color: 'white',
              fontFamily: 'Poppins',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: isCompact ? 22 : 30, fontWeight: 600 }}>Meu feedback inicial</h2>
              <button
                type="button"
                aria-label="Fechar feedback"
                onClick={() => setFeedbackAberto(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 28, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {carregandoFeedback ? (
              <div style={{ padding: 20, textAlign: 'center', fontWeight: 600 }}>Carregando seu feedback...</div>
            ) : !feedback ? (
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 20, lineHeight: '26px', fontWeight: 600 }}>
                Seu feedback inicial ainda não está disponível. Conclua o questionário para visualizar seu perfil.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 18 }}>
                  <div style={{ color: '#FFDE68', fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>Seu perfil de estudante</div>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '30px', marginTop: 5 }}>{feedback.descricao}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 18 }}>
                  <div style={{ color: '#FFDE68', fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Seus pontos fortes</div>
                  {feedback.pontos_fortes.map((ponto, index) => (
                    <div key={index} style={{ display: 'flex', gap: 10, lineHeight: '24px', marginBottom: 7, fontWeight: 600 }}>
                      <span style={{ color: '#FFDE68' }}>•</span>{ponto}
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 18 }}>
                  <div style={{ color: '#F8FF87', fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Hábitos a desenvolver</div>
                  {feedback.habitos_desenvolver.map((habito, index) => (
                    <div key={index} style={{ display: 'flex', gap: 10, lineHeight: '24px', marginBottom: 7, fontWeight: 600 }}>
                      <span style={{ color: '#F8FF87' }}>•</span>{habito}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {chatAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              height: 'min(70vh, 620px)',
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 25,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Image
                  src={caipoBoneco}
                  alt="Caipo"
                  width={40}
                  height={40}
                  style={{ background: 'white', borderRadius: '50%', padding: 3, objectFit: 'contain' }}
                />
                <div style={{ color: 'white', fontSize: 18, fontWeight: 600, fontFamily: 'Poppins' }}>Caipo</div>
              </div>
              <button
                type="button"
                aria-label="Fechar conversa"
                onClick={() => setChatAberto(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: 26,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>

            <div
              ref={chatRef}
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin' }}
            >
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: m.autor === 'caipo' ? 'flex-start' : 'flex-end',
                    marginBottom: 10,
                    alignItems: 'flex-end',
                    gap: 8,
                  }}
                >
                  {m.autor === 'caipo' && (
                    <Image
                      src={caipoBoneco}
                      alt="Caipo"
                      width={34}
                      height={34}
                      style={{ background: 'white', borderRadius: '50%', padding: 2, objectFit: 'contain', flexShrink: 0 }}
                    />
                  )}
                  <div
                    style={{
                      maxWidth: '78%',
                      background: m.autor === 'caipo' ? '#FFFFFF' : '#FFDE68',
                      color: '#091541',
                      borderRadius: m.autor === 'caipo' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                      padding: '10px 14px',
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: '20px',
                      fontFamily: 'Poppins',
                    }}
                  >
                    {m.texto}
                  </div>
                </div>
              ))}
            </div>

            {!caipoDigitando && opcoesAtuais && opcoesAtuais.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 10px', flexShrink: 0 }}>
                {opcoesAtuais.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => enviarResposta(op)}
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 999,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'Poppins',
                      cursor: 'pointer',
                      padding: '8px 14px',
                    }}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}

            {!caipoDigitando && indicePergunta >= perguntasDoDia.length && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setChatAberto(false)}
                  style={{
                    background: '#FFDE68',
                    border: 'none',
                    borderRadius: 999,
                    color: '#091541',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'Poppins',
                    cursor: 'pointer',
                    padding: '10px 22px',
                  }}
                >
                  Fechar conversa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
