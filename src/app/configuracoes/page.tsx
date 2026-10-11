'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import HeaderUsuario from '@/components/layout/HeaderUsuario';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { usuario, loading, atualizarNome, setQuestionarioConcluido } = useAuth();
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [refazendo, setRefazendo] = useState(false);
  const [nome, setNome] = useState<string | null>(null);
  const [nomeEmFoco, setNomeEmFoco] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [mensagemNome, setMensagemNome] = useState('');
  const [erroNome, setErroNome] = useState('');

  useEffect(() => {
    if (!loading && !usuario) router.push('/login');
  }, [usuario, loading, router]);

  const confirmarRefazerQuestionario = async () => {
    setRefazendo(true);
    const response = await fetch('/api/questionario/progresso', { method: 'DELETE' });
    if (response.ok) {
      setQuestionarioConcluido(false);
      router.push('/questionario');
    } else {
      setRefazendo(false);
      setMostrarConfirmacao(false);
    }
  };

  const salvarNome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvandoNome(true);
    setMensagemNome('');
    setErroNome('');

    const nomeAtualizado = nome ?? usuario?.nome ?? '';
    const resultado = await atualizarNome(nomeAtualizado);
    if (resultado.error) {
      setErroNome(resultado.error);
    } else {
      setMensagemNome('Nome atualizado com sucesso.');
    }
    setSalvandoNome(false);
  };

  if (loading || !usuario) return (
    <div className="page-loading" style={{ minHeight: '100vh', background: '#091541', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <form onSubmit={salvarNome}>
                <label htmlFor="nome-perfil" style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  Nome
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <input
                    id="nome-perfil"
                    type="text"
                    value={nome ?? usuario.nome}
                    onChange={(event) => {
                      setNome(event.target.value);
                      setMensagemNome('');
                      setErroNome('');
                    }}
                    onFocus={() => setNomeEmFoco(true)}
                    onBlur={() => setNomeEmFoco(false)}
                    maxLength={100}
                    required
                    aria-describedby={erroNome ? 'nome-perfil-erro' : mensagemNome ? 'nome-perfil-sucesso' : undefined}
                    style={{ flex: '1 1 220px', minWidth: 0, padding: '12px 14px', borderRadius: 10, border: nomeEmFoco ? '1px solid transparent' : '1px solid rgba(255,255,255,0.3)', outline: 'none', boxShadow: 'none', background: 'white', color: '#091541', fontSize: 16, fontWeight: 600 }}
                  />
                  <button
                    type="submit"
                    disabled={salvandoNome || !(nome ?? usuario.nome).trim() || (nome ?? usuario.nome).trim() === usuario.nome}
                    style={{ padding: '12px 20px', borderRadius: 10, border: 0, background: '#FFDE68', color: '#091541', fontSize: 15, fontWeight: 700, cursor: salvandoNome || !(nome ?? usuario.nome).trim() || (nome ?? usuario.nome).trim() === usuario.nome ? 'not-allowed' : 'pointer', opacity: salvandoNome || !(nome ?? usuario.nome).trim() || (nome ?? usuario.nome).trim() === usuario.nome ? 0.65 : 1 }}
                  >
                    {salvandoNome ? 'Salvando...' : 'Salvar nome'}
                  </button>
                </div>
                {erroNome && <p id="nome-perfil-erro" role="alert" style={{ color: '#fecaca', fontWeight: 600, marginTop: 10 }}>{erroNome}</p>}
                {mensagemNome && <p id="nome-perfil-sucesso" role="status" style={{ color: '#bbf7d0', fontWeight: 600, marginTop: 10 }}>{mensagemNome}</p>}
              </form>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 6 }}>E-mail</div>
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
