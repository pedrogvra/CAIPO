import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materias } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';
import { getSupabaseConnectionStatus, supabaseSelect, supabaseInsert, supabaseUpdate, supabaseDelete } from '@/lib/supabase-data';
import { questionarioConcluido } from '@/lib/questionario-access';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    if (!await questionarioConcluido(payload.userId)) {
      return NextResponse.json({ error: 'Conclua o questionário para acessar as matérias.', questionario_pendente: true }, { status: 403 });
    }

    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      const lista = await supabaseSelect<Array<any>>('materias', { select: '*', usuario_id: `eq.${payload.userId}` }).catch(() => null);
      return NextResponse.json({ materias: lista || [] });
    }

    if (!db) return NextResponse.json({ materias: [] });
    const lista = await db.select().from(materias).where(eq(materias.usuario_id, payload.userId));
    return NextResponse.json({ materias: lista });
  } catch (err) {
    console.error('Materias GET error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    if (!await questionarioConcluido(payload.userId)) {
      return NextResponse.json({ error: 'Conclua o questionário para acessar as matérias.', questionario_pendente: true }, { status: 403 });
    }

    const { nome, peso_prioridade, cor } = await req.json();
    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      const inserted = await supabaseInsert('materias', {
        usuario_id: payload.userId,
        nome,
        peso_prioridade: peso_prioridade || 10,
        cor: cor || '#1E55A8',
      }, { select: '*' }).catch(() => null);
      const materia = Array.isArray(inserted) ? inserted[0] : inserted;
      return NextResponse.json({ materia });
    }

    if (!db) return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 });
    const [materia] = await db.insert(materias).values({
      usuario_id: payload.userId,
      nome,
      peso_prioridade: peso_prioridade || 10,
      cor: cor || '#1E55A8',
    }).returning();

    return NextResponse.json({ materia });
  } catch (err) {
    console.error('Materias POST error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    if (!await questionarioConcluido(payload.userId)) {
      return NextResponse.json({ error: 'Conclua o questionário para acessar as matérias.', questionario_pendente: true }, { status: 403 });
    }

    const body: unknown = await req.json();
    if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'string'
      || !('cor' in body) || typeof body.cor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.cor)
      || !('peso_prioridade' in body) || typeof body.peso_prioridade !== 'number'
      || ![5, 10, 15, 20, 25].includes(body.peso_prioridade)) {
      return NextResponse.json({ error: 'Dados de matéria inválidos.' }, { status: 400 });
    }

    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      const updated = await supabaseUpdate<Array<{ id: string; cor: string; peso_prioridade: number }>>(
        'materias',
        { cor: body.cor, peso_prioridade: body.peso_prioridade },
        { id: `eq.${body.id}`, usuario_id: `eq.${payload.userId}`, select: 'id,cor,peso_prioridade' },
      );
      if (!updated?.length) return NextResponse.json({ error: 'Matéria não encontrada.' }, { status: 404 });
      return NextResponse.json({ materia: updated[0] });
    }

    if (!db) return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 });
    const [updated] = await db.update(materias)
      .set({ cor: body.cor, peso_prioridade: body.peso_prioridade })
      .where(and(eq(materias.id, body.id), eq(materias.usuario_id, payload.userId)))
      .returning({ id: materias.id, cor: materias.cor, peso_prioridade: materias.peso_prioridade });
    if (!updated) return NextResponse.json({ error: 'Matéria não encontrada.' }, { status: 404 });
    return NextResponse.json({ materia: updated });
  } catch (err) {
    console.error('Materias PATCH error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    if (!await questionarioConcluido(payload.userId)) {
      return NextResponse.json({ error: 'Conclua o questionário para acessar as matérias.', questionario_pendente: true }, { status: 403 });
    }

    const { id } = await req.json();
    const { isConfigured } = getSupabaseConnectionStatus();
    if (isConfigured) {
      await supabaseDelete('materias', { id: `eq.${id}` }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (!db) return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 });
    await db.delete(materias).where(eq(materias.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Materias DELETE error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
