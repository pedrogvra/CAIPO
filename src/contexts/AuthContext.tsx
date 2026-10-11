'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Usuario } from '@/types/usuario';

export type QuestionarioStatus = 'loading' | 'pendente' | 'concluido' | 'erro' | 'idle';

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  questionarioStatus: QuestionarioStatus;
  refreshQuestionario: () => Promise<void>;
  setQuestionarioConcluido: (concluido: boolean) => void;
  login: (email: string, senha: string) => Promise<{ error?: string; primeiro_acesso?: boolean }>;
  cadastro: (email: string, nome: string, senha: string, confirmar_senha: string) => Promise<{ error?: string }>;
  atualizarNome: (nome: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionarioStatus, setQuestionarioStatus] = useState<QuestionarioStatus>('loading');
  const questionarioRequestId = useRef(0);

  const loadQuestionarioStatus = useCallback(async () => {
    const requestId = ++questionarioRequestId.current;
    try {
      const response = await fetch('/api/questionario/progresso');
      if (!response.ok) throw new Error(`Questionário progress request failed (${response.status})`);
      const data = await response.json();
      if (requestId === questionarioRequestId.current) {
        setQuestionarioStatus(data.progresso?.concluido === true ? 'concluido' : 'pendente');
      }
    } catch (error) {
      console.error('Erro ao verificar conclusão do questionário:', error);
      if (requestId === questionarioRequestId.current) setQuestionarioStatus('erro');
    }
  }, []);

  const refreshQuestionario = useCallback(async () => {
    setQuestionarioStatus('loading');
    await loadQuestionarioStatus();
  }, [loadQuestionarioStatus]);

  const setQuestionarioConcluido = useCallback((concluido: boolean) => {
    questionarioRequestId.current += 1;
    setQuestionarioStatus(concluido ? 'concluido' : 'pendente');
  }, []);

  const refreshUsuario = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        questionarioRequestId.current += 1;
        setQuestionarioStatus(data.usuario ? 'loading' : 'idle');
        setUsuario(data.usuario);
      } else {
        questionarioRequestId.current += 1;
        setQuestionarioStatus('idle');
        setUsuario(null);
      }
    } catch {
      questionarioRequestId.current += 1;
      setQuestionarioStatus('idle');
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshUsuario).finally(() => setLoading(false));
  }, [refreshUsuario]);

  const usuarioId = usuario?.id;

  useEffect(() => {
    if (!loading && usuarioId) {
      void Promise.resolve().then(loadQuestionarioStatus);
    }
  }, [usuarioId, loading, loadQuestionarioStatus]);

  const login = async (email: string, senha: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    questionarioRequestId.current += 1;
    setQuestionarioStatus('loading');
    setUsuario(data.usuario);
    return { primeiro_acesso: data.usuario.primeiro_acesso };
  };

  const cadastro = async (email: string, nome: string, senha: string, confirmar_senha: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome, senha, confirmar_senha }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    questionarioRequestId.current += 1;
    setQuestionarioStatus('loading');
    setUsuario(data.usuario);
    return {};
  };

  const atualizarNome = async (nome: string) => {
    const res = await fetch('/api/usuario/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };

    setUsuario((current) => current ? { ...current, nome: data.usuario.nome } : current);
    return {};
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    questionarioRequestId.current += 1;
    setQuestionarioStatus('idle');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, questionarioStatus, refreshQuestionario, setQuestionarioConcluido, login, cadastro, atualizarNome, logout, refreshUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
