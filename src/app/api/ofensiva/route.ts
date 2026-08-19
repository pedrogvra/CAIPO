import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { ofensiva, historico_diario } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseSelect } from '@/lib/supabase-data';
import { eq, and, desc } from 'drizzle-orm';
import { getToday } from '@/lib/utils';

const getTodayRange = () => {
  const today = getToday();
  const inicio = new Date(`${today}T00:00:00.000Z`);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { today, inicio: inicio.toISOString(), fim: fim.toISOString() };
};

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const { isConfigured: supabaseConfigured } = getSupabaseConnectionStatus();
    if (supabaseConfigured) {
      const { today } = getTodayRange();
      const registrosHoje = await supabaseSelect<Array<{ streak_atual?: number; estudou?: boolean }>>('ofensiva', {
        select: 'streak_atual,estudou',
        usuario_id: `eq.${payload.userId}`,
        data: `eq.${today}`,
        limit: 1,
      });
      const registrosHistoricos = await supabaseSelect<Array<{ maior_streak?: number }>>('ofensiva', {
        select: 'maior_streak',
        usuario_id: `eq.${payload.userId}`,
        order: 'data.desc',
        limit: 1,
      });
      return NextResponse.json({
        streak_atual: registrosHoje?.[0]?.streak_atual || 0,
        maior_streak: registrosHistoricos?.[0]?.maior_streak || 0,
        frequencia_ativa: registrosHoje?.[0]?.estudou === true,
      });
    }

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ streak_atual: 0, maior_streak: 0, frequencia_ativa: false });
    }

    const today = getToday();
    const [registroHoje] = await db
      .select({ streak_atual: ofensiva.streak_atual, estudou: ofensiva.estudou })
      .from(ofensiva)
      .where(and(eq(ofensiva.usuario_id, payload.userId), eq(ofensiva.data, today)))
      .limit(1);
    const [registroHistorico] = await db
      .select({ maior_streak: ofensiva.maior_streak })
      .from(ofensiva)
      .where(eq(ofensiva.usuario_id, payload.userId))
      .orderBy(desc(ofensiva.data))
      .limit(1);

    return NextResponse.json({
      streak_atual: registroHoje?.streak_atual || 0,
      maior_streak: registroHistorico?.maior_streak || 0,
      frequencia_ativa: registroHoje?.estudou === true,
    });
  } catch (err) {
    console.error('Ofensiva GET error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ streak_atual: 1, maior_streak: 1 });
    }

    const today = getToday();
    const existing = await db
      .select()
      .from(ofensiva)
      .where(and(eq(ofensiva.usuario_id, payload.userId), eq(ofensiva.data, today)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ streak_atual: existing[0].streak_atual });
    }

    const last = await db
      .select()
      .from(ofensiva)
      .where(eq(ofensiva.usuario_id, payload.userId))
      .orderBy(desc(ofensiva.data))
      .limit(1);

    let streakAtual = 1;
    let maiorStreak = 1;

    if (last.length > 0) {
      const lastDate = new Date(last[0].data);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1 && last[0].estudou) {
        streakAtual = (last[0].streak_atual || 0) + 1;
      }
      maiorStreak = Math.max(streakAtual, last[0].maior_streak || 0);
    }

    await db.insert(ofensiva).values({
      usuario_id: payload.userId,
      data: today,
      estudou: true,
      streak_atual: streakAtual,
      maior_streak: maiorStreak,
    });

    const existingHist = await db
      .select()
      .from(historico_diario)
      .where(and(eq(historico_diario.usuario_id, payload.userId), eq(historico_diario.data, today)))
      .limit(1);

    if (existingHist.length === 0) {
      await db.insert(historico_diario).values({
        usuario_id: payload.userId,
        data: today,
      });
    }

    return NextResponse.json({ streak_atual: streakAtual, maior_streak: maiorStreak });
  } catch (err) {
    console.error('Ofensiva POST error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
