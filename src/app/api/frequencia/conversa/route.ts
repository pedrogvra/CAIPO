import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/db';
import { conversas_caipo, frequencia_historico, frequencia_perguntas, frequencia_perguntas_usadas } from '@/db/schema';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getSupabaseConnectionStatus, supabaseDelete, supabaseInsert, supabaseSelect } from '@/lib/supabase-data';
import { and, eq, lt } from 'drizzle-orm';

type Pergunta = { id: number; categoria: string; pilar_id: number; pergunta: string; opcoes: string[]; respostas_caipo: Record<string, string> };
type Historico = { pergunta_id: number; opcao_indice: number; resposta_usuario: string; data: string };
type ConversaLegada = { id?: string; mensagem_caipo?: string | null; resposta_usuario?: string | null; contexto?: string | null };
type PerguntaUsada = { pergunta_id: number };

const FALLBACK: Pergunta[] = [
  { id: 1, categoria: 'Planejamento e Metas', pilar_id: 1, pergunta: 'Antes de começar a estudar, você define claramente o que vai aprender e como vai fazer?', opcoes: ['Sempre', 'Às vezes', 'Raramente', 'Nunca'], respostas_caipo: { '0': 'Perfeito! Um plano claro aumenta muito sua eficiência.', '1': 'Bom começo! Tente definir também como você vai estudar.', '2': 'Comece com uma meta pequena antes de abrir o material.', '3': 'Uma meta simples já dá direção ao seu estudo.' } },
  { id: 2, categoria: 'Planejamento e Metas', pilar_id: 1, pergunta: 'Você costuma definir metas de curto prazo antes de estudar?', opcoes: ['Sempre', 'Às vezes', 'Raramente', 'Nunca'], respostas_caipo: { '0': 'Metas claras ajudam a manter o foco!', '1': 'Ótimo! Tente tornar sua meta explícita em todas as sessões.', '2': 'Defina uma meta simples para a próxima sessão.', '3': 'Escolha um único tópico para começar hoje.' } },
  { id: 3, categoria: 'Monitoramento e Controle', pilar_id: 2, pergunta: 'Durante os estudos, você percebe quando está entendendo o conteúdo?', opcoes: ['Sim, na hora', 'Mais ou menos', 'Raramente', 'Não'], respostas_caipo: { '0': 'Isso é monitoramento ativo. Seu radar interno está funcionando muito bem!', '1': 'É normal demorar um pouco. Faça pequenas pausas para se checar.', '2': 'Pergunte-se: o que acabei de aprender? Isso fortalece seu monitoramento.', '3': 'O Pomodoro pode ajudar a criar momentos de checagem.' } },
  { id: 4, categoria: 'Autoavaliação e Reflexão', pilar_id: 3, pergunta: 'Depois de estudar, você pensa se a estratégia que usou funcionou?', opcoes: ['Sempre', 'Às vezes', 'Raramente', 'Nunca'], respostas_caipo: { '0': 'Excelente! Refletir sobre o processo fortalece seu aprendizado.', '1': 'Refletir quando algo dá errado já ajuda. Tente fazer isso sempre.', '2': 'Reserve dois minutos para pensar no que funcionou.', '3': 'Comece perguntando: o que ficou na minha cabeça hoje?' } },
];

