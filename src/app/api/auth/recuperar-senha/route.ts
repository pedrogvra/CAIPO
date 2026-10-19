import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: unknown };
    if (typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
    const supabaseKey = (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY
    )?.trim();

    if (!supabaseUrl || !supabaseKey) {
      console.error('Password recovery failed: Supabase URL or public key is not configured.');
      return NextResponse.json({ error: 'O serviço de recuperação de senha não está configurado.' }, { status: 500 });
    }

    const redirectTo = new URL('/redefinir-senha', req.nextUrl.origin).toString();
    const supabaseResponse = await fetch(
      `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      },
    );

    if (!supabaseResponse.ok) {
      const responseBody = await supabaseResponse.json().catch(() => ({})) as {
        msg?: string;
        message?: string;
        error_description?: string;
      };
      const detail = responseBody.msg || responseBody.message || responseBody.error_description;
      console.error('Supabase password recovery failed:', supabaseResponse.status, detail || 'No error details returned.');
      return NextResponse.json(
        { error: 'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.' },
        { status: supabaseResponse.status >= 400 && supabaseResponse.status < 500 ? supabaseResponse.status : 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Password recovery error:', err);
    return NextResponse.json({ error: 'Não foi possível enviar o e-mail de recuperação.' }, { status: 500 });
  }
}
