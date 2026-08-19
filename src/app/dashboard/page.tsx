'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';
import Image from 'next/image';
import caipoBoneco from '../../../assets/Caipo boneco.svg';
import touchIcon from '../../../assets/icons/toque.svg';

interface OfensivaData { streak_atual: number; maior_streak: number; frequencia_ativa: boolean; }
interface CronogramaData {
  id: string;
  nome: string;
  dias_disponiveis?: number[];
  sessoes: Array<{ materia: string; dia_semana: number; horario_inicio: string; horario_fim: string; tipo?: string | null }>;
}
interface PomodoroConfigData { tempo_foco: number; }

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MENSAGENS_FREQUENCIA = {
  desativada: {
    manha: [
      'Você ainda não estudou hoje. Ainda dá tempo!',
      'Bom dia! Vamos começar o estudo de hoje?',
      'Um pequeno começo pode mudar o seu dia. Vamos estudar?',
      'Seu cronograma está esperando por você. Bora começar?',
      'Que tal reservar alguns minutos para o seu futuro hoje?',
    ],
    tarde: [
      'A tarde ainda está começando. Que tal fazer um Pomodoro?',
      'Ainda dá tempo de estudar hoje. Vamos nessa?',
      'Pausa no que está fazendo e venha conquistar um pouco de foco.',
      'Você pode começar com uma matéria. O importante é começar.',
      'Seu próximo avanço pode começar agora. Vamos estudar?',
    ],
    noite: [
      'O dia ainda não acabou. Um foco agora já conta!',
      'Que tal fechar o dia com uma sessão de foco?',
      'Mesmo alguns minutos de estudo já fazem diferença.',
      'Ainda dá para cumprir uma pequena meta antes de descansar.',
      'Vamos terminar o dia com a sensação de dever cumprido?',
    ],
  },
  ativada: {
    manha: [
      'Mandou bem começando cedo! Continue assim.',
      'Seu foco de hoje já começou. Bom trabalho!',
      'O primeiro passo do dia já foi dado. Que ritmo bonito!',
      'Você começou bem. Seu eu do futuro agradece.',
      'Frequência ativada logo cedo. Continue construindo esse hábito!',
    ],
    tarde: [
      'Você já estudou hoje. Que tal manter o ritmo?',
      'Frequência ativada! Mais um foco pode deixar o dia ainda melhor.',
      'Seu esforço de hoje já está contando. Muito bem!',
      'Você está no caminho certo. Um pouco mais de foco?',
      'A constância está aparecendo. Continue firme!',
    ],
    noite: [
      'Você cumpriu seu foco de hoje. Parabéns!',
      'Mais um dia na conta. Descanse sabendo que você avançou.',
      'Hoje você fez a sua parte. Que orgulho!',
      'Frequência garantida por hoje. Bom descanso!',
      'Você não deixou o dia passar em branco. Muito bem!',
    ],
  },
};

function obterMensagemFrequencia(ativa: boolean) {
  const agora = new Date();
  const hora = agora.getHours();
  const periodo = hora < 12 ? 'manha' : hora < 18 ? 'tarde' : 'noite';
  const mensagens = MENSAGENS_FREQUENCIA[ativa ? 'ativada' : 'desativada'][periodo];
  const indice = (agora.getDate() + hora) % mensagens.length;
  return mensagens[indice];
}

