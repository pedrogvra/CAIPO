import { db, isDatabaseConfigured } from '@/db';
import { questionario_progresso } from '@/db/schema';
import { getSupabaseConnectionStatus, supabaseSelect } from '@/lib/supabase-data';
import { eq } from 'drizzle-orm';

type Progresso = {
  concluido?: boolean | string | null;
  respostas_json?: { diagnostico_inicial?: { respostas?: Record<string, unknown> } } | null;
};

function progressoConcluido(progresso?: Progresso | null) {
  return progresso?.concluido === true
    || progresso?.concluido === 'true'
    || Object.keys(progresso?.respostas_json?.diagnostico_inicial?.respostas || {}).length >= 10;
}

export async function questionarioConcluido(usuarioId: string) {
  if (getSupabaseConnectionStatus().isConfigured) {
    const progresso = await supabaseSelect<Progresso[]>('questionario_progresso', {
      select: 'concluido',
      usuario_id: `eq.${usuarioId}`,
      limit: 1,
    });
    return progressoConcluido(progresso?.[0]);
  }

  if (isDatabaseConfigured && db) {
    const [progresso] = await db
      .select({ concluido: questionario_progresso.concluido })
      .from(questionario_progresso)
      .where(eq(questionario_progresso.usuario_id, usuarioId))
      .limit(1);
    return progressoConcluido(progresso);
  }

  return false;
}