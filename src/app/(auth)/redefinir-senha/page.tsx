'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { createClient } from '@/utils/supabase/client';
import { validarSenha } from '@/lib/validacaoSenha';

type Estado = 'validando' | 'pronto' | 'concluido' | 'invalido';

export default function RedefinirSenhaPage() {
  const [estado, setEstado] = useState<Estado>('validando');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const codigoErro = hash.get('error_code');
    if (codigoErro) {
      const mensagemErro = codigoErro === 'otp_expired'
        ? 'Este link expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.'
        : 'Este link de recuperação não é válido. Solicite um novo e-mail.';
      const invalidLinkTimeout = window.setTimeout(() => {
        setErro(mensagemErro);
        setEstado('invalido');
      }, 0);
      return () => window.clearTimeout(invalidLinkTimeout);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setEstado('pronto');
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const timeout = window.setTimeout(() => {
      setEstado(current => {
        if (current === 'validando') {
          setErro('Não foi possível validar o link. Solicite um novo e-mail de recuperação.');
          return 'invalido';
        }
        return current;
      });
    }, 10000);

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro('');

    const erroValidacao = validarSenha(senha);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password: senha });
      if (error) {
        console.error('Erro ao atualizar senha pelo Supabase:', error.message);
        setErro('Não foi possível atualizar sua senha. Solicite um novo link e tente novamente.');
        return;
      }
      setEstado('concluido');
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      setErro('Não foi possível atualizar sua senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-form">
        <h1 className="auth-form-title">Redefinir senha</h1>

        {estado === 'validando' && (
          <div role="status" style={{ color: 'white', textAlign: 'center', fontWeight: 600 }}>
            Validando seu link de recuperação...
          </div>
        )}

        {estado === 'pronto' && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-field">
              <label className="auth-form-label" htmlFor="nova-senha">Nova senha</label>
              <input
                id="nova-senha"
                className="auth-form-input"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={event => setSenha(event.target.value)}
                placeholder="Digite sua nova senha"
                required
              />
            </div>
            <div className="auth-form-field">
              <label className="auth-form-label" htmlFor="confirmar-senha">Confirme a nova senha</label>
              <input
                id="confirmar-senha"
                className="auth-form-input"
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={event => setConfirmarSenha(event.target.value)}
                placeholder="Digite sua nova senha novamente"
                required
              />
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Poppins', marginTop: 4 }}>
                Mínimo de 8 caracteres, com pelo menos uma letra e um dígito.
              </div>
            </div>
            {erro && <div className="auth-form-error" role="alert">{erro}</div>}
            <button type="submit" disabled={loading} className="auth-form-button">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {estado === 'invalido' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="auth-form-error" role="alert">{erro}</div>
            <Link href="/recuperar-senha" className="auth-form-button" style={{ display: 'block', textAlign: 'center' }}>
              Solicitar novo link
            </Link>
          </div>
        )}

        {estado === 'concluido' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div role="status" style={{ color: 'white', textAlign: 'center', fontWeight: 600 }}>
              Sua senha foi redefinida com sucesso.
            </div>
            <Link href="/login" className="auth-form-button" style={{ display: 'block', textAlign: 'center' }}>
              Ir para o login
            </Link>
          </div>
        )}

        {estado !== 'concluido' && estado !== 'invalido' && (
          <div className="auth-form-footer">
            <Link href="/login" className="auth-form-link">Voltar ao login</Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
