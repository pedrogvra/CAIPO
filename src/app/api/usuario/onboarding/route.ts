import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseUpdate } from '@/lib/supabase-data';

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const { isConfigured } = getSupabaseConnectionStatus();
    if (!isConfigured) {
      return NextResponse.json({ error: 'Não foi possível conectar ao Supabase.' }, { status: 500 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.serie !== undefined) updateData.serie = body.serie;
    if (body.objetivo !== undefined) updateData.objetivo = body.objetivo;
    if (body.primeiro_acesso !== undefined) updateData.primeiro_acesso = body.primeiro_acesso;

    await supabaseUpdate('usuarios', updateData, { id: `eq.${payload.userId}` });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
