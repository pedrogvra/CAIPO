import { NextRequest, NextResponse } from 'next/server';
import { GET as getOfensiva } from '../../ofensiva/route';
import { GET as getCronograma } from '../../cronograma/route';
import { GET as getPomodoroConfig } from '../../pomodoro/config/route';

async function readResult(result: PromiseSettledResult<NextResponse>) {
  if (result.status === 'rejected') return { error: 'Erro interno.' };
  return result.value.json();
}

export async function GET(req: NextRequest) {
  try {
    const results = await Promise.allSettled([
      getOfensiva(req),
      getCronograma(req),
      getPomodoroConfig(req),
    ]);
    const [ofensiva, cronograma, config] = await Promise.all(results.map(readResult));

    return NextResponse.json({ ofensiva, cronograma, config });
  } catch (err) {
    console.error('Dashboard summary GET error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
