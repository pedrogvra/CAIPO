import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materias } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { getSupabaseConnectionStatus, supabaseSelect, supabaseInsert, supabaseDelete } from '@/lib/supabase-data';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

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

    const body = await req.json();
    const lista = Array.isArray(body.materias) ? body.materias : null;
    const { isConfigured } = getSupabaseConnectionStatus();
    if (lista) {
      const valores = lista
        .filter((materia: { nome?: string }) => typeof materia.nome === 'string' && materia.nome.trim())
        .map((materia: { nome: string; peso_prioridade?: number; cor?: string }) => ({
          usuario_id: payload.userId,
          nome: materia.nome.trim(),
          peso_prioridade: materia.peso_prioridade || 10,
          cor: materia.cor || '#1E55A8',
        }));
      if (isConfigured) {
        const inseridas = await supabaseInsert('materias', valores, { select: '*' });
        return NextResponse.json({ materias: inseridas || [] });
      }
      if (!db) return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 });
      const inseridas = valores.length > 0 ? await db.insert(materias).values(valores).returning() : [];
      return NextResponse.json({ materias: inseridas });
    }

    const { nome, peso_prioridade, cor } = body;
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

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

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
