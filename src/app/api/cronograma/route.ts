import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { cronogramas, cronograma_sessoes, materias, pomodoro_sessoes } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseDelete, supabaseInsert, supabaseSelect, supabaseUpdate } from '@/lib/supabase-data';
import { eq, desc } from 'drizzle-orm';
import { questionarioConcluido } from '@/lib/questionario-access';

async function deleteUserCronogramasSupabase(userId: string, keepId: string) {
  const existing = await supabaseSelect<Array<{ id: string }>>('cronogramas', {
    select: 'id',
    usuario_id: `eq.${userId}`,
  });

  const anteriores = (existing || []).filter(({ id }: { id: string }) => id !== keepId);
  if (anteriores.length === 0) return;

  await Promise.all(anteriores.map(({ id }: { id: string }) => supabaseDelete('cronograma_sessoes', { cronograma_id: `eq.${id}` })));
  await Promise.all(anteriores.map(({ id }: { id: string }) => supabaseDelete('cronogramas', { id: `eq.${id}` })));
}

async function deleteUserCronogramasLocal(userId: string, keepId: string) {
  const existing = await db.select({ id: cronogramas.id }).from(cronogramas).where(eq(cronogramas.usuario_id, userId));
  const anteriores = existing.filter(({ id }: { id: string }) => id !== keepId);
  if (anteriores.length === 0) return;

  await Promise.all(anteriores.map((row: { id: string }) => db.delete(cronograma_sessoes).where(eq(cronograma_sessoes.cronograma_id, row.id))));
  await Promise.all(anteriores.map((row: { id: string }) => db.delete(cronogramas).where(eq(cronogramas.id, row.id))));
}

async function deleteUserMateriasSupabase(userId: string) {
  await supabaseUpdate('pomodoro_sessoes', { materia_id: null }, { usuario_id: `eq.${userId}` });
  await supabaseDelete('materias', { usuario_id: `eq.${userId}` });
}

async function deleteUserMateriasLocal(userId: string) {
  await db.update(pomodoro_sessoes).set({ materia_id: null }).where(eq(pomodoro_sessoes.usuario_id, userId));
  await db.delete(materias).where(eq(materias.usuario_id, userId));
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      const lista = await supabaseSelect<Array<any>>('cronogramas', {
        select: '*',
        usuario_id: `eq.${payload.userId}`,
        order: 'updated_at.desc',
        limit: 1,
      });

      if (!lista || lista.length === 0) return NextResponse.json({ cronograma: null });

      const ultimo = lista[0];
      const sessoes = await supabaseSelect<Array<any>>('cronograma_sessoes', {
        select: '*',
        cronograma_id: `eq.${ultimo.id}`,
      });

      return NextResponse.json({ cronograma: { ...ultimo, sessoes: sessoes || [] } });
    }

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ cronograma: null });
    }

    const lista = await db
      .select()
      .from(cronogramas)
      .where(eq(cronogramas.usuario_id, payload.userId))
      .orderBy(desc(cronogramas.updated_at))
      .limit(5);

    if (lista.length === 0) return NextResponse.json({ cronograma: null });

    const ultimo = lista[0];
    const sessoes = await db
      .select()
      .from(cronograma_sessoes)
      .where(eq(cronograma_sessoes.cronograma_id, ultimo.id));

    return NextResponse.json({ cronograma: { ...ultimo, sessoes } });
  } catch (err) {
    console.error('Cronograma GET error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    if (!(await questionarioConcluido(payload.userId))) {
      return NextResponse.json({ error: 'Conclua o questionário antes de criar um cronograma.' }, { status: 403 });
    }

    const body = await req.json();
    const { nome, horario_acordar, horario_dormir, dias_disponiveis, periodo_preferido,
      tempo_max_sem_pausa, varias_materias_por_dia, sessoes } = body;

    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      const insertedCronogramas = await supabaseInsert<Array<any>>('cronogramas', {
        usuario_id: payload.userId,
        nome: nome || 'Meu Cronograma',
        horario_acordar,
        horario_dormir,
        dias_disponiveis,
        periodo_preferido,
        tempo_max_sem_pausa,
        varias_materias_por_dia,
        updated_at: new Date().toISOString(),
      }, {
        select: '*',
      });

      const cron = insertedCronogramas?.[0] || insertedCronogramas;

      if (cron && sessoes && Array.isArray(sessoes) && sessoes.length > 0) {
        await supabaseInsert('cronograma_sessoes', sessoes.map((s: { materia: string; categoria?: string; dia_semana: number; horario_inicio: string; horario_fim: string; tipo?: string }) => ({
          cronograma_id: cron.id,
          materia: s.materia,
          dia_semana: s.dia_semana,
          horario_inicio: s.horario_inicio,
          horario_fim: s.horario_fim,
          tipo: s.tipo === 'pausa' && s.categoria ? `pausa:${s.categoria}` : (s.tipo || 'estudo'),
        })), {
          select: '*',
        });
      }

      if (!cron?.id) throw new Error('Cronograma não foi criado.');
      try {
        await deleteUserCronogramasSupabase(payload.userId, cron.id);
        await deleteUserMateriasSupabase(payload.userId);
      } catch (cleanupError) {
        console.warn('Cronograma criado, mas a limpeza dos dados antigos falhou:', cleanupError);
      }

      return NextResponse.json({ cronograma: cron });
    }

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ cronograma: null, message: 'Banco não configurado' });
    }

    const [cron] = await db.insert(cronogramas).values({
      usuario_id: payload.userId,
      nome: nome || 'Meu Cronograma',
      horario_acordar,
      horario_dormir,
      dias_disponiveis,
      periodo_preferido,
      tempo_max_sem_pausa,
      varias_materias_por_dia,
    }).returning();

    if (sessoes && Array.isArray(sessoes) && sessoes.length > 0) {
      await db.insert(cronograma_sessoes).values(
        sessoes.map((s: { materia: string; categoria?: string; dia_semana: number; horario_inicio: string; horario_fim: string; tipo?: string }) => ({
          cronograma_id: cron.id,
          materia: s.materia,
          dia_semana: s.dia_semana,
          horario_inicio: s.horario_inicio,
          horario_fim: s.horario_fim,
          tipo: s.tipo === 'pausa' && s.categoria ? `pausa:${s.categoria}` : (s.tipo || 'estudo'),
        }))
      );
    }

    try {
      await deleteUserCronogramasLocal(payload.userId, cron.id);
      await deleteUserMateriasLocal(payload.userId);
    } catch (cleanupError) {
      console.warn('Cronograma criado, mas a limpeza dos dados antigos falhou:', cleanupError);
    }

    return NextResponse.json({ cronograma: cron });
  } catch (err) {
    console.error('Cronograma POST error:', err);
    const detalhe = err instanceof Error ? err.message : 'Erro desconhecido.';
    return NextResponse.json({ error: 'Erro interno ao salvar o cronograma.', detalhe }, { status: 500 });
  }
}
