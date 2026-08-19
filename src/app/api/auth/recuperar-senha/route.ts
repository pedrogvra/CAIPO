import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { usuarios } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    // Check if user exists (don't reveal if not found for security)
    await db.select().from(usuarios).where(eq(usuarios.email, email.toLowerCase())).limit(1);

    // In production, you'd send an email here
    // For demo purposes, we just return success
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Recover password error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
