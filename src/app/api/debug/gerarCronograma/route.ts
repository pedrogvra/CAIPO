import { NextRequest, NextResponse } from 'next/server';
import { gerarCronograma } from '@/services/algoritmos/gerarCronograma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      horario_acordar, horario_dormir, dias_disponiveis, materias,
      atividades_fixas, tempo_max_sem_pausa, periodo_preferido,
      varias_materias_por_dia, criar_dia_revisao, estrategia_poucas,
    } = body;

    if (varias_materias_por_dia === false && !estrategia_poucas) {
      const s1 = gerarCronograma({ horario_acordar, horario_dormir, dias_disponiveis, materias, atividades_fixas: atividades_fixas || [], tempo_max_sem_pausa, periodo_preferido, varias_materias_por_dia, criar_dia_revisao, estrategia_poucas: 'dividir_por_2' });
      const s2 = gerarCronograma({ horario_acordar, horario_dormir, dias_disponiveis, materias, atividades_fixas: atividades_fixas || [], tempo_max_sem_pausa, periodo_preferido, varias_materias_por_dia, criar_dia_revisao, estrategia_poucas: 'uniforme' });
      return NextResponse.json({ dividir_por_2: s1, uniforme: s2 });
    }

    const sessoes = gerarCronograma({ horario_acordar, horario_dormir, dias_disponiveis, materias, atividades_fixas: atividades_fixas || [], tempo_max_sem_pausa, periodo_preferido, varias_materias_por_dia, criar_dia_revisao, estrategia_poucas });
    return NextResponse.json({ sessoes });
  } catch (err) {
    console.error('Debug gerarCronograma error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
