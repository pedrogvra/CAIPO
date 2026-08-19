'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';

type Estado = 'formulario' | 'confirmacao';

export default function RecuperarSenhaPage() {
  const [estado, setEstado] = useState<Estado>('formulario');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email) { setErro('Informe seu e-mail.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErro('E-mail inválido.'); return; }

    setLoading(true);
    await fetch('/api/auth/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setEstado('confirmacao');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '0 10px',
    background: 'white',
    borderRadius: 8,
    border: 'none',
    outline: 'none',
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: 600,
    color: '#333',
  };

  const labelStyle: React.CSSProperties = {
    color: 'white',
    fontSize: 'clamp(16px, 1.8vw, 20px)',
    fontFamily: 'Poppins',
    fontWeight: 600,
    textShadow: '0px 4px 4px rgba(30, 85, 168, 1.00)',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <AuthLayout>
      <div className="auth-form">
        <h1 className="auth-form-title">Esqueci a senha</h1>

        {estado === 'formulario' ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-field">
              <label className="auth-form-label">Email</label>
              <input
                className="auth-form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Digite seu email"
              />
            </div>

            {erro && (
              <div className="auth-form-error">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-form-button"
            >
              {loading ? 'Enviando...' : 'Entrar'}
            </button>

            <div className="auth-form-footer">
              Lembrou a senha? <Link href="/login" className="auth-form-link">Faça Login</Link>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              textAlign: 'center',
              fontSize: 24,
              fontFamily: 'Poppins',
              fontWeight: 600,
              color: 'white',
              textShadow: '0px 4px 4px rgba(30, 85, 168, 1.00)',
              lineHeight: '36px',
            }}>
              Observe sua caixa de email e altere sua senha!
            </div>

            <Link href="/login" className="auth-form-link" style={{ display: 'block', width: '100%' }}>
              <button className="auth-form-button" type="button">
                Login
              </button>
            </Link>

            <div className="auth-form-footer" style={{ marginTop: 8 }}>
              Não funcionou? <button
                onClick={() => setEstado('formulario')}
                className="auth-form-link"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Tente novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
