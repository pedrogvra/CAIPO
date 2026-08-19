import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseSelect } from '@/lib/supabase-data';

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Não foi possível conectar ao Supabase.' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        password: senha,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const user = data?.user as { id?: string; email?: string; user_metadata?: { nome?: string } } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const { isConfigured } = getSupabaseConnectionStatus();
    let primeiroAcesso = true;
    let nomeUsuario = user.user_metadata?.nome?.trim() || user.email?.split('@')[0] || 'Usuário';

    if (isConfigured) {
      const usuarios = await supabaseSelect<Array<{ nome: string | null; email: string | null; primeiro_acesso: boolean }>>(
        'usuarios',
        { select: 'nome,email,primeiro_acesso', id: `eq.${user.id}` }
      );
      if (usuarios?.[0]) {
        primeiroAcesso = usuarios[0].primeiro_acesso;
        nomeUsuario = usuarios[0].nome?.trim() || nomeUsuario;
      }
    }

    const token = await createToken({ userId: user.id, email: user.email || email.toLowerCase(), nome: nomeUsuario, primeiro_acesso: primeiroAcesso });

    const responsePayload = NextResponse.json({
      usuario: {
        id: user.id,
        nome: nomeUsuario,
        email: user.email || email.toLowerCase(),
        primeiro_acesso: primeiroAcesso,
      },
    });
    responsePayload.cookies.set('caipo_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return responsePayload;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
