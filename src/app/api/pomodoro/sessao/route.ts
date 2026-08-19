import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { pomodoro_sessoes, ofensiva, historico_diario } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseInsert, supabaseSelect, supabaseUpdate } from '@/lib/supabase-data';
import { eq, and, desc } from 'drizzle-orm';
import { getToday } from '@/lib/utils';
import { questionarioConcluido } from '@/lib/questionario-access';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    if (!(await questionarioConcluido(payload.userId))) {
      return NextResponse.json({ error: 'Conclua o questionário antes de usar o Pomodoro.' }, { status: 403 });
    }

    const body = await req.json();
    const timeZone = typeof body.time_zone === 'string' && body.time_zone.length > 0 ? body.time_zone : undefined;
    const valoresSessao = {
      usuario_id: payload.userId,
      materia_id: body.materia_id || null,
      materia_nome: body.materia_nome || null,
      duracao_planejada: body.duracao_planejada,
      duracao_real: body.duracao_real || null,
      status: body.status || 'andamento',
      motivo_pausa: body.motivo_pausa || null,
    };
    const { isConfigured: supabaseConfigured } = getSupabaseConnectionStatus();

    if (supabaseConfigured) {
      const inserted = await supabaseInsert<Array<Record<string, unknown>>>('pomodoro_sessoes', valoresSessao, { select: '*' });
      const sessao = Array.isArray(inserted) ? inserted[0] : inserted;
      let frequenciaAtiva = false;

      if (body.status === 'concluida') {
        const today = getToday(timeZone);
        frequenciaAtiva = true;

        const registrosOfensiva = await supabaseSelect<Array<Record<string, any>>>('ofensiva', {
          select: '*',
          usuario_id: `eq.${payload.userId}`,
          data: `eq.${today}`,
          limit: 1,
        });
        if (!registrosOfensiva?.length) {
          const ultimo = await supabaseSelect<Array<Record<string, any>>>('ofensiva', {
            select: '*',
            usuario_id: `eq.${payload.userId}`,
            order: 'data.desc',
            limit: 1,
          });
          let streakAtual = 1;
          let maiorStreak = 1;
          if (ultimo?.length) {
            const diffDias = Math.floor((new Date(today).getTime() - new Date(ultimo[0].data).getTime()) / 86400000);
            if (diffDias === 1 && ultimo[0].estudou) streakAtual = (ultimo[0].streak_atual || 0) + 1;
            maiorStreak = Math.max(streakAtual, ultimo[0].maior_streak || 0);
          }
          await supabaseInsert('ofensiva', {
            usuario_id: payload.userId,
            data: today,
            estudou: true,
            streak_atual: streakAtual,
            maior_streak: maiorStreak,
          });
        }

        const historico = await supabaseSelect<Array<Record<string, any>>>('historico_diario', {
          select: '*',
          usuario_id: `eq.${payload.userId}`,
          data: `eq.${today}`,
          limit: 1,
        });
        const duracao = body.duracao_real || body.duracao_planejada;
        if (!historico?.length) {
          await supabaseInsert('historico_diario', {
            usuario_id: payload.userId,
            data: today,
            tempo_total: duracao,
            sessoes_concluidas: 1,
          });
        } else {
          await supabaseUpdate('historico_diario', {
            tempo_total: (historico[0].tempo_total || 0) + duracao,
            sessoes_concluidas: (historico[0].sessoes_concluidas || 0) + 1,
          }, { id: `eq.${historico[0].id}` });
        }
      }

      return NextResponse.json({ sessao, frequencia_ativa: frequenciaAtiva });
    }

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ error: 'Banco não configurado.' }, { status: 503 });
    }

    const [sessao] = await db.insert(pomodoro_sessoes).values({
      usuario_id: payload.userId,
      materia_id: body.materia_id || null,
      materia_nome: body.materia_nome || null,
      duracao_planejada: body.duracao_planejada,
      duracao_real: body.duracao_real || null,
      status: body.status || 'andamento',
      motivo_pausa: body.motivo_pausa || null,
    }).returning();

    let frequenciaAtiva = false;

    // Only a completed focus session activates frequency for the current day.
    if (body.status === 'concluida') {
      const today = getToday(timeZone);
      frequenciaAtiva = true;

      const existingOfensiva = await db.select().from(ofensiva)
        .where(and(eq(ofensiva.usuario_id, payload.userId), eq(ofensiva.data, today)))
        .limit(1);

      if (existingOfensiva.length === 0) {
        const last = await db.select().from(ofensiva)
          .where(eq(ofensiva.usuario_id, payload.userId))
          .orderBy(desc(ofensiva.data)).limit(1);

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
      }

      // update historico diario
      const existingHist = await db.select().from(historico_diario)
        .where(and(eq(historico_diario.usuario_id, payload.userId), eq(historico_diario.data, today)))
        .limit(1);

      if (existingHist.length === 0) {
        await db.insert(historico_diario).values({
          usuario_id: payload.userId,
          data: today,
          tempo_total: body.duracao_real || body.duracao_planejada,
          sessoes_concluidas: 1,
        });
      } else {
        await db.update(historico_diario).set({
          tempo_total: (existingHist[0].tempo_total || 0) + (body.duracao_real || body.duracao_planejada),
          sessoes_concluidas: (existingHist[0].sessoes_concluidas || 0) + 1,
        }).where(eq(historico_diario.id, existingHist[0].id));
      }
    }

    return NextResponse.json({ sessao, frequencia_ativa: frequenciaAtiva });
  } catch (err) {
    console.error('Pomodoro sessao POST error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
