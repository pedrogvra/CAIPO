'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';
import Image from 'next/image';
import caipoBoneco from '../../../assets/Caipo boneco.svg';
import touchIcon from '../../../assets/icons/toque.svg';
import pauseIcon from '../../../assets/icons/pausa.svg';
import resetIcon from '../../../assets/icons/vire-a-esquerda.svg';
import cerebroIcon from '../../../assets/icons/cerebro.svg';
import mugIcon from '../../../assets/icons/mug-hot-alt.svg';
import sofaIcon from '../../../assets/icons/sofa.svg';
import anguloDireitoIcon from '../../../assets/icons/angulo-direito.svg';
import { usePomodoro } from '@/hooks/usePomodoro';
import type { PomodoroEstado } from '@/types/pomodoro';

type ChecklistItem = { id: string; texto: string; checked: boolean };

const CHECKLIST_INICIAL: ChecklistItem[] = [
  { id: '1', texto: 'Material separado?', checked: false },
  { id: '2', texto: 'Ambiente organizado?', checked: false },
  { id: '3', texto: 'Sei o que vou estudar?', checked: false },
];

const MENSAGENS_MOTIVACIONAIS = [
  'Continue assim! Cada minuto conta.',
  'Foco total! Você está indo muito bem.',
  'Ótimo trabalho! Não desista agora.',
  'Concentração é o segredo do sucesso.',
  'Você é capaz! Mantenha o ritmo.',
];

const MOTIVOS_PAUSA = [
  'Resolvi algo importante',
  'Fui interrompido',
  'Perdi o foco',
  'Outro motivo',
];

type Modo = 'focus' | 'pausa_curta' | 'pausa_longa';

const SOMBRA_CARD = '6px 6px 10.6px rgba(0, 0, 0, 0.25)';
const SOMBRA_BOTAO = '0 10px 18px rgba(9, 21, 65, 0.18)';
const COR_BOTAO_ATIVO = '#D9EAFB';
const COR_BOTAO_PRESSIONADO = '#B6D7F8';
const FILTRO_BRANCO = 'brightness(0) invert(1)';
const FILTRO_AZUL_ESCURO = 'brightness(0) saturate(100%) invert(15%) sepia(30%) saturate(240%) hue-rotate(190deg) brightness(100%) contrast(110%)';
const RAIO_CIRCULO = 128;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO_CIRCULO;
const MINUTOS_MINIMOS_FOCO = 10;
const MINUTOS_MINIMOS_PAUSA_CURTA = 5;
const MINUTOS_MINIMOS_PAUSA_LONGA = 10;

const corDoAnel = (progresso: number) => {
  if (progresso >= 100) return '#5CCB73';
  if (progresso >= 60) return '#4DA3FF';
  return '#2C6BD6';
};

