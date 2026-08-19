import { NextRequest, NextResponse } from 'next/server';
import { getNextConversation } from '../../../services/caipo/flow';
import { EstadoAtual } from '../../../services/caipo/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const estadoAtual = (body.estado_atual || {}) as EstadoAtual;
    const response = getNextConversation(estadoAtual);
    return NextResponse.json(response);
  } catch (err) {
    console.error('Caipo conversation error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
