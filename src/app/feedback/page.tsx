'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import caipoBoneco from '../../../assets/Caipo boneco.svg';
import { calcularPerfil } from '@/services/algoritmos/calcularPerfil';
import type { Resposta } from '@/types/questionario';

export default function FeedbackPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const [perfil, setPerfil] = useState<ReturnType<typeof calcularPerfil> | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  useEffect(() => {
    if (!usuario) return;
    fetch('/api/questionario/progresso').then(r => r.json()).then(d => {
      if (d.progresso) {
        const p = d.progresso;
        const estado = p.respostas_json || {};
        const respostas = (estado.diagnostico_inicial?.respostas || estado) as Record<string, Resposta>;
        const resultado = calcularPerfil(p.pontuacao_atual || 0, respostas, []);
        setPerfil(resultado);
      }
      setCarregando(false);
    }).catch(() => setCarregando(false));
  }, [usuario]);

  const corMap = {
    verde: { bg: '#1a5c2e', border: '#22c55e', text: '#86efac', emoji: '🌟' },
    amarelo: { bg: '#5c4a1a', border: '#FFDE68', text: '#FFDE68', emoji: '⭐' },
    vermelho: { bg: '#5c1a1a', border: '#f87171', text: '#fca5a5', emoji: '💪' },
  };

  if (loading || carregando) return (
    <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Calculando seu perfil...</div>
    </div>
  );

  if (!perfil) return (
    <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ color: 'white', fontSize: 20, fontFamily: 'Poppins', fontWeight: 600, textAlign: 'center' }}>
        Questionário não concluído ainda.
      </div>
      <button onClick={() => router.push('/questionario')} style={{
        marginTop: 20, padding: '14px 32px', borderRadius: 12, background: '#FFDE68',
        border: 'none', color: '#091541', fontSize: 18, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins',
      }}>
        Responder Questionário
      </button>
    </div>
  );

  const cor = corMap[perfil.classificacao];

  return (
    <div className="feedback-shell" style={{
      minHeight: '100vh',
      background: '#091541',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px 24px',
      boxSizing: 'border-box',
      fontFamily: 'Poppins',
      overflow: 'visible',
    }}>
      <div className="feedback-content" style={{ width: '100%', maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingRight: 8, paddingBottom: 0 }}>
        {/* Header com Caipo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18, overflow: 'visible' }}>
          <div style={{ marginTop: 0, overflow: 'visible', display: 'flex', justifyContent: 'center' }}>
            <Image
              src={caipoBoneco}
              alt="Caipo"
              width={120}
              height={120}
              style={{ objectFit: 'contain', display: 'block', width: 'clamp(64px, 9vw, 120px)', height: 'auto', maxWidth: '120px' }}
            />
          </div>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '10px 16px',
            color: '#091541',
            fontSize: 15,
            fontWeight: 600,
            textAlign: 'center',
            marginTop: 10,
            maxWidth: 360,
            lineHeight: '22px',
          }}>
            Analisei suas respostas e preparei seu diagnóstico personalizado!
          </div>
        </div>

        {/* Card do perfil */}
        <div style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          background: `linear-gradient(156deg, ${cor.bg} 0%, #091541 100%)`,
          border: `2px solid ${cor.border}`,
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
            <div style={{ fontSize: 38 }}>{cor.emoji}</div>
            <div>
              <div style={{ color: cor.text, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Seu perfil de estudante
              </div>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 700, lineHeight: '26px', marginTop: 2 }}>
                {perfil.descricao}
              </div>
            </div>
          </div>
        </div>

        {/* Pontos fortes */}
        <div style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
          borderRadius: 12,
          padding: 14,
          boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ color: '#FFDE68', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Seus pontos fortes
          </div>
          {perfil.pontos_fortes.map((pf, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#FFDE68',
                marginTop: 8, flexShrink: 0,
              }} />
              <span style={{ color: 'white', fontSize: 15, fontWeight: 600, lineHeight: '22px' }}>{pf}</span>
            </div>
          ))}
        </div>

        {/* Hábitos a desenvolver */}
        <div style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
          borderRadius: 12,
          padding: 14,
          boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ color: '#F8FF87', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Hábitos a desenvolver
          </div>
          {perfil.habitos_desenvolver.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#F8FF87',
                marginTop: 8, flexShrink: 0,
              }} />
              <span style={{ color: 'white', fontSize: 15, fontWeight: 600, lineHeight: '22px' }}>{h}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          <button
            onClick={() => router.push('/cronograma')}
              style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: '#FFDE68',
              color: '#091541',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Poppins',
              boxShadow: '4px 4px 5.5px rgba(0, 0, 0, 0.25)',
            }}
          >
            Criar meu cronograma
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins',
              marginBottom: 4,
            }}
          >
            Ver meu dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
