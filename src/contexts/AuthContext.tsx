'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Usuario } from '@/types/usuario';

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ error?: string; primeiro_acesso?: boolean }>;
  cadastro: (email: string, nome: string, senha: string, confirmar_senha: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUsuario = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUsuario(data.usuario);
      } else {
        setUsuario(null);
      }
    } catch {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    refreshUsuario().finally(() => setLoading(false));
  }, [refreshUsuario]);

  const login = async (email: string, senha: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
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
    setUsuario(data.usuario);
    return {};
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, cadastro, logout, refreshUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
