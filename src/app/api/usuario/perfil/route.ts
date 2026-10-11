import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseUpdate } from '@/lib/supabase-data';

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    if (!getSupabaseConnectionStatus().isConfigured) {
      return NextResponse.json({ error: 'Não foi possível conectar ao Supabase.' }, { status: 500 });
    }

    const body: unknown = await req.json();
    const nome = typeof body === 'object' && body !== null && 'nome' in body && typeof body.nome === 'string'
      ? body.nome.trim()
      : '';

    if (!nome || nome.length > 100) {
      return NextResponse.json({ error: 'Informe um nome com até 100 caracteres.' }, { status: 400 });
    }

    const usuarios = await supabaseUpdate<Array<{ id: string; nome: string }>>(
      'usuarios',
      { nome },
      { id: `eq.${payload.userId}`, select: 'id,nome' },
    );

    if (!usuarios?.length) {
      return NextResponse.json({ error: 'Não foi possível atualizar o perfil.' }, { status: 404 });
    }

    return NextResponse.json({ usuario: usuarios[0] });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Não foi possível atualizar o nome.' }, { status: 500 });
  }
}
