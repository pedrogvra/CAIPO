'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AuthLayout from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import eyeOpenIcon from '../../../../assets/icons/olho.svg';
import eyeClosedIcon from '../../../../assets/icons/olhos-cruzados.svg';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro('E-mail inválido.');
      return;
    }

    setLoading(true);
    const result = await login(email, senha);
    setLoading(false);

    if (result.error) {
      setErro(result.error);
      return;
    }

    if (result.primeiro_acesso) {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
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
      <form onSubmit={handleSubmit} className="auth-form">
        <h1 className="auth-form-title">Login</h1>

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

        <div className="auth-form-field">
          <label className="auth-form-label">Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              className="auth-form-input"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setMostrarSenha((prev) => !prev)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                src={mostrarSenha ? eyeClosedIcon : eyeOpenIcon}
                alt={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                width={18}
                height={18}
                style={{ filter: 'brightness(0) saturate(100%) invert(29%) sepia(37%) saturate(832%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}
              />
            </button>
          </div>
        </div>

        <div className="auth-form-row">
          <Link href="/recuperar-senha" className="auth-form-link">
            Esqueci a senha
          </Link>
        </div>

        {erro && (
          <div style={{
            background: 'rgba(255,0,0,0.15)',
            border: '1px solid rgba(255,0,0,0.4)',
            borderRadius: 8,
            padding: '10px 16px',
            color: '#ffaaaa',
            fontSize: 16,
            fontFamily: 'Poppins',
            fontWeight: 600,
          }}>
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="auth-form-button"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="auth-form-footer">
          Não tem uma conta? <Link href="/cadastro" className="auth-form-link">Cadastre-se</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
