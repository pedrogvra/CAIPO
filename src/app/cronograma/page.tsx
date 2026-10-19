'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';
import CronogramaWizard from '@/components/cronograma/CronogramaWizard';
import Image from 'next/image';
import type { CronogramaCompleto, Materia } from '@/types/cronograma';
import menuIcon from '../../../assets/icons/menu-hamburguer.svg';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HORAS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function CronogramaPage() {
  const router = useRouter();
  const { usuario, loading, questionarioStatus, refreshQuestionario } = useAuth();
  const [cronograma, setCronograma] = useState<CronogramaCompleto | null>(null);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [mostrando, setMostrando] = useState(false);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const [confirmandoNovo, setConfirmandoNovo] = useState(false);
  const [modoWizard, setModoWizard] = useState<'novo' | 'editar'>('novo');
  const [loadingData, setLoadingData] = useState(true);

  const diasParaExibir = cronograma?.dias_disponiveis && cronograma.dias_disponiveis.length > 0
    ? [...new Set(cronograma.dias_disponiveis)].sort((a, b) => a - b)
    : [0, 1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  const loadCronograma = () => {
    if (!usuario) return;
    Promise.all([
      fetch('/api/cronograma').then(r => r.json()),
      fetch('/api/materias').then(r => r.json()).catch(() => ({ materias: [] })),
    ]).then(([cRes, mRes]) => {
      if (cRes.cronograma) setCronograma(cRes.cronograma);
      if (mRes.materias) setMaterias(mRes.materias);
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
  };

  useEffect(() => {
    if (questionarioStatus === 'concluido') loadCronograma();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, questionarioStatus]);

  if (loading || !usuario) return (
    <div className="page-loading" style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
    </div>
  );

  if (questionarioStatus === 'loading') return (
    <div className="page-loading" style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
    </div>
  );

  if (questionarioStatus === 'erro') return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div role="alert" style={{ color: 'white', textAlign: 'center' }}>
        <p>Não foi possível verificar se você concluiu o questionário.</p>
        <button onClick={() => void refreshQuestionario()} style={{ marginTop: 16, padding: '12px 20px', border: 0, borderRadius: 10, background: '#FFDE68', color: '#091541', fontWeight: 600, cursor: 'pointer' }}>Tentar novamente</button>
      </div>
    </div>
  );

  if (questionarioStatus === 'pendente') return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div style={{ width: '100%', maxWidth: 440, padding: 28, borderRadius: 20, background: 'linear-gradient(156deg, #2864B8 0%, #173B78 100%)', color: 'white', textAlign: 'center', boxShadow: '6px 6px 10.6px rgba(0,0,0,0.25)' }}>
        <h1 style={{ color: '#FFDE68', fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Questionário necessário</h1>
        <p style={{ fontWeight: 600, lineHeight: '24px', marginBottom: 24 }}>Responda ao questionário para criar seu cronograma.</p>
        <button onClick={() => router.push('/questionario')} style={{ padding: '14px 28px', border: 0, borderRadius: 10, background: '#FFDE68', color: '#091541', fontWeight: 600, cursor: 'pointer' }}>Ir para Questionário</button>
      </div>
    </div>
  );

  return (
    <div className="cronograma-page flex flex-1 flex-col h-full w-full gap-6 bg-transparent">
        {/* Header */}
        <div className="flex justify-end">
          <HeaderUsuario />
        </div>

        {/* Card Principal Azul */}
        <div className="cronograma-card flex-1 w-full overflow-hidden rounded-2xl bg-[#1A4B9A] p-6 flex flex-col shadow-[6px_6px_10.6px_rgba(0,0,0,0.25)]" style={{ padding: 'var(--page-padding)' }}>
          {/* Título */}
          <div className="cronograma-title" style={{ color: '#FFDE68', fontSize: 36, fontWeight: 600, marginBottom: 16 }}>
            Seu último cronograma
          </div>

          {/* Área do cronograma */}
          <div className="cronograma-content" style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            minHeight: 0,
            overflow: 'auto',
            width: '100%',
            flex: 1,
          }}>
            {loadingData ? (
              <div style={{ color: '#B4B4B4', fontSize: 16, fontWeight: 600, textAlign: 'center', paddingTop: 60 }}>
                Carregando...
              </div>
            ) : cronograma ? (
              <div>
                <div style={{ fontWeight: 700, color: '#091541', marginBottom: 16, fontSize: 18 }}>
                  {cronograma.nome}
                </div>
                <div className="cronograma-grid-scroll" aria-label="Cronograma semanal">
                <div className="cronograma-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${diasParaExibir.length}, minmax(100px, 1fr))`, gap: 8, fontSize: 13 }}>
                  {diasParaExibir.map((dia, index) => {
                    const sessoesdia = cronograma.sessoes.filter(s => s.dia_semana === dia);
                    const materiasMap = Object.fromEntries(materias.map(m => [m.nome, m]));
                    const materiasVisiveis = sessoesdia
                      .slice()
                      .sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));

                    return (
                      <div key={`${dia}-${index}`}>
                        <div style={{
                          fontWeight: 700,
                          color: '#1E55A8',
                          textAlign: 'center',
                          marginBottom: 8,
                          fontSize: 14,
                          borderBottom: '2px solid #1E55A8',
                          paddingBottom: 4,
                        }}>{DIAS[dia] ?? `Dia ${dia + 1}`}</div>
                        {materiasVisiveis.length === 0 ? (
                          <div style={{
                            color: '#B4B4B4',
                            fontSize: 11,
                            textAlign: 'center',
                            paddingTop: 8,
                            minHeight: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>Sem matéria</div>
                        ) : materiasVisiveis.map((s, j) => (
                          <div key={`${s.materia}-${s.horario_inicio}-${s.horario_fim}-${j}`} style={{
                            background: s.tipo === 'atividade_fixa' ? '#5395CF' : s.tipo === 'revisao' ? '#0C3067' : (materiasMap[s.materia]?.cor || '#1E55A8'),
                            color: 'white',
                            borderRadius: 6,
                            padding: '4px 6px',
                            marginBottom: 4,
                            fontSize: 11,
                          }}>
                            <div style={{ fontWeight: 700 }}>{s.materia}</div>
                            <div style={{ opacity: 0.8 }}>{s.horario_inicio}–{s.horario_fim}</div>
                            {s.tipo === 'revisao' && <div style={{ fontSize: 9, opacity: 0.7 }}>revisão</div>}
                            {s.tipo === 'atividade_fixa' && <div style={{ fontSize: 9, opacity: 0.85 }}>atividade fixa</div>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 16 }}>
                <div style={{ color: '#B4B4B4', fontSize: 20, fontWeight: 600, textAlign: 'center' }}>
                  Você ainda não tem um cronograma
                </div>
                <div style={{ color: '#B4B4B4', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>
                  Clique no botão + para criar o seu primeiro!
                </div>
              </div>
            )}
          </div>

          {/* Menu de ações do cronograma */}
          <div style={{ alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, marginTop: 16, position: 'sticky', bottom: 20, zIndex: 20 }}>
            <button
              type="button"
              onClick={() => setMenuAcoesAberto(aberto => !aberto)}
              aria-label={menuAcoesAberto ? 'Fechar ações do cronograma' : 'Abrir ações do cronograma'}
              aria-expanded={menuAcoesAberto}
              aria-controls="cronograma-menu-acoes"
              disabled={loadingData}
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: '#FFDE68',
                boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
                border: 'none',
                cursor: loadingData ? 'wait' : 'pointer',
                opacity: loadingData ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                src={menuIcon}
                alt=""
                width={34}
                height={34}
                style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(34%) saturate(1367%) hue-rotate(183deg) brightness(96%) contrast(99%)' }}
              />
            </button>
            {menuAcoesAberto && (
              <div
                id="cronograma-menu-acoes"
                role="group"
                aria-label="Ações do cronograma"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: 'min(260px, calc(100vw - 48px))',
                  padding: 12,
                  borderRadius: 16,
                  background: 'linear-gradient(156deg, #2864B8 0%, #091541 100%)',
                  border: '1px solid rgba(255,222,104,0.55)',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.3)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setModoWizard(cronograma ? 'editar' : 'novo');
                    setMenuAcoesAberto(false);
                    setMostrando(true);
                  }}
                  style={{
                    minHeight: 48,
                    padding: '0 14px',
                    border: 0,
                    borderRadius: 10,
                    background: '#FFDE68',
                    color: '#091541',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'Poppins',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {cronograma ? 'Editar cronograma' : 'Criar cronograma'}
                </button>
                {cronograma && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAcoesAberto(false);
                      setConfirmandoNovo(true);
                    }}
                    style={{
                      minHeight: 48,
                      padding: '0 14px',
                      border: '1px solid rgba(255,222,104,0.75)',
                      borderRadius: 10,
                      background: 'transparent',
                      color: '#FFDE68',
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: 'Poppins',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    Criar outro cronograma
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Wizard (Mantido aqui fora, mas dentro do main) */}
        {mostrando && (
          <CronogramaWizard
            onClose={() => setMostrando(false)}
            cronogramaInicial={modoWizard === 'editar' ? cronograma : null}
            materiasDisponiveis={materias}
            onSuccess={() => {
              setMostrando(false);
              loadCronograma();
            }}
          />
        )}
        {confirmandoNovo && (
          <div
            role="presentation"
            onClick={() => setConfirmandoNovo(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(0,0,0,0.65)',
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="novo-cronograma-titulo"
              aria-describedby="novo-cronograma-descricao"
              onClick={event => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 440,
                padding: 28,
                borderRadius: 20,
                background: 'linear-gradient(156deg, #2864B8 0%, #091541 100%)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                color: 'white',
                fontFamily: 'Poppins',
              }}
            >
              <h2 id="novo-cronograma-titulo" style={{ color: '#FFDE68', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                Criar outro cronograma?
              </h2>
              <p id="novo-cronograma-descricao" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                Ao salvar um novo, ele ficará no lugar do cronograma atual. Se desistir antes de salvar, o atual será mantido.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setConfirmandoNovo(false)}
                  style={{
                    minHeight: 46,
                    padding: '0 18px',
                    border: '1px solid rgba(255,255,255,0.45)',
                    borderRadius: 10,
                    background: 'transparent',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'Poppins',
                    cursor: 'pointer',
                  }}
                >
                  Manter atual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmandoNovo(false);
                    setModoWizard('novo');
                    setMostrando(true);
                  }}
                  style={{
                    minHeight: 46,
                    padding: '0 18px',
                    border: 0,
                    borderRadius: 10,
                    background: '#FFDE68',
                    color: '#091541',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'Poppins',
                    cursor: 'pointer',
                  }}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
