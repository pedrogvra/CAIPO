export interface Usuario {
  id: string;
  nome: string;
  email: string;
  foto_url?: string | null;
  serie?: string | null;
  objetivo?: string | null;
  primeiro_acesso?: boolean | null;
  created_at?: Date | null;
}

export interface AuthState {
  usuario: Usuario | null;
  loading: boolean;
  token: string | null;
}
