import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { pomodoro_config } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ config: { tempo_foco: 25, tempo_pausa_curta: 5, tempo_pausa_longa: 15, sessoes_antes_pausa_longa: 4 } });
    }

    const [config] = await db.select().from(pomodoro_config).where(eq(pomodoro_config.usuario_id, payload.userId)).limit(1);
    if (!config) {
      return NextResponse.json({ config: { tempo_foco: 25, tempo_pausa_curta: 5, tempo_pausa_longa: 15, sessoes_antes_pausa_longa: 4 } });
    }
    return NextResponse.json({ config });
  } catch (err) {
    console.error('Pomodoro config GET error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ success: true, config: { tempo_foco: 25, tempo_pausa_curta: 5, tempo_pausa_longa: 15, sessoes_antes_pausa_longa: 4 } });
    }

    const body = await req.json();
    const existing = await db.select().from(pomodoro_config).where(eq(pomodoro_config.usuario_id, payload.userId)).limit(1);

    if (existing.length === 0) {
      await db.insert(pomodoro_config).values({ usuario_id: payload.userId, ...body });
    } else {
      await db.update(pomodoro_config).set(body).where(eq(pomodoro_config.usuario_id, payload.userId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Pomodoro config PATCH error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
