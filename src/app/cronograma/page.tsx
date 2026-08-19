'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';
import CronogramaWizard from '@/components/cronograma/CronogramaWizard';
import Image from 'next/image';
import type { CronogramaCompleto } from '@/types/cronograma';
import plusIcon from '../../../assets/icons/mais.svg';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HORAS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function CronogramaPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const [cronograma, setCronograma] = useState<CronogramaCompleto | null>(null);
  const [materias, setMaterias] = useState<Array<{ id: string; nome: string; cor?: string }>>([]);
  const [mostrando, setMostrando] = useState(false);
  const [mostrandoOrientacao, setMostrandoOrientacao] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);

  const abrirCriacaoCronograma = () => {
    if (!cronograma) {
      setMostrandoOrientacao(true);
      return;
    }
    setMostrando(true);
  };

  const diasParaExibir = cronograma?.dias_disponiveis && cronograma.dias_disponiveis.length > 0
    ? [...new Set(cronograma.dias_disponiveis)].sort((a, b) => a - b)
    : [0, 1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  const loadCronograma = () => {
    if (!usuario) return;
    setLoadingData(true);
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
    if (!usuario) return;
    fetch('/api/questionario/progresso').then(r => r.json()).then(d => {
      setBloqueado(d.progresso?.concluido !== true);
    });
  }, [usuario]);

  useEffect(() => {
    loadCronograma();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (loading || !usuario) return (
    <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col h-full w-full gap-6 bg-transparent">
        {/* Header */}
        <div className="flex justify-end">
          <HeaderUsuario />
        </div>

        {/* Card Principal Azul */}
        <div className="flex-1 w-full overflow-hidden rounded-2xl bg-[#1A4B9A] p-6 flex flex-col shadow-[6px_6px_10.6px_rgba(0,0,0,0.25)]" style={{ padding: 'var(--page-padding)' }}>
          {/* Título */}
          <div style={{ color: '#FFDE68', fontSize: 36, fontWeight: 600, marginBottom: 16 }}>
            Último cronograma feito
          </div>

          {/* Área do cronograma */}
          <div style={{
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', gap: 8, fontSize: 13 }}>
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
                            background: s.tipo === 'pausa' || s.tipo?.startsWith('pausa:')
                              ? '#68758A'
                              : (s.tipo === 'revisao' ? '#0C3067' : (materiasMap[s.materia]?.cor || '#1E55A8')),
                            color: 'white',
                            borderRadius: 6,
                            padding: '4px 6px',
                            marginBottom: 4,
                            fontSize: 11,
                          }}>
                            <div style={{ fontWeight: 700 }}>{s.materia}</div>
                            <div style={{ opacity: 0.8 }}>{s.horario_inicio}–{s.horario_fim}</div>
                            {(s.tipo === 'pausa' || s.tipo?.startsWith('pausa:')) && <div style={{ fontSize: 9, opacity: 0.8 }}>{s.categoria || s.tipo?.slice('pausa:'.length) || 'atividade fixa'}</div>}
                            {s.tipo === 'revisao' && <div style={{ fontSize: 9, opacity: 0.7 }}>revisão</div>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
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

          {/* Botão + */}
          <button
            onClick={abrirCriacaoCronograma}
            style={{
              alignSelf: 'flex-end',
              marginTop: 16,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: '#FFDE68',
              boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'sticky',
              bottom: 20,
              zIndex: 20,
            }}
          >
            <Image src={plusIcon} alt="Adicionar cronograma" width={50} height={50} style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(34%) saturate(1367%) hue-rotate(183deg) brightness(96%) contrast(99%)' }} />
          </button>
        </div>

        {bloqueado && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 440, padding: 28, borderRadius: 20, background: 'linear-gradient(156deg, #2864B8 0%, #173B78 100%)', color: 'white', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.45)' }}>
              <h1 style={{ color: '#FFDE68', fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Questionário necessário</h1>
              <p style={{ fontWeight: 600, lineHeight: '24px', marginBottom: 24 }}>Responda ao questionário para criar seu cronograma.</p>
              <button onClick={() => router.push('/questionario')} style={{ padding: '14px 28px', border: 0, borderRadius: 10, background: '#FFDE68', color: '#091541', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins' }}>Voltar ao questionário</button>
            </div>
          </div>
        )}

        {mostrandoOrientacao && !bloqueado && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Orientação para criar o primeiro cronograma"
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.7)', padding: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              borderRadius: 20, padding: 28, color: 'white', fontFamily: 'Poppins',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#FFDE68', fontSize: 26, fontWeight: 600 }}>Vamos criar seu cronograma juntos?</h2>
                  <p style={{ margin: '12px 0 0', lineHeight: '24px', fontWeight: 600 }}>Primeiro, você vai escolher as matérias, definir o tempo disponível e indicar os dias em que pode estudar.</p>
                </div>
                <button type="button" aria-label="Fechar orientação" onClick={() => setMostrandoOrientacao(false)} style={{ background: 'transparent', border: 0, color: 'white', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 18, marginTop: 18, lineHeight: '24px' }}>
                <div style={{ color: '#FFDE68', fontSize: 19, fontWeight: 700, marginBottom: 10 }}>Como funcionam os pesos?</div>
                <div><strong>Baixo:</strong> você tem facilidade e precisa estudar menos.</div>
                <div><strong>Normal:</strong> dificuldade moderada e frequência equilibrada.</div>
                <div><strong>Alto:</strong> você precisa dedicar mais tempo à matéria.</div>
                <div><strong>Muito Alto:</strong> uma das suas maiores dificuldades ou prioridades.</div>
                <div><strong>Máximo:</strong> precisa de atenção especial e aparecerá com maior frequência.</div>
              </div>

              <p style={{ margin: '18px 0 0', lineHeight: '24px', fontWeight: 600 }}>
                Eu uso esses pesos para distribuir suas matérias ao longo da rotina. Por exemplo, uma matéria com peso <strong>Máximo</strong> aparecerá mais vezes do que uma matéria com peso <strong>Baixo</strong>.
              </p>
              <p style={{ margin: '12px 0 0', lineHeight: '24px', fontWeight: 600 }}>Quer criar seu primeiro cronograma comigo?</p>

              <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => { setMostrandoOrientacao(false); setMostrando(true); }} style={{ flex: '1 1 220px', minHeight: 48, border: 0, borderRadius: 10, background: '#FFDE68', color: '#091541', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'Poppins' }}>Sim, vamos!</button>
                <button type="button" onClick={() => setMostrandoOrientacao(false)} style={{ flex: '1 1 160px', minHeight: 48, border: '2px solid rgba(255,255,255,0.35)', borderRadius: 10, background: 'transparent', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'Poppins' }}>Agora não</button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard (Mantido aqui fora, mas dentro do main) */}
        {mostrando && (
          <CronogramaWizard
            onClose={() => setMostrando(false)}
            onSuccess={() => {
              setMostrando(false);
              loadCronograma();
            }}
          />
        )}
    </div>
  );
}