export default function DashboardPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const [ofensiva, setOfensiva] = useState<OfensivaData>({ streak_atual: 0, maior_streak: 0, frequencia_ativa: false });
  const [cronograma, setCronograma] = useState<CronogramaData | null>(null);
  const [pomConfig, setPomConfig] = useState<PomodoroConfigData>({ tempo_foco: 25 });
  const [questionarioPendente, setQuestionarioPendente] = useState(false);

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  useEffect(() => {
    if (!usuario) return;
    fetch('/api/frequencia', { headers: { 'x-time-zone': Intl.DateTimeFormat().resolvedOptions().timeZone } }).then(r => r.json()).then(d => {
      if (d.streak && d.frequencia_ativa !== undefined) {
        setOfensiva({
          streak_atual: d.streak.current,
          maior_streak: d.streak.best,
          frequencia_ativa: d.frequencia_ativa,
        });
      }
    });
    fetch('/api/cronograma').then(r => r.json()).then(d => {
      if (d.cronograma) setCronograma(d.cronograma);
    });
    fetch('/api/pomodoro/config').then(r => r.json()).then(d => {
      if (d.config) setPomConfig(d.config);
    });
    fetch('/api/questionario/progresso').then(r => r.json()).then(d => {
      const respostasDiagnostico = d.progresso?.respostas_json?.diagnostico_inicial?.respostas || {};
      setQuestionarioPendente(!(d.progresso?.concluido === true || d.progresso?.concluido === 'true' || Object.keys(respostasDiagnostico).length >= 10));
    });
  }, [usuario]);

  if (loading || !usuario) return (
    <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
    </div>
  );

  const primeiroNome = usuario.nome?.split(' ')[0] || 'Usuário';
  const mensagemFrequencia = obterMensagemFrequencia(ofensiva.frequencia_ativa);

  return (
    <div className="dashboard-page" style={{
      height: 'auto',
      background: '#091541',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      paddingTop: 0,
      paddingBottom: 0,
      paddingRight: 0,
      paddingLeft: 0,
      gap: 'var(--page-padding)',
      fontFamily: 'Poppins',
      overflow: 'visible',
    }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'visible' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <HeaderUsuario />
        </div>

        {/* Card Boas-vindas */}
        <div className="dashboard-welcome" style={{
          background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
          boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
          borderRadius: 25,
          padding: '20px 24px',
          position: 'relative',
          minHeight: 160,
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div className="dashboard-welcome-copy">
            <div style={{ fontSize: 40, fontWeight: 600, color: 'white', lineHeight: '1.2' }}>
              Seja bem-vindo,
            </div>
            <div style={{ fontSize: 40, fontWeight: 600, color: '#FFDE68', lineHeight: '1.2' }}>
              {primeiroNome}!
            </div>
            <div style={{ fontSize: 32, fontWeight: 600, color: 'white', marginTop: 16 }}>
              vamos estudar?
            </div>
          </div>
          <Image src={caipoBoneco} alt="Caipo" width={120} height={120} style={{ objectFit: 'contain' }} />
        </div>

        {/* Cards inferiores */}
        <div className="dashboard-lower-cards" style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {/* Card Frequência */}
          <div className="dashboard-frequency-card" style={{
            flex: '1 1 300px',
            minWidth: 0,
            background: 'linear-gradient(45deg, #1E55A8 32%, #0C3067 100%)',
            boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
            borderRadius: 20,
              padding: '13px 18px',
            cursor: 'pointer',
            position: 'relative',
              minHeight: 180,
              overflow: 'visible',
          }}
          onClick={() => router.push('/frequencia')}
          >
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              <span style={{ color: 'white' }}>Frequência </span>
              <span style={{ color: ofensiva.frequencia_ativa ? '#FFDE68' : 'rgba(255,255,255,0.75)' }}>
                {ofensiva.frequencia_ativa ? 'ativada' : 'desativada'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 8 }}>
              <span style={{ color: ofensiva.frequencia_ativa ? '#FFDE68' : 'rgba(255,222,104,0.58)', fontSize: 80, fontWeight: 600, lineHeight: 1 }}>
                {ofensiva.streak_atual}
              </span>
              <span style={{ color: ofensiva.frequencia_ativa ? '#FFDE68' : 'rgba(255,222,104,0.58)', fontSize: 32, fontWeight: 600, marginLeft: 8, marginBottom: 1 }}>
                {ofensiva.streak_atual === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <div style={{
              color: ofensiva.frequencia_ativa ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.72)',
              fontSize: 15,
              fontWeight: 600,
              lineHeight: '22px',
              maxWidth: 360,
              marginTop: 10,
            }}>
              {mensagemFrequencia}
            </div>
          </div>

          {/* Card Cronograma */}
          <div className="dashboard-schedule-card" style={{
            flex: '1 1 300px',
            minWidth: 0,
            background: '#1E55A8',
            boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
            borderRadius: 20,
              padding: '13px 18px',
            cursor: 'pointer',
            overflow: 'hidden',
            
          }}
          onClick={() => router.push('/cronograma')}
          >
            <div style={{ color: '#FFDE68', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              Último cronograma feito
            </div>
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 12,
              minHeight: 120,
              overflow: 'auto',
            }}>
              {cronograma ? (
                <div>
                  <div style={{ fontWeight: 700, color: '#091541', marginBottom: 8, fontSize: 14 }}>{cronograma.nome}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 11 }}>
                    {(cronograma.dias_disponiveis && cronograma.dias_disponiveis.length > 0
                      ? [...new Set(cronograma.dias_disponiveis)].sort((a, b) => a - b)
                      : [0, 1, 2, 3, 4, 5, 6]
                    ).map((dia, index) => (
                      <div key={`${dia}-${index}`} style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#1E55A8', marginBottom: 4 }}>{DIAS[dia] ?? `Dia ${dia + 1}`}</div>
                        {cronograma.sessoes.filter(s => s.dia_semana === dia).slice(0, 2).map((s, j) => (
                          <div key={`${s.materia}-${s.horario_inicio}-${j}`} style={{
                            background: '#1E55A8',
                            color: 'white',
                            borderRadius: 4,
                            padding: '2px 4px',
                            marginBottom: 2,
                            fontSize: 10,
                          }}>
                            {s.materia.slice(0, 6)}
                          </div>
                        ))}
                        {cronograma.sessoes.filter(s => s.dia_semana === dia).length === 0 && (
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>–</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#B4B4B4', fontSize: 14, fontWeight: 600, textAlign: 'center', paddingTop: 24 }}>
                  Crie seu primeiro cronograma
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Pomodoro */}
        <div className="dashboard-pomodoro-card" style={{
          background: 'linear-gradient(180deg, #F8FF87 0%, #FFDE68 100%)',
          boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
          borderRadius: 20,
          padding: '13px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            {questionarioPendente && (
              <div style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 16, background: '#091541', color: '#FFDE68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span>Você tem um questionário salvo para continuar.</span>
                <button onClick={() => router.push('/questionario')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#FFDE68', color: '#091541', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins' }}>Voltar ao questionário</button>
              </div>
            )}
            <div style={{ color: '#091541', fontSize: 24, fontWeight: 600 }}>Pomodoro</div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ color: '#091541', fontSize: 80, fontWeight: 600, lineHeight: 1 }}>
                {String(pomConfig.tempo_foco).padStart(2, '0')}:00
              </span>
              <span style={{ color: '#091541', fontSize: 32, fontWeight: 600, marginLeft: 8, marginBottom: 8 }}>
                min
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/pomodoro')}
            aria-label="Abrir Pomodoro"
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'white',
              boxShadow: '4px 4px 5.5px rgba(0, 0, 0, 0.25)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image src={touchIcon} alt="Abrir Pomodoro" width={40} height={48} style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(34%) saturate(1367%) hue-rotate(183deg) brightness(96%) contrast(99%)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
