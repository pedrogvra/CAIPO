import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseSelect, supabaseInsert, supabaseUpdate, supabaseDelete } from '@/lib/supabase-data';

type ProgressoFallback = {
  usuario_id: string;
  ultima_pergunta_id: string | null;
  pontuacao_atual: number;
  concluido: boolean;
  respostas_json: Record<string, unknown>;
  updated_at: string;
};

const globalForQuestionarioProgress = globalThis as typeof globalThis & {
  __caipoQuestionarioProgress?: Map<string, ProgressoFallback>;
};

const questionarioProgressStore = globalForQuestionarioProgress.__caipoQuestionarioProgress ??= new Map<string, ProgressoFallback>();

function getStoredProgress(userId: string): ProgressoFallback | null {
  return questionarioProgressStore.get(userId) ?? null;
}

function saveStoredProgress(userId: string, data: Partial<ProgressoFallback>): ProgressoFallback {
  const nextValue: ProgressoFallback = {
    usuario_id: userId,
    ultima_pergunta_id: data.ultima_pergunta_id ?? null,
    pontuacao_atual: data.pontuacao_atual ?? 0,
    concluido: data.concluido ?? false,
    respostas_json: data.respostas_json ?? {},
    updated_at: data.updated_at ?? new Date().toISOString(),
  };

  questionarioProgressStore.set(userId, nextValue);
  return nextValue;
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const { isConfigured } = getSupabaseConnectionStatus();
    if (!isConfigured) {
      return NextResponse.json({ progresso: getStoredProgress(payload.userId) || null });
    }

    try {
      const progresso = await supabaseSelect<Array<any>>('questionario_progresso', {
        select: '*',
        usuario_id: `eq.${payload.userId}`,
      });

      return NextResponse.json({ progresso: progresso?.[0] || getStoredProgress(payload.userId) || null });
    } catch (err) {
      console.warn('Supabase questionario select fallback:', err);
      return NextResponse.json({ progresso: getStoredProgress(payload.userId) || null });
    }
  } catch (err) {
    console.error('Progresso GET error:', err);
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
    const { isConfigured } = getSupabaseConnectionStatus();
    if (!isConfigured) {
      const progresso = saveStoredProgress(payload.userId, {
        ultima_pergunta_id: body.ultima_pergunta_id ?? null,
        pontuacao_atual: body.pontuacao_atual || 0,
        concluido: body.concluido || false,
        respostas_json: body.respostas_json || {},
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, progresso });
    }

    try {
      // Check if user progress exists
      const existing = await supabaseSelect<Array<any>>('questionario_progresso', {
        select: 'id',
        usuario_id: `eq.${payload.userId}`,
      });

      const progressData = {
        ultima_pergunta_id: body.ultima_pergunta_id,
        pontuacao_atual: body.pontuacao_atual || 0,
        concluido: body.concluido || false,
        respostas_json: body.respostas_json || {},
        updated_at: new Date().toISOString(),
      };

      if (existing && existing.length > 0) {
        // Update existing record
        await supabaseUpdate('questionario_progresso', progressData, {
          usuario_id: `eq.${payload.userId}`,
        });
      } else {
        // Insert new record
        await supabaseInsert('questionario_progresso', {
          usuario_id: payload.userId,
          ...progressData,
        });
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.warn('Supabase questionario insert fallback:', err);
      const progresso = saveStoredProgress(payload.userId, {
        ultima_pergunta_id: body.ultima_pergunta_id ?? null,
        pontuacao_atual: body.pontuacao_atual || 0,
        concluido: body.concluido || false,
        respostas_json: body.respostas_json || {},
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, progresso, fallback: true });
    }
  } catch (err) {
    console.error('Progresso POST error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    questionarioProgressStore.delete(payload.userId);

    if (getSupabaseConnectionStatus().isConfigured) {
      await supabaseDelete('questionario_progresso', { usuario_id: `eq.${payload.userId}` });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Progresso DELETE error:', err);
    return NextResponse.json({ error: 'Não foi possível reiniciar o questionário.' }, { status: 500 });
  }
}
