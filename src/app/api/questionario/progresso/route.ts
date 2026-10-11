import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseSelect, supabaseInsert, supabaseUpdate, supabaseDelete } from '@/lib/supabase-data';
import { DIAGNOSTICO_PERGUNTAS } from '@/services/caipo/diagnosticoInicial';

type ProgressoFallback = {
  usuario_id: string;
  ultima_pergunta_id: string | null;
  pontuacao_atual: number;
  concluido: boolean;
  respostas_json: Record<string, unknown>;
  updated_at: string;
};

function normalizarProgresso(progresso: ProgressoFallback): ProgressoFallback {
  const respostas = progresso.respostas_json as {
    salvo_para_depois?: boolean;
    diagnostico_inicial?: { respostas?: Record<string, unknown> };
  };
  const concluido = progresso.concluido
    || Object.keys(respostas?.diagnostico_inicial?.respostas || {}).length >= DIAGNOSTICO_PERGUNTAS.length;

  const precisaNormalizar = (!progresso.concluido && concluido)
    || (concluido && Boolean(respostas?.salvo_para_depois));
  if (!precisaNormalizar) return progresso;

  const respostasNormalizadas = { ...respostas };
  if (concluido) delete respostasNormalizadas.salvo_para_depois;

  return {
    ...progresso,
    concluido,
    respostas_json: respostasNormalizadas,
  };
}

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
      const progresso = getStoredProgress(payload.userId);
      if (!progresso) return NextResponse.json({ progresso: null });
      const normalizado = normalizarProgresso(progresso);
      questionarioProgressStore.set(payload.userId, normalizado);
      return NextResponse.json({ progresso: normalizado });
    }

    try {
      const progresso = await supabaseSelect<Array<any>>('questionario_progresso', {
        select: '*',
        usuario_id: `eq.${payload.userId}`,
      });

      const registro = progresso?.[0] as ProgressoFallback | undefined;
      if (!registro) return NextResponse.json({ progresso: getStoredProgress(payload.userId) || null });

      const normalizado = normalizarProgresso(registro);
      if (normalizado !== registro) {
        await supabaseUpdate('questionario_progresso', {
          concluido: normalizado.concluido,
          respostas_json: normalizado.respostas_json,
          updated_at: new Date().toISOString(),
        }, { usuario_id: `eq.${payload.userId}` });
      }

      return NextResponse.json({ progresso: normalizado });
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
    const respostas_json = body.respostas_json || {};
    const concluido = body.concluido === true
      || Object.keys(respostas_json?.diagnostico_inicial?.respostas || {}).length >= DIAGNOSTICO_PERGUNTAS.length;
    if (concluido) delete respostas_json.salvo_para_depois;

    const { isConfigured } = getSupabaseConnectionStatus();
    if (!isConfigured) {
      const progresso = saveStoredProgress(payload.userId, {
        ultima_pergunta_id: null,
        pontuacao_atual: body.pontuacao_atual || 0,
        concluido,
        respostas_json,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, progresso });
    }

    try {
      await supabaseInsert('questionario_progresso', {
        usuario_id: payload.userId,
        ultima_pergunta_id: null,
        pontuacao_atual: body.pontuacao_atual || 0,
        concluido,
        respostas_json,
        updated_at: new Date().toISOString(),
      }, {
        on_conflict: 'usuario_id',
        select: '*',
      });

      if (concluido) {
        await supabaseUpdate('usuarios', { primeiro_acesso: false }, { id: `eq.${payload.userId}` });
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error('Supabase questionario upsert error:', err);
      return NextResponse.json({ error: 'Não foi possível salvar o progresso do questionário.' }, { status: 500 });
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
