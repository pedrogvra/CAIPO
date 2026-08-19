import { db, isDatabaseConfigured } from '@/db';
import { questionario_progresso } from '@/db/schema';
import { getSupabaseConnectionStatus, supabaseSelect } from '@/lib/supabase-data';
import { eq } from 'drizzle-orm';

type Progresso = { concluido?: boolean | null };

export async function questionarioConcluido(usuarioId: string) {
  if (getSupabaseConnectionStatus().isConfigured) {
    const progresso = await supabaseSelect<Progresso[]>('questionario_progresso', {
      select: 'concluido',
      usuario_id: `eq.${usuarioId}`,
      limit: 1,
    });
    return progresso?.[0]?.concluido === true;
  }

  if (isDatabaseConfigured && db) {
    const [progresso] = await db
      .select({ concluido: questionario_progresso.concluido })
      .from(questionario_progresso)
      .where(eq(questionario_progresso.usuario_id, usuarioId))
      .limit(1);
    return progresso?.concluido === true;
  }

  return false;
}