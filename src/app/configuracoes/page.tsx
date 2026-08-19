'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [refazendo, setRefazendo] = useState(false);

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  const confirmarRefazerQuestionario = async () => {
    setRefazendo(true);
    const response = await fetch('/api/questionario/progresso', { method: 'DELETE' });
    if (response.ok) {
      router.push('/questionario');
    } else {
      setRefazendo(false);
      setMostrarConfirmacao(false);
    }
  };

  if (loading || !usuario) return (
    <div style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 24, fontFamily: 'Poppins', fontWeight: 600 }}>Carregando...</div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col h-full w-full gap-6">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <HeaderUsuario />
        </div>

        <div className="scrollbar-hidden" style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
          boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
          borderRadius: 20,
          padding: 'var(--page-padding)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          <h1 style={{ color: '#FFDE68', fontSize: 32, fontWeight: 600, marginBottom: 32 }}>
            Configurações
          </h1>

          {/* Perfil */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Perfil</h2>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nome</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 600 }}>{usuario.nome}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 6 }}>Email</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 600 }}>{usuario.email}</div>
            </div>
          </div>

          {/* Questionário */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Questionário</h2>
            <button
              onClick={() => setMostrarConfirmacao(true)}
              style={{
                padding: '14px 28px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.3)',
                background: 'transparent', color: 'white', fontSize: 16, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins',
              }}>
              Refazer questionário de perfil
            </button>
          </div>
        </div>

        {mostrarConfirmacao && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, background: 'rgba(0,0,0,0.7)',
          }}>
            <div style={{
              width: '100%', maxWidth: 440, padding: 28,
              borderRadius: 20, background: '#1E55A8',
              boxShadow: '6px 6px 10.6px rgba(0,0,0,0.25)',
            }}>
              <h2 style={{ color: '#FFDE68', fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
                Refazer questionário?
              </h2>
              <p style={{ color: 'white', fontSize: 16, fontWeight: 600, lineHeight: '24px', marginBottom: 24 }}>
                Seu questionário anterior será apagado e você poderá responder novamente.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setMostrarConfirmacao(false)}
                  disabled={refazendo}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: '2px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRefazerQuestionario}
                  disabled={refazendo}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#FFDE68', color: '#091541', fontWeight: 600, cursor: 'pointer' }}
                >
                  {refazendo ? 'Preparando...' : 'Aceitar'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
