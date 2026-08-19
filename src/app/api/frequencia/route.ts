import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { cronograma_sessoes, cronogramas, historico_diario, pomodoro_sessoes } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseSelect } from '@/lib/supabase-data';
import { and, eq } from 'drizzle-orm';
import { getToday } from '@/lib/utils';

type DailyRecord = { data: string; tempo_total?: number | null; sessoes_concluidas?: number | null };
type StudySession = { created_at: Date | string | null; duracao_real?: number | null; duracao_planejada: number; status?: string | null };

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DAY_MS = 86400000;

function startOfWeek(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value;
}

function localDateKey(value: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function weekKeys(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return dateKey(date);
  });
}

function calculateStreaks(records: DailyRecord[], timeZone: string) {
  const studied = new Set(records.filter((record) => (record.tempo_total || 0) > 0).map((record) => record.data));
  const ordered = [...studied].sort();
  let best = 0;
  let run = 0;
  let previous = '';

  for (const date of ordered) {
    const consecutive = previous && new Date(`${date}T00:00:00.000Z`).getTime() - new Date(`${previous}T00:00:00.000Z`).getTime() === DAY_MS;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  const today = getToday(timeZone);
  let current = 0;
  const studiedToday = studied.has(today);
  let cursor = studiedToday
    ? today
    : dateKey(new Date(new Date(`${today}T00:00:00.000Z`).getTime() - DAY_MS));
  while (studied.has(cursor)) {
    current += 1;
    cursor = dateKey(new Date(new Date(`${cursor}T00:00:00.000Z`).getTime() - DAY_MS));
  }

  return { current, best, active_today: studiedToday };
}

function buildSummary(records: DailyRecord[], plannedDays: number[], plannedActivities: number | null, timeZone: string) {
  const today = getToday(timeZone);
  const currentStart = startOfWeek(today);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  const currentKeys = weekKeys(currentStart);
  const previousKeys = weekKeys(previousStart);
  const byDate = new Map(records.map((record) => [record.data, record]));
  const currentMinutes = currentKeys.map((key) => byDate.get(key)?.tempo_total || 0);
  const previousMinutes = previousKeys.reduce((total, key) => total + (byDate.get(key)?.tempo_total || 0), 0);
  const studiedDays = currentMinutes.filter((minutes) => minutes > 0).length;
  const plannedCount = plannedActivities ?? plannedDays.length;
  const completedActivities = currentKeys.reduce((total, key) => total + (byDate.get(key)?.sessoes_concluidas || 0), 0);
  const routinePercent = plannedActivities !== null
    ? Math.min(100, Math.round((completedActivities / Math.max(plannedCount, 1)) * 100))
    : null;
  const hasHistory = records.some((record) => (record.tempo_total || 0) > 0 || (record.sessoes_concluidas || 0) > 0);
  const streaks = calculateStreaks(records, timeZone);
  const currentTotal = currentMinutes.reduce((total, minutes) => total + minutes, 0);
  const difference = currentTotal - previousMinutes;

  return {
    has_history: hasHistory,
    streak: streaks,
    frequencia_ativa: streaks.active_today,
    week: currentKeys.map((date, index) => ({ date, label: DAY_NAMES[index], studied: currentMinutes[index] > 0, minutes: currentMinutes[index] })),
    stats: {
      studied_days: studiedDays,
      total_minutes: currentTotal,
      routine_percent: routinePercent,
      pomodoros: currentKeys.reduce((total, key) => total + (byDate.get(key)?.sessoes_concluidas || 0), 0),
    },
    previous_week_minutes: previousMinutes,
    difference_minutes: difference,
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const timeZone = req.headers.get('x-time-zone') || process.env.CAIPO_TIMEZONE || 'America/Sao_Paulo';
    let records: DailyRecord[] = [];
    let plannedDays: number[] = [];
    let plannedActivities: number | null = null;

    if (getSupabaseConnectionStatus().isConfigured) {
      const sessoes = await supabaseSelect<StudySession[]>('pomodoro_sessoes', { select: 'created_at,duracao_real,duracao_planejada,status', usuario_id: `eq.${payload.userId}`, status: 'eq.concluida', order: 'created_at.asc' }) || [];
      records = sessoes.length > 0 ? sessoes.reduce<DailyRecord[]>((accumulator, session) => {
        if (!session.created_at) return accumulator;
        const data = localDateKey(session.created_at, timeZone);
        const existing = accumulator.find((record) => record.data === data);
        const duration = session.duracao_real || session.duracao_planejada || 0;
        if (existing) {
          existing.tempo_total = (existing.tempo_total || 0) + duration;
          existing.sessoes_concluidas = (existing.sessoes_concluidas || 0) + 1;
        } else {
          accumulator.push({ data, tempo_total: duration, sessoes_concluidas: 1 });
        }
        return accumulator;
      }, []) : await supabaseSelect<DailyRecord[]>('historico_diario', { select: 'data,tempo_total,sessoes_concluidas', usuario_id: `eq.${payload.userId}`, order: 'data.asc' }) || [];
      const cronogramasDoUsuario = await supabaseSelect<Array<{ id: string; dias_disponiveis?: number[] | null }>>('cronogramas', { select: 'id,dias_disponiveis', usuario_id: `eq.${payload.userId}`, order: 'updated_at.desc', limit: 1 }) || [];
      if (cronogramasDoUsuario[0]) {
        plannedDays = Array.isArray(cronogramasDoUsuario[0].dias_disponiveis) ? cronogramasDoUsuario[0].dias_disponiveis.map((day) => (day + 6) % 7) : [];
        const sessoesPlanejadas = await supabaseSelect<Array<{ dia_semana?: number; tipo?: string | null }>>('cronograma_sessoes', { select: 'dia_semana,tipo', cronograma_id: `eq.${cronogramasDoUsuario[0].id}` }) || [];
        plannedActivities = sessoesPlanejadas.filter((session) => session.tipo !== 'pausa').length;
      }
    } else if (isDatabaseConfigured && db) {
      const sessoes: StudySession[] = await db.select({ created_at: pomodoro_sessoes.created_at, duracao_real: pomodoro_sessoes.duracao_real, duracao_planejada: pomodoro_sessoes.duracao_planejada, status: pomodoro_sessoes.status }).from(pomodoro_sessoes).where(and(eq(pomodoro_sessoes.usuario_id, payload.userId), eq(pomodoro_sessoes.status, 'concluida'))).orderBy(pomodoro_sessoes.created_at);
      records = sessoes.length > 0 ? sessoes.reduce<DailyRecord[]>((accumulator, session: StudySession) => {
        if (!session.created_at) return accumulator;
        const data = localDateKey(session.created_at, timeZone);
        const existing = accumulator.find((record) => record.data === data);
        const duration = session.duracao_real || session.duracao_planejada || 0;
        if (existing) {
          existing.tempo_total = (existing.tempo_total || 0) + duration;
          existing.sessoes_concluidas = (existing.sessoes_concluidas || 0) + 1;
        } else {
          accumulator.push({ data, tempo_total: duration, sessoes_concluidas: 1 });
        }
        return accumulator;
      }, []) : await db.select({ data: historico_diario.data, tempo_total: historico_diario.tempo_total, sessoes_concluidas: historico_diario.sessoes_concluidas }).from(historico_diario).where(eq(historico_diario.usuario_id, payload.userId));
      const [cronograma] = await db.select({ id: cronogramas.id, dias_disponiveis: cronogramas.dias_disponiveis }).from(cronogramas).where(eq(cronogramas.usuario_id, payload.userId)).limit(1);
      if (cronograma) {
        const dias = Array.isArray(cronograma.dias_disponiveis) ? cronograma.dias_disponiveis as number[] : [];
        plannedDays = dias.map((day: number) => (Number(day) + 6) % 7);
        const sessoes: Array<{ dia_semana: number; tipo: string | null }> = await db.select({ dia_semana: cronograma_sessoes.dia_semana, tipo: cronograma_sessoes.tipo }).from(cronograma_sessoes).where(eq(cronograma_sessoes.cronograma_id, cronograma.id));
        const sessoesDeEstudo = sessoes.filter((session) => session.tipo !== 'pausa');
        plannedActivities = sessoesDeEstudo.length;
        if (plannedDays.length === 0) plannedDays = [...new Set(sessoesDeEstudo.map((session) => (session.dia_semana + 6) % 7))];
      }
    }

    return NextResponse.json(buildSummary(records, plannedDays, plannedActivities, timeZone));
  } catch (error) {
    console.error('Frequencia GET error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}