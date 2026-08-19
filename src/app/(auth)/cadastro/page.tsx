'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AuthLayout from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import eyeOpenIcon from '../../../../assets/icons/olho.svg';
import eyeClosedIcon from '../../../../assets/icons/olhos-cruzados.svg';

export default function CadastroPage() {
  const router = useRouter();
  const { cadastro } = useAuth();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar_senha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email || !nome || !senha || !confirmar_senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro('E-mail inválido.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar_senha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await cadastro(email, nome, senha, confirmar_senha);
    setLoading(false);

    if (result.error) {
      setErro(result.error);
      return;
    }

    router.push('/onboarding');
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
        <h1 className="auth-form-title">Cadastre-se</h1>

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
          <label className="auth-form-label">Nome</label>
          <input
            className="auth-form-input"
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Digite seu nome"
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

        <div className="auth-form-field">
          <label className="auth-form-label">Confirme sua senha</label>
          <div style={{ position: 'relative' }}>
            <input
              className="auth-form-input"
              type={mostrarConfirmarSenha ? 'text' : 'password'}
              value={confirmar_senha}
              onChange={e => setConfirmarSenha(e.target.value)}
              placeholder="Digite sua senha novamente"
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setMostrarConfirmarSenha((prev) => !prev)}
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
                src={mostrarConfirmarSenha ? eyeClosedIcon : eyeOpenIcon}
                alt={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                width={18}
                height={18}
                style={{ filter: 'brightness(0) saturate(100%) invert(29%) sepia(37%) saturate(832%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}
              />
            </button>
          </div>
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
          {loading ? 'Criando conta...' : 'Entrar'}
        </button>

        <div className="auth-form-footer">
          Já tem uma conta? <Link href="/login" className="auth-form-link">Entre</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
