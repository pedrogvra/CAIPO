import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseSelect } from '@/lib/supabase-data';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) {
      return NextResponse.json({ usuario: null });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ usuario: null });
    }

    const { isConfigured } = getSupabaseConnectionStatus();
    if (!isConfigured) {
      return NextResponse.json({ error: 'Não foi possível conectar ao Supabase.' }, { status: 500 });
    }

    const usuarios = await supabaseSelect<Array<{ id: string; nome: string | null; email: string | null; primeiro_acesso: boolean }>>(
      'usuarios',
      { select: 'id,nome,email,primeiro_acesso', id: `eq.${payload.userId}` }
    );

    const usuario = usuarios?.[0] ?? null;
    if (!usuario) {
      return NextResponse.json({ usuario: { id: payload.userId, nome: payload.nome || 'Usuário', email: payload.email, primeiro_acesso: payload.primeiro_acesso ?? true } });
    }

    return NextResponse.json({ usuario });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
