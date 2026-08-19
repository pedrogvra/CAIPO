import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseInsert } from '@/lib/supabase-data';

export async function POST(req: NextRequest) {
  try {
    const { email, nome, senha, confirmar_senha } = await req.json();

    if (!email || !nome || !senha || !confirmar_senha) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }
    if (senha !== confirmar_senha) {
      return NextResponse.json({ error: 'As senhas não coincidem.' }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Não foi possível conectar ao Supabase.' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        password: senha,
        email_confirm: true,
        data: {
          nome: nome.trim(),
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.msg || data?.error_description || 'Não foi possível criar o usuário no Supabase.';
      const status = message.includes('already') || message.includes('exists') ? 400 : 500;
      return NextResponse.json({ error: status === 400 ? 'Este e-mail já está cadastrado.' : 'Não foi possível criar o usuário no Supabase.' }, { status });
    }

    const user = data?.user as { id?: string; email?: string; user_metadata?: { nome?: string } } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: 'Não foi possível criar o usuário no Supabase.' }, { status: 500 });
    }

    const nomeUsuario = user.user_metadata?.nome?.trim() || nome.trim();

    try {
      const inserted = await supabaseInsert<Array<{ id: string }>>('usuarios', {
        id: user.id,
        nome: nomeUsuario,
        email: user.email || email.toLowerCase(),
        senha_hash: 'supabase_auth',
        primeiro_acesso: true,
      }, { on_conflict: 'id', select: 'id' });

      if (!inserted || !Array.isArray(inserted) || inserted.length === 0) {
        console.error('Register insert usuarios error: no row inserted', inserted);
        return NextResponse.json({ error: 'Não foi possível criar o usuário no Supabase.' }, { status: 500 });
      }
    } catch (insertError) {
      console.error('Register insert usuarios error:', insertError);
      return NextResponse.json({ error: 'Não foi possível criar o usuário no Supabase.' }, { status: 500 });
    }

    const token = await createToken({ userId: user.id, email: user.email || email.toLowerCase(), nome: nomeUsuario, primeiro_acesso: true });
    const responsePayload = NextResponse.json({
      usuario: { id: user.id, nome: nomeUsuario, email: user.email || email.toLowerCase(), primeiro_acesso: true },
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
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Não foi possível criar o usuário no Supabase.' }, { status: 500 });
  }
}
