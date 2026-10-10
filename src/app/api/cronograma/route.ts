import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { cronogramas, cronograma_sessoes } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseDelete, supabaseInsert, supabaseSelect } from '@/lib/supabase-data';
import { eq, desc } from 'drizzle-orm';

async function deleteUserCronogramasSupabase(userId: string) {
  const existing = await supabaseSelect<Array<{ id: string }>>('cronogramas', {
    select: 'id',
    usuario_id: `eq.${userId}`,
  });

  if (!existing || existing.length === 0) return;

  await Promise.all(existing.map(({ id }) => supabaseDelete('cronograma_sessoes', { cronograma_id: `eq.${id}` })));
  await Promise.all(existing.map(({ id }) => supabaseDelete('cronogramas', { id: `eq.${id}` })));
}

async function deleteUserCronogramasLocal(userId: string) {
  const existing = await db.select({ id: cronogramas.id }).from(cronogramas).where(eq(cronogramas.usuario_id, userId));
  if (existing.length === 0) return;

  await Promise.all(existing.map((row: { id: string }) => db.delete(cronograma_sessoes).where(eq(cronograma_sessoes.cronograma_id, row.id))));
  await db.delete(cronogramas).where(eq(cronogramas.usuario_id, userId));
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
        limit: 5,
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

    const body = await req.json();
    const { nome, horario_acordar, horario_dormir, dias_disponiveis, periodo_preferido,
      tempo_max_sem_pausa, varias_materias_por_dia, sessoes } = body;

    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      await deleteUserCronogramasSupabase(payload.userId);

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
        await supabaseInsert('cronograma_sessoes', sessoes.map((s: { materia: string; dia_semana: number; horario_inicio: string; horario_fim: string; tipo?: string }) => ({
          cronograma_id: cron.id,
          materia: s.materia,
          dia_semana: s.dia_semana,
          horario_inicio: s.horario_inicio,
          horario_fim: s.horario_fim,
          tipo: s.tipo || 'estudo',
        })), {
          select: '*',
        });
      }

      return NextResponse.json({ cronograma: cron });
    }

    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ cronograma: null, message: 'Banco não configurado' });
    }

    await deleteUserCronogramasLocal(payload.userId);

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
        sessoes.map((s: { materia: string; dia_semana: number; horario_inicio: string; horario_fim: string; tipo?: string }) => ({
          cronograma_id: cron.id,
          materia: s.materia,
          dia_semana: s.dia_semana,
          horario_inicio: s.horario_inicio,
          horario_fim: s.horario_fim,
          tipo: s.tipo || 'estudo',
        }))
      );
    }

    return NextResponse.json({ cronograma: cron });
  } catch (err) {
    console.error('Cronograma POST error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