function dataLocal(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function selecionar(perguntas: Pergunta[], perguntasUsadas: PerguntaUsada[]) {
  const usados = new Set(perguntasUsadas.map((item) => item.pergunta_id));
  const disponiveis = perguntas.filter((pergunta) => !usados.has(pergunta.id));
  return (disponiveis.length > 0 ? disponiveis : perguntas).slice(0, 4);
}

async function autenticar(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get('cookie'));
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const payload = await autenticar(req);
    if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const timeZone = req.headers.get('x-time-zone') || 'America/Sao_Paulo';
    const data = dataLocal(timeZone);
    let perguntas = FALLBACK;
    let historico: Historico[] = [];
    let perguntasUsadas: PerguntaUsada[] = [];
    let controleDeRotacaoDisponivel = false;
    if (getSupabaseConnectionStatus().isConfigured) {
      try {
        const registros = await supabaseSelect<Pergunta[]>('frequencia_perguntas', { select: 'id,categoria,pilar_id,pergunta,opcoes,respostas_caipo', order: 'id.asc' });
        if (registros?.length) perguntas = registros;
        historico = await supabaseSelect<Historico[]>('frequencia_historico', { select: 'pergunta_id,opcao_indice,resposta_usuario,data', usuario_id: `eq.${payload.userId}` }) || [];
      } catch (error) {
        console.warn('Banco de perguntas ainda não configurado; usando fallback.', error);
      }
      try {
        const registrosLegados = await supabaseSelect<ConversaLegada[]>('conversas_caipo', { select: 'mensagem_caipo,resposta_usuario,contexto', usuario_id: `eq.${payload.userId}` }) || [];
        const historicoLegado = lerHistoricoLegado(registrosLegados);
        const chaves = new Set(historico.map((item) => `${item.pergunta_id}|${item.data}`));
        historico = [...historico, ...historicoLegado.filter((item) => !chaves.has(`${item.pergunta_id}|${item.data}`))];
      } catch (legacyError) {
        console.warn('Histórico legado da conversa indisponível.', legacyError);
      }
      try {
        const registrosParaLimpar = await supabaseSelect<ConversaLegada[]>('conversas_caipo', { select: 'id,contexto', usuario_id: `eq.${payload.userId}` }) || [];
        await Promise.all(registrosParaLimpar
          .filter((registro) => registro.id && registro.contexto?.startsWith('frequencia|') && registro.contexto.split('|')[1] < data)
          .map((registro) => supabaseDelete('conversas_caipo', { id: `eq.${registro.id}` })));
      } catch (cleanupLegacyError) {
        console.warn('Não foi possível limpar respostas antigas do histórico legado.', cleanupLegacyError);
      }
      try {
        perguntasUsadas = await supabaseSelect<PerguntaUsada[]>('frequencia_perguntas_usadas', { select: 'pergunta_id', usuario_id: `eq.${payload.userId}` }) || [];
        controleDeRotacaoDisponivel = true;
      } catch (rotationError) {
        console.warn('Controle de rotação ainda não configurado.', rotationError);
      }
      try {
        await supabaseDelete('frequencia_historico', { usuario_id: `eq.${payload.userId}`, data: `lt.${data}` });
      } catch (cleanupError) {
        console.warn('Não foi possível limpar o histórico antigo.', cleanupError);
      }
    } else if (isDatabaseConfigured && db) {
      perguntas = await db.select().from(frequencia_perguntas).orderBy(frequencia_perguntas.id) as Pergunta[];
      historico = await db.select({ pergunta_id: frequencia_historico.pergunta_id, opcao_indice: frequencia_historico.opcao_indice, resposta_usuario: frequencia_historico.resposta_usuario, data: frequencia_historico.data }).from(frequencia_historico).where(eq(frequencia_historico.usuario_id, payload.userId)) as Historico[];
      if (!historico.length) {
        const registrosLegados = await db.select({ mensagem_caipo: conversas_caipo.mensagem_caipo, resposta_usuario: conversas_caipo.resposta_usuario, contexto: conversas_caipo.contexto }).from(conversas_caipo).where(eq(conversas_caipo.usuario_id, payload.userId));
        historico = lerHistoricoLegado(registrosLegados);
      }
      try {
        perguntasUsadas = await db.select({ pergunta_id: frequencia_perguntas_usadas.pergunta_id }).from(frequencia_perguntas_usadas).where(eq(frequencia_perguntas_usadas.usuario_id, payload.userId));
        controleDeRotacaoDisponivel = true;
      } catch (rotationError) {
        console.warn('Controle de rotação ainda não configurado.', rotationError);
      }
      try {
        await db.delete(frequencia_historico).where(and(eq(frequencia_historico.usuario_id, payload.userId), lt(frequencia_historico.data, data)));
      } catch (cleanupError) {
        console.warn('Não foi possível limpar o histórico antigo.', cleanupError);
      }
      if (!perguntas.length) perguntas = FALLBACK;
    }
    if (!controleDeRotacaoDisponivel) {
      perguntasUsadas = historico.map((item) => ({ pergunta_id: item.pergunta_id }));
    }
    const respondidasHoje = historico.filter((item) => item.data === data);
    const idsRespondidosHoje = new Set(respondidasHoje.map((item) => item.pergunta_id));
    return NextResponse.json({
      data,
      perguntas: respondidasHoje.length >= 4 ? [] : selecionar(perguntas, perguntasUsadas).slice(0, 4 - respondidasHoje.length),
      perguntas_historico: perguntas.filter((pergunta) => idsRespondidosHoje.has(pergunta.id)),
      respondidas: respondidasHoje,
    });
  } catch (error) {
    console.error('Frequencia conversa GET error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await autenticar(req);
    if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const body = await req.json();
    if (!Number.isInteger(body.pergunta_id) || !Number.isInteger(body.opcao_indice) || !body.resposta_usuario) return NextResponse.json({ error: 'Resposta inválida.' }, { status: 400 });
    const data = dataLocal(typeof body.time_zone === 'string' ? body.time_zone : 'America/Sao_Paulo');
    const values = { usuario_id: payload.userId, pergunta_id: body.pergunta_id, data, opcao_indice: body.opcao_indice, resposta_usuario: body.resposta_usuario };
    const perguntaUsada = { usuario_id: payload.userId, pergunta_id: body.pergunta_id };
    const legado = {
      usuario_id: payload.userId,
      mensagem_caipo: String(body.opcao_indice),
      resposta_usuario: body.resposta_usuario,
      contexto: `frequencia|${data}|${body.pergunta_id}`,
    };
    if (getSupabaseConnectionStatus().isConfigured) {
      try {
        await supabaseInsert('frequencia_perguntas_usadas', perguntaUsada);
      } catch (rotationError) {
        console.warn('Pergunta já registrada ou controle de rotação indisponível.', rotationError);
      }
      await supabaseInsert('conversas_caipo', legado);
      try {
        await supabaseInsert('frequencia_historico', values);
      } catch (error) {
        console.warn('Tabela dedicada de histórico indisponível; histórico salvo em conversas_caipo.', error);
      }
    } else if (isDatabaseConfigured && db) {
      try {
        await db.insert(frequencia_perguntas_usadas).values(perguntaUsada);
      } catch (rotationError) {
        console.warn('Pergunta já registrada ou controle de rotação indisponível.', rotationError);
      }
      await db.insert(conversas_caipo).values(legado);
      try {
        await db.insert(frequencia_historico).values(values);
      } catch (error) {
        console.warn('Tabela dedicada de histórico indisponível; histórico salvo em conversas_caipo.', error);
      }
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Frequencia conversa POST error:', error);
    return NextResponse.json({ error: 'Não foi possível salvar a resposta.' }, { status: 500 });
  }
}

function lerHistoricoLegado(registros: ConversaLegada[]) {
  return registros.flatMap((registro) => {
    const partes = registro.contexto?.split('|') || [];
    if (partes.length !== 3 || partes[0] !== 'frequencia' || !registro.resposta_usuario) return [];
    const perguntaId = Number(partes[2]);
    const opcaoIndice = Number(registro.mensagem_caipo);
    if (!Number.isInteger(perguntaId) || !Number.isInteger(opcaoIndice)) return [];
    return [{ pergunta_id: perguntaId, opcao_indice: opcaoIndice, resposta_usuario: registro.resposta_usuario, data: partes[1] }];
  });
}