export default function PomodoroPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const [config, setConfig] = useState({
    tempo_foco: 25,
    tempo_pausa_curta: 5,
    tempo_pausa_longa: 15,
    sessoes_antes_pausa_longa: 4,
  });
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(CHECKLIST_INICIAL);
  const [mostraChecklist, setMostraChecklist] = useState(false);
  const [mostraMotivo, setMostraMotivo] = useState(false);
  const [mostraFinalizar, setMostraFinalizar] = useState(false);
  const [modoPendente, setModoPendente] = useState<Modo | null>(null);
  const [mensagemCaipo, setMensagemCaipo] = useState<string | undefined>();
  const [materiaNome, setMateriaNome] = useState('');
  const [materias, setMaterias] = useState<Array<{ id: string; nome: string }>>([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [materiaAberto, setMateriaAberto] = useState(false);
  const [modoAtivo, setModoAtivo] = useState<Modo>('focus');
  const [isCompact, setIsCompact] = useState(false);
  const [pressionado, setPressionado] = useState<null | 'play' | 'pausa' | 'reset'>(null);

  const painelRef = useRef<HTMLDivElement | null>(null);
  const materiaRef = useRef<HTMLDivElement | null>(null);
  const mensagemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaMensagemRef = useRef(0);

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
    const soltar = () => setPressionado(null);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const alvo = event.target as Node;
      if (painelRef.current && !painelRef.current.contains(alvo)) setPainelAberto(false);
      if (materiaRef.current && !materiaRef.current.contains(alvo)) setMateriaAberto(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!usuario) return;
    fetch('/api/questionario/progresso').then((r) => r.json()).then((d) => {
      setBloqueado(Boolean(d.progresso?.respostas_json?.salvo_para_depois));
    });
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    fetch('/api/cronograma').then((r) => r.json()).then((d) => {
      if (d.cronograma) {
        const sessoes = Array.isArray(d.cronograma?.sessoes)
          ? (d.cronograma.sessoes as Array<{ materia?: string | null; tipo?: string | null }>)
            .filter((sessao) => sessao.tipo !== 'pausa' && !sessao.tipo?.startsWith('pausa:'))
          : [];
        const nomesMaterias = sessoes
          .map((s) => s.materia)
          .filter((nome: unknown): nome is string => typeof nome === 'string' && nome.trim().length > 0);
        setMaterias(Array.from(new Set(nomesMaterias)).map((nome) => ({ id: nome, nome })));
      }
    });
    fetch('/api/pomodoro/config').then((r) => r.json()).then((d) => {
      if (d.config) {
        setConfig({
          ...d.config,
          tempo_foco: Math.max(MINUTOS_MINIMOS_FOCO, Number(d.config.tempo_foco) || MINUTOS_MINIMOS_FOCO),
          tempo_pausa_curta: Math.max(MINUTOS_MINIMOS_PAUSA_CURTA, Number(d.config.tempo_pausa_curta) || MINUTOS_MINIMOS_PAUSA_CURTA),
          tempo_pausa_longa: Math.max(MINUTOS_MINIMOS_PAUSA_LONGA, Number(d.config.tempo_pausa_longa) || MINUTOS_MINIMOS_PAUSA_LONGA),
        });
      }
    });
  }, [usuario]);

  const handleSessaoConcluida = async (duracao: number) => {
    await fetch('/api/pomodoro/sessao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materia_nome: materiaNome || null,
        duracao_planejada: config.tempo_foco,
        duracao_real: duracao,
        status: 'concluida',
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    if (mensagemTimerRef.current) clearTimeout(mensagemTimerRef.current);
    setMensagemCaipo('Parabéns! Sessão concluída! Você está construindo um hábito incrível!');
    mensagemTimerRef.current = setTimeout(() => setMensagemCaipo(undefined), 4000);
  };

  const handleSessaoInterrompida = async (duracao: number, motivo: string) => {
    await fetch('/api/pomodoro/sessao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materia_nome: materiaNome || null,
        duracao_planejada: config.tempo_foco,
        duracao_real: duracao,
        status: 'interrompida',
        motivo_pausa: motivo,
      }),
    });
  };

  const pomodoro = usePomodoro({
    tempoFoco: config.tempo_foco,
    tempoPausaCurta: config.tempo_pausa_curta,
    tempoPausaLonga: config.tempo_pausa_longa,
    sessoesAntesPausaLonga: config.sessoes_antes_pausa_longa,
    onSessaoConcluida: handleSessaoConcluida,
    onSessaoInterrompida: handleSessaoInterrompida,
  });

  useEffect(() => {
    if (
      pomodoro.estado === 'focus' ||
      pomodoro.estado === 'pausa_curta' ||
      pomodoro.estado === 'pausa_longa'
    ) {
      setModoAtivo(pomodoro.estado);
    }
  }, [pomodoro.estado]);

  useEffect(() => {
    if (!pomodoro.iniciado || pomodoro.estado !== 'focus') return;
    const minutosDecorridos = (config.tempo_foco * 60 - pomodoro.tempoRestante) / 60;
    const bloco = Math.floor(minutosDecorridos / 5);
    if (bloco > 0 && bloco !== ultimaMensagemRef.current) {
      ultimaMensagemRef.current = bloco;
      setMensagemCaipo(MENSAGENS_MOTIVACIONAIS[(bloco - 1) % MENSAGENS_MOTIVACIONAIS.length]);
      if (mensagemTimerRef.current) clearTimeout(mensagemTimerRef.current);
      mensagemTimerRef.current = setTimeout(() => setMensagemCaipo(undefined), 3000);
    }
  }, [pomodoro.tempoRestante, pomodoro.iniciado, pomodoro.estado, config.tempo_foco]);

  useEffect(
    () => () => {
      if (mensagemTimerRef.current) clearTimeout(mensagemTimerRef.current);
    },
    []
  );

  const checklistCompleto = checklistItems.every((i) => i.checked);

  const handleIniciarClick = () => {
    ultimaMensagemRef.current = 0;

    if (!materiaNome.trim()) {
      setMensagemCaipo('Selecione uma matéria antes de iniciar.');
      if (mensagemTimerRef.current) clearTimeout(mensagemTimerRef.current);
      mensagemTimerRef.current = setTimeout(() => setMensagemCaipo(undefined), 3000);
      return;
    }

    if (!checklistCompleto) {
      setMostraChecklist(true);
    } else {
      pomodoro.iniciar();
    }
  };

  const handleChecklistConfirmar = () => {
    if (!checklistCompleto) return;
    if (!materiaNome.trim()) {
      setMostraChecklist(false);
      setMensagemCaipo('Selecione uma matéria antes de iniciar.');
      if (mensagemTimerRef.current) clearTimeout(mensagemTimerRef.current);
      mensagemTimerRef.current = setTimeout(() => setMensagemCaipo(undefined), 3000);
      return;
    }
    setMostraChecklist(false);
    ultimaMensagemRef.current = 0;
    pomodoro.iniciar();
  };

  const abrirConfiguracoes = () => {
    setMateriaAberto(false);
    setPainelAberto((prev) => !prev);
  };

  const abrirMaterias = () => {
    setPainelAberto(false);
    setMateriaAberto((prev) => !prev);
  };

  const selecionarMateria = (nome: string) => {
    setMateriaNome(nome);
    setMateriaAberto(false);
  };

  const aplicarModo = (modo: Modo) => {
    if (pomodoro.iniciado || pomodoro.pausado) {
      setModoPendente(modo);
      setMostraFinalizar(true);
      return;
    }

    setModoAtivo(modo);
    pomodoro.definirModo(modo);
  };

  const aoMudarCampo = (modo: Modo, valor: number) => {
    const minimo = modo === 'focus'
      ? MINUTOS_MINIMOS_FOCO
      : modo === 'pausa_curta'
        ? MINUTOS_MINIMOS_PAUSA_CURTA
        : MINUTOS_MINIMOS_PAUSA_LONGA;
    const novo = Math.max(minimo, valor);
    setConfig((prev) => ({
      ...prev,
      [modo === 'focus' ? 'tempo_foco' : modo === 'pausa_curta' ? 'tempo_pausa_curta' : 'tempo_pausa_longa']: novo,
    }));
    if (modo === modoAtivo && !pomodoro.iniciado) {
      pomodoro.definirModo(modo);
    }
  };

  if (loading || !usuario)
    return (
      <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
      </div>
    );

  if (bloqueado)
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div style={{ width: '100%', maxWidth: 440, padding: 28, borderRadius: 20, background: 'linear-gradient(156deg, #2864B8 0%, #173B78 100%)', color: 'white', textAlign: 'center', boxShadow: SOMBRA_CARD }}>
          <h1 style={{ color: '#FFDE68', fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Questionário necessário</h1>
          <p style={{ fontWeight: 600, lineHeight: '24px', marginBottom: 24 }}>Responda ao questionário para usar o Pomodoro.</p>
          <button onClick={() => router.push('/questionario')} style={{ padding: '14px 28px', border: 0, borderRadius: 10, background: '#FFDE68', color: '#091541', fontWeight: 600, cursor: 'pointer' }}>Ir para Questionário</button>
        </div>
      </div>
    );

  const modoConfig: Record<Modo, { label: string; valor: number; icone: unknown }> = {
    focus: { label: 'Foco', valor: config.tempo_foco, icone: cerebroIcon },
    pausa_curta: { label: 'Descanso', valor: config.tempo_pausa_curta, icone: mugIcon },
    pausa_longa: { label: 'Descanso Longo', valor: config.tempo_pausa_longa, icone: sofaIcon },
  };

  const campos: Array<{ modo: Modo; label: string; valor: number }> = [
    { modo: 'focus', label: 'Foco (min)', valor: config.tempo_foco },
    { modo: 'pausa_curta', label: 'Pausa (min)', valor: config.tempo_pausa_curta },
    { modo: 'pausa_longa', label: 'Pausa longa (min)', valor: config.tempo_pausa_longa },
  ];

  const totalSegundosDoModo = (modoConfig[modoAtivo]?.valor ?? config.tempo_foco) * 60;
  const progress =
    pomodoro.iniciado || pomodoro.pausado
      ? Math.max(0, Math.min(100, ((totalSegundosDoModo - pomodoro.tempoRestante) / totalSegundosDoModo) * 100))
      : 0;
  const ringOffset = CIRCUNFERENCIA - (progress / 100) * CIRCUNFERENCIA;
  const corAnel = corDoAnel(progress);

  const algumPainelAberto = painelAberto || materiaAberto;

  const cardStyle: CSSProperties = isCompact
    ? {
        position: 'relative',
        width: '100%',
        flex: '1 1 auto',
        minHeight: 0,
        minWidth: 0,
        margin: '0 auto',
        background: '#F8FF87',
        borderRadius: 20,
        boxShadow: SOMBRA_CARD,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }
    : {
        position: 'relative',
        width: '100%',
        flex: '1 1 auto',
        minHeight: 0,
        minWidth: 0,
        margin: '0 auto',
        background: '#F8FF87',
        borderRadius: 20,
        boxShadow: SOMBRA_CARD,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      };

  const tituloStyle: CSSProperties = isCompact
    ? { color: '#091541', fontSize: 36, fontWeight: 600, fontFamily: 'Poppins' }
    : {
        position: 'absolute',
        left: 28,
        top: 28,
        color: '#091541',
        fontSize: 36,
        fontWeight: 600,
        fontFamily: 'Poppins',
      };

  const materiaWrapStyle: CSSProperties = isCompact
    ? { position: 'relative', width: '100%' }
    : {
        position: 'absolute',
        right: 28,
        top: 24,
        width: materiaAberto ? 271 : 299,
        zIndex: 20,
      };

  const materiaBtnStyle: CSSProperties = {
    width: '100%',
    height: 51,
    background: '#0C3067',
    borderRadius: 20,
    boxShadow: SOMBRA_CARD,
    border: 'none',
    cursor: 'pointer',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'Poppins',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const materiaPanelStyle: CSSProperties = {
    width: '100%',
    background: '#0C3067',
    borderRadius: 20,
    boxShadow: SOMBRA_CARD,
    padding: '18px 18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const configWrapStyle: CSSProperties = isCompact
    ? { position: 'relative', width: '100%' }
    : {
        position: 'absolute',
        left: 20,
        top: 84,
        width: 273,
        zIndex: 20,
      };

  const configBtnStyle: CSSProperties = {
    width: '100%',
    height: 42,
    background: '#0C3067',
    borderRadius: 20,
    boxShadow: SOMBRA_CARD,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 13px',
  };

  const configPanelStyle: CSSProperties = isCompact
    ? {
        width: '100%',
        background: '#0C3067',
        borderRadius: 20,
        boxShadow: SOMBRA_CARD,
        padding: '14px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }
    : {
        width: '100%',
        height: 312,
        background: '#0C3067',
        borderRadius: 20,
        boxShadow: SOMBRA_CARD,
        padding: '14px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      };

  const campoBoxStyle: CSSProperties = {
    width: '100%',
    height: 68,
    background: '#5395CF',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 5,
  };

  const circuloWrapStyle: CSSProperties = isCompact
    ? { alignSelf: 'center', position: 'relative', width: 303, height: 303, flexShrink: 0 }
    : {
        position: 'absolute',
        width: 303,
        height: 303,
        left: '50%',
        top: 180,
        transform: 'translateX(-50%)',
      };

  const controlesStyle: CSSProperties = isCompact
    ? { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 14 }
    : {
        position: 'absolute',
        left: '50%',
        top: 518,
        transform: 'translateX(-50%)',
        width: 377,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 26,
      };

  const estiloBotaoControle = (
    tamanho: 'grande' | 'lateral',
    estado: 'normal' | 'pressionado' | 'ativo'
  ): CSSProperties => {
    const grande = tamanho === 'grande';
    return {
      width: grande ? (isCompact ? 108 : 131) : (isCompact ? 80 : 97),
      height: grande ? (isCompact ? 110 : 133) : (isCompact ? 81 : 98),
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      boxShadow: SOMBRA_BOTAO,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: grande ? 0 : (isCompact ? 15 : 18),
      flexShrink: 0,
      background:
        estado === 'pressionado' ? COR_BOTAO_PRESSIONADO : estado === 'ativo' ? COR_BOTAO_ATIVO : '#FFFFFF',
      transform: estado === 'pressionado' ? 'scale(0.94)' : 'scale(1)',
      transition: 'background 150ms ease, transform 100ms ease',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      userSelect: 'none',
    };
  };

  const modosStyle: CSSProperties = isCompact
    ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 }
    : {
        position: 'absolute',
        left: 20,
        top: 520,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
      };

  const modoBtnStyle = (modo: Modo): CSSProperties => ({
    height: 41,
    borderRadius: 20,
    background: modoAtivo === modo ? '#5395CF' : '#091541',
    boxShadow: SOMBRA_CARD,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Poppins',
    transition: 'background 120ms ease',
  });

  return (
    <>
      <style jsx>{`
        .pomodoro-scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="flex flex-1 flex-col h-full w-full gap-6 bg-transparent" style={{ minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <HeaderUsuario />
        </div>

        <div className="pomodoro-scrollbar-hidden" style={cardStyle}>
        <div style={{ ...tituloStyle, minWidth: 116, whiteSpace: 'nowrap' }}>Pomodoro</div>

        <div ref={materiaRef} style={{ ...materiaWrapStyle, minWidth: 0 }}>
          {!materiaAberto ? (
            <button
              type="button"
              onClick={abrirMaterias}
              disabled={pomodoro.iniciado}
              style={{
                ...materiaBtnStyle,
                opacity: pomodoro.iniciado ? 0.5 : 1,
                cursor: pomodoro.iniciado ? 'not-allowed' : 'pointer',
              }}
            >
              {materiaNome || 'Qual materia vai estudar?'}
            </button>
          ) : (
            <div style={materiaPanelStyle}>
              <button
                type="button"
                onClick={abrirMaterias}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'Poppins',
                  textAlign: 'center',
                }}
              >
                Qual materia vai estudar?
              </button>
              {materias.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, fontFamily: 'Poppins', textAlign: 'center' }}>
                  Nenhuma matéria no cronograma
                </div>
              ) : (
                materias.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selecionarMateria(m.nome)}
                    style={{
                      background: m.nome === materiaNome ? 'rgba(255,222,104,0.15)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 10,
                      padding: '4px 6px',
                      color: m.nome === materiaNome ? '#FFDE68' : '#FFFFFF',
                      fontSize: 16,
                      fontWeight: 600,
                      fontFamily: 'Poppins',
                      textAlign: 'center',
                    }}
                  >
                    {m.nome}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div ref={painelRef} style={{ ...configWrapStyle, minWidth: 0 }}>
          {!painelAberto ? (
            <button
              type="button"
              onClick={abrirConfiguracoes}
              disabled={pomodoro.iniciado}
              style={{
                ...configBtnStyle,
                opacity: pomodoro.iniciado ? 0.5 : 1,
                cursor: pomodoro.iniciado ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, fontFamily: 'Poppins' }}>
                Configurações do Pomodoro
              </span>
              <Image src={anguloDireitoIcon} alt="Abrir" width={20} height={20} style={{ filter: FILTRO_BRANCO }} />
            </button>
          ) : (
            <div style={configPanelStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isCompact ? 0 : 3,
                }}
              >
                <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, fontFamily: 'Poppins' }}>
                  Configurações do Pomodoro
                </span>
                <button
                  type="button"
                  onClick={abrirConfiguracoes}
                  aria-label="Fechar configurações"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <Image src={anguloDireitoIcon} alt="Fechar" width={20} height={20} style={{ filter: FILTRO_BRANCO }} />
                </button>
              </div>
              {campos.map((campo) => (
                <label key={campo.modo} style={campoBoxStyle}>
                  <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, fontFamily: 'Poppins' }}>
                    {campo.label}
                  </span>
                  <input
                    type="number"
                    min={
                      campo.modo === 'focus'
                        ? MINUTOS_MINIMOS_FOCO
                        : campo.modo === 'pausa_curta'
                          ? MINUTOS_MINIMOS_PAUSA_CURTA
                          : MINUTOS_MINIMOS_PAUSA_LONGA
                    }
                    value={campo.valor}
                    onChange={(event) => aoMudarCampo(campo.modo, Number(event.target.value || 1))}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#FFFFFF',
                      fontSize: 32,
                      fontWeight: 600,
                      fontFamily: 'Poppins',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      padding: 0,
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={circuloWrapStyle}>
          <svg
            width="303"
            height="303"
            viewBox="0 0 303 303"
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="151.5"
              cy="151.5"
              r={RAIO_CIRCULO}
              fill="none"
              stroke="#091541"
              strokeWidth="10"
              strokeLinecap="round"
              opacity={0.85}
            />
            <circle
              cx="151.5"
              cy="151.5"
              r={RAIO_CIRCULO}
              fill="none"
              stroke={corAnel}
              strokeWidth="10"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.6s linear, stroke-dashoffset 0.6s linear' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#091541', fontSize: 24, fontWeight: 600, marginBottom: 6, fontFamily: 'Poppins' }}>
              {modoConfig[modoAtivo].label}
            </div>
            <div style={{ color: '#091541', fontSize: 68, fontWeight: 600, lineHeight: 1, fontFamily: 'Poppins' }}>
              {pomodoro.tempoFormatado}
            </div>
          </div>
        </div>

        {mensagemCaipo && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#FFFFFF',
              color: '#091541',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Poppins',
              padding: '8px 16px',
              borderRadius: 16,
              boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.2)',
              zIndex: 30,
              maxWidth: 300,
              textAlign: 'center',
            }}
          >
            {mensagemCaipo}
          </div>
        )}

        <div style={controlesStyle}>
          <button
            type="button"
            aria-label="Pausar"
            onPointerDown={() => setPressionado('pausa')}
            onPointerLeave={() => setPressionado(null)}
            onClick={() => {
              if (pomodoro.iniciado && !pomodoro.pausado) {
                pomodoro.pausar();
                setMostraMotivo(true);
              } else if (pomodoro.pausado) {
                pomodoro.retomar();
              }
            }}
            style={estiloBotaoControle(
              'lateral',
              pressionado === 'pausa' ? 'pressionado' : pomodoro.pausado ? 'ativo' : 'normal'
            )}
          >
            <Image
              src={pauseIcon}
              alt="Pausar"
              width={isCompact ? 37 : 45}
              height={isCompact ? 38 : 46}
              style={{ filter: FILTRO_AZUL_ESCURO }}
            />
          </button>

          <button
            type="button"
            aria-label="Iniciar"
            onPointerDown={() => setPressionado('play')}
            onPointerLeave={() => setPressionado(null)}
            onClick={() => {
              if (!pomodoro.iniciado) {
                handleIniciarClick();
              } else if (pomodoro.pausado) {
                pomodoro.retomar();
              }
            }}
            style={estiloBotaoControle(
              'grande',
              pressionado === 'play'
                ? 'pressionado'
                : pomodoro.iniciado && !pomodoro.pausado
                  ? 'ativo'
                  : 'normal'
            )}
          >
            <Image
              src={touchIcon}
              alt="Iniciar"
              width={isCompact ? 50 : 61}
              height={isCompact ? 62 : 75}
              style={{ filter: FILTRO_AZUL_ESCURO }}
            />
          </button>

          <button
            type="button"
            aria-label="Resetar"
            onPointerDown={() => setPressionado('reset')}
            onPointerLeave={() => setPressionado(null)}
            onClick={() => {
              if (pomodoro.iniciado) {
                setMostraFinalizar(true);
              } else {
                pomodoro.resetar();
              }
            }}
            style={estiloBotaoControle('lateral', pressionado === 'reset' ? 'pressionado' : 'normal')}
          >
            <Image
              src={resetIcon}
              alt="Resetar"
              width={isCompact ? 37 : 45}
              height={isCompact ? 38 : 46}
              style={{ filter: FILTRO_AZUL_ESCURO }}
            />
          </button>
        </div>

        <div style={{ ...modosStyle, paddingBottom: 18 }}>
          {(['focus', 'pausa_curta', 'pausa_longa'] as Modo[]).map((modo) => (
            <button
              key={modo}
              type="button"
              onClick={() => aplicarModo(modo)}
              style={modoBtnStyle(modo)}
            >
              <Image
                src={modoConfig[modo].icone as string}
                alt={modoConfig[modo].label}
                width={21}
                height={21}
                style={{ filter: FILTRO_BRANCO }}
              />
              <span>{modoConfig[modo].label}</span>
            </button>
          ))}
        </div>
      </div>

        {mostraChecklist && (
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
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 25,
              padding: 32,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Image src={caipoBoneco} alt="Caipo" width={64} height={64} style={{ objectFit: 'contain' }} />
              <h2 style={{ color: 'white', fontSize: 22, fontWeight: 600, margin: 0 }}>Antes de começar...</h2>
            </div>

            {checklistItems.map((item) => (
              <label
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, cursor: 'pointer' }}
              >
                <div
                  onClick={() =>
                    setChecklistItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
                  }
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `2px solid ${item.checked ? '#FFDE68' : 'rgba(255,255,255,0.4)'}`,
                    background: item.checked ? '#FFDE68' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {item.checked && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path d="M1 5L5.5 9.5L13 1" stroke="#091541" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>{item.texto}</span>
              </label>
            ))}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setMostraChecklist(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleChecklistConfirmar}
                disabled={!checklistCompleto}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: checklistCompleto ? '#FFDE68' : 'rgba(255, 222, 104, 0.45)',
                  color: checklistCompleto ? '#091541' : 'rgba(9, 21, 65, 0.55)',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: checklistCompleto ? 'pointer' : 'not-allowed',
                  fontFamily: 'Poppins',
                  opacity: checklistCompleto ? 1 : 0.8,
                }}
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

        {mostraMotivo && (
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
              maxWidth: 440,
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 25,
              padding: 32,
            }}
          >
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Por que você pausou?</h2>
            {MOTIVOS_PAUSA.map((m) => (
              <button
                key={m}
                onClick={() => setMostraMotivo(false)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginBottom: 10,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.07)',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                  textAlign: 'left',
                }}
              >
                {m}
              </button>
            ))}
            <button
              onClick={() => {
                setMostraMotivo(false);
                pomodoro.retomar();
              }}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: '#FFDE68',
                color: '#091541',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Poppins',
              }}
            >
              Continuar estudando
            </button>
          </div>
        </div>
      )}

        {mostraFinalizar && (
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
              maxWidth: 440,
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 25,
              padding: 32,
            }}
          >
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Encerrar sessão?</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, marginBottom: 20, lineHeight: '24px' }}>
              Seu progresso não será salvo. Tem certeza que deseja encerrar agora?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setMostraFinalizar(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                }}
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setMostraFinalizar(false);
                  const proximoModo = modoPendente;
                  setModoPendente(null);
                  pomodoro.finalizar('Encerrado pelo usuário');

                  if (proximoModo) {
                    setModoAtivo(proximoModo);
                    pomodoro.definirModo(proximoModo);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#f87171',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                }}
              >
                Encerrar
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
