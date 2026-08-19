'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import caipoBoneco from '../../../assets/Caipo boneco.svg';

export default function OnboardingPage() {
  const router = useRouter();
  const { usuario, loading, refreshUsuario } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  const steps = [
    {
      title: 'Bem-vindo ao CAIPO!',
      mensagem: `Olá${usuario?.nome ? ', ' + usuario.nome.split(' ')[0] : ''}! Meu nome é Caipo. É um prazer conhecer você!`,
      subtitulo: 'Sou seu assistente de estudos e vou te ajudar a organizar sua rotina de forma inteligente.',
    },
    {
      title: 'Como funciona?',
      mensagem: 'O CAIPO cria cronogramas personalizados com base no seu perfil de estudante.',
      subtitulo: 'Responda algumas perguntas rápidas para personalizarmos sua experiência.',
    },
    {
      title: 'Pronto para começar?',
      mensagem: 'Vamos criar seu perfil agora. Leva apenas alguns minutos!',
      subtitulo: 'Você pode pausar e continuar depois. Seu progresso é salvo automaticamente.',
    },
  ];

  const currentStep = steps[step];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      setSaving(true);
      await fetch('/api/usuario/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primeiro_acesso: false }),
      });
      await refreshUsuario();
      setSaving(false);
      router.push('/questionario');
    }
  };

  if (loading || !usuario) return (
    <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#091541',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      fontFamily: 'Poppins',
    }}>
      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 600, marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i <= step ? '#FFDE68' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, marginTop: 8 }}>
          Passo {step + 1} de {steps.length}
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
        borderRadius: 25,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
      }}>
        <Image src={caipoBoneco} alt="Caipo" width={140} height={140} style={{ objectFit: 'contain' }} />

        {/* Balão de fala */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '16px 24px',
          color: '#091541',
          fontSize: 18,
          fontWeight: 600,
          textAlign: 'center',
          width: '100%',
          lineHeight: '28px',
        }}>
          {currentStep.mensagem}
        </div>

        <h2 style={{ color: '#FFDE68', fontSize: 28, fontWeight: 600, textAlign: 'center', margin: 0 }}>
          {currentStep.title}
        </h2>

        <p style={{ color: 'white', fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: '28px', margin: 0 }}>
          {currentStep.subtitulo}
        </p>

        <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                padding: '14px 32px',
                borderRadius: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: 'white',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Poppins',
              }}
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            style={{
              padding: '14px 48px',
              borderRadius: 12,
              border: 'none',
              background: '#FFDE68',
              color: '#091541',
              fontSize: 18,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Poppins',
              flex: step === 0 ? 1 : 'none',
            }}
          >
            {step === steps.length - 1 ? (saving ? 'Aguarde...' : 'Começar') : 'Próximo'}
          </button>
        </div>

        {step === 0 && (
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins',
              textDecoration: 'underline',
            }}
          >
            Pular por agora
          </button>
        )}
      </div>
    </div>
  );
}
