import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'caipo-secret-key-2024');
const EXPIRES_IN = '7d';

type FallbackUser = {
  id: string;
  email: string;
  nome: string;
  senha_hash: string;
  primeiro_acesso: boolean;
};

const fallbackUsers = new Map<string, FallbackUser>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: { userId: string; email: string; nome?: string; primeiro_acesso?: boolean }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; nome?: string; primeiro_acesso?: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: string; email: string; nome?: string; primeiro_acesso?: boolean };
  } catch {
    return null;
  }
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/caipo_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function getFallbackUserByEmail(email: string): Promise<FallbackUser | null> {
  return fallbackUsers.get(email.toLowerCase()) ?? null;
}

export async function createFallbackUser(email: string, nome: string, senha: string): Promise<FallbackUser | null> {
  const normalizedEmail = email.toLowerCase();
  if (fallbackUsers.has(normalizedEmail)) {
    return null;
  }

  const senha_hash = await hashPassword(senha);
  const user: FallbackUser = {
    id: `local-${Math.random().toString(36).slice(2, 10)}`,
    email: normalizedEmail,
    nome: nome.trim(),
    senha_hash,
    primeiro_acesso: true,
  };

  fallbackUsers.set(normalizedEmail, user);
  return user;
}
