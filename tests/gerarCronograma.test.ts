import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarCronograma } from '../src/services/algoritmos/gerarCronograma';

function materia(nome: string) {
  return {
    id: nome,
    usuario_id: 'user-1',
    nome,
    peso_prioridade: 10,
    cor: '#1E55A8',
  };
}

function distinctSubjectsByDay(sessions: Array<{ materia: string; dia_semana: number }>) {
  const map = new Map<number, Set<string>>();
  for (const session of sessions) {
    if (!map.has(session.dia_semana)) {
      map.set(session.dia_semana, new Set());
    }
    map.get(session.dia_semana)!.add(session.materia);
  }
  return map;
}

test('many subjects per day keeps subject variety across days without collapsing to few-subject mode', () => {
  const materias = ['Matemática', 'Português', 'História', 'Geografia'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: false,
    variar_materias_por_dia: true,
  });

  const byDay = distinctSubjectsByDay(sessions);
  const distinctByDay = Array.from(byDay.values()).map((set) => set.size);
  const allSubjects = new Set(sessions.map((session) => session.materia));

  assert.ok(distinctByDay.some((count) => count >= 2), 'Expected each day to include multiple subjects in many-subject mode');
  assert.equal(allSubjects.size, materias.length, 'Expected all subjects to appear in the generated schedule');
  assert.ok(distinctByDay.every((count) => count > 0), 'Expected every available day to receive study subjects');
});

test('few subjects per day limits the daily load to half the subjects', () => {
  const materias = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    variar_materias_por_dia: true,
  });

  const byDay = distinctSubjectsByDay(sessions);
  const distinctByDay = Array.from(byDay.values()).map((set) => set.size);
  const maxDistinct = Math.max(...distinctByDay);
  assert.equal(maxDistinct, 3, `Expected exactly 3 subjects per day for 6 total subjects, got ${maxDistinct}`);
  assert.ok(distinctByDay.every((count) => count <= 3), 'Each day should not exceed the half-split subject count');
});

test('few subjects per day fills all available study days with 4 selected subjects over 5 days', () => {
  const materias = ['A', 'B', 'C', 'D'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    variar_materias_por_dia: true,
  });

  const byDay = distinctSubjectsByDay(sessions);
  assert.equal(sessions.length, 10, 'Expected 10 total sessions for 4 subjects across 5 days');
  assert.equal(byDay.size, 5, 'Expected each available day to have at least one subject');
});

test('fixed activity appears on its day without removing the daily subject count', () => {
  const materias = ['A', 'B', 'C', 'D'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [{
      nome: 'Atividade fixa',
      categoria: 'Trabalho',
      dias_semana: [1],
      horario_inicio: '08:00',
      horario_fim: '09:30',
    }],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    variar_materias_por_dia: true,
  });

  const monday = sessions.filter((session) => session.dia_semana === 1);
  const mondaySubjects = monday.filter((session) => session.tipo === 'estudo');
  const fixed = monday.filter((session) => session.tipo === 'pausa');
  const tuesdaySubjects = sessions.filter((session) => session.dia_semana === 2 && session.tipo === 'estudo');

  assert.equal(fixed.length, 1);
  assert.equal(fixed[0].materia, 'Atividade fixa');
  assert.equal(fixed[0].categoria, 'Trabalho');
  assert.equal(fixed[0].horario_inicio, '08:00');
  assert.equal(fixed[0].horario_fim, '09:30');
  assert.equal(new Set(mondaySubjects.map((session) => session.materia)).size, 2);
  assert.equal(new Set(tuesdaySubjects.map((session) => session.materia)).size, 2);
  assert.ok(mondaySubjects.every((session) => session.horario_fim <= '08:00' || session.horario_inicio >= '09:30'));
});

test('few subjects per day does not repeat a subject in the same day or push it to the next day', () => {
  const materias = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    variar_materias_por_dia: true,
  });

  const byDay = new Map<number, string[]>();
  for (const session of sessions) {
    const day = session.dia_semana;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(session.materia);
  }

  for (const [day, subjects] of byDay.entries()) {
    const unique = new Set(subjects);
    assert.ok(subjects.length <= 3, `Expected at most 3 sessions per day in few-subject mode, got ${subjects.length} on day ${day}`);
    assert.ok(unique.size <= 3, `Expected at most 3 distinct subjects per day, got ${unique.size} on day ${day}`);
  }
});

test('few subjects per day uses exactly half of the selected subjects on every available day', () => {
  const materias = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    variar_materias_por_dia: true,
  });

  const expectedPerDay = Math.ceil(materias.length / 2);
  const distinctByDay = new Map<number, Set<string>>();

  for (const session of sessions) {
    if (!distinctByDay.has(session.dia_semana)) {
      distinctByDay.set(session.dia_semana, new Set());
    }
    distinctByDay.get(session.dia_semana)!.add(session.materia);
  }

  assert.equal(distinctByDay.size, 5, 'Expected to use all 5 available study days');
  for (const [dia, set] of distinctByDay.entries()) {
    assert.equal(set.size, expectedPerDay, `Expected ${expectedPerDay} subjects on day ${dia}, got ${set.size}`);
  }
});

test('many subjects per day does not divide by two unless user chooses fewer subjects', () => {
  const materias = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: false,
    variar_materias_por_dia: true,
  });

  const byDay = distinctSubjectsByDay(sessions);
  const distinctByDay = Array.from(byDay.values()).map((set) => set.size);
  assert.ok(distinctByDay.some((count) => count > 3), 'Expected at least one day to show more than half of the subjects when many-subject mode is active');
});

test('weight distribution uses explicit priority weights and fills available slots', () => {
  const materias = [
    { nome: 'A', peso_prioridade: 5, cor: '#000000' },
    { nome: 'B', peso_prioridade: 10, cor: '#111111' },
    { nome: 'C', peso_prioridade: 15, cor: '#222222' },
    { nome: 'D', peso_prioridade: 20, cor: '#333333' },
    { nome: 'E', peso_prioridade: 25, cor: '#444444' },
  ].map((m, i) => ({ ...m, id: `mat-${i}`, usuario_id: 'user-1' }));

  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    variar_materias_por_dia: true,
  });

  const counts = materias.reduce<Record<string, number>>((acc, materia) => {
    acc[materia.nome] = 0;
    return acc;
  }, {});

  for (const session of sessions) {
    counts[session.materia] += 1;
  }

  assert.equal(sessions.length, 6, 'Expected 6 study sessions for the available slots');
  assert.equal(counts.A, 1);
  assert.equal(counts.B, 1);
  assert.equal(counts.C, 1);
  assert.equal(counts.D, 1);
  assert.equal(counts.E, 2);
});

test('subject count follows priority order from máximo to baixo', () => {
  const materias = [
    { nome: 'Máximo', peso_prioridade: 25, cor: '#000000' },
    { nome: 'Muito Alto', peso_prioridade: 20, cor: '#111111' },
    { nome: 'Alto', peso_prioridade: 15, cor: '#222222' },
    { nome: 'Normal', peso_prioridade: 10, cor: '#333333' },
    { nome: 'Baixo', peso_prioridade: 5, cor: '#444444' },
  ].map((m, i) => ({ ...m, id: `mat-${i}`, usuario_id: 'user-1' }));

  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: false,
    variar_materias_por_dia: true,
  });

  const counts = materias.reduce<Record<string, number>>((acc, materia) => {
    acc[materia.nome] = 0;
    return acc;
  }, {});

  for (const session of sessions) {
    counts[session.materia] += 1;
  }

  assert.ok(counts['Máximo'] > counts['Muito Alto'], 'Máximo deve ter mais sessões que Muito Alto');
  assert.ok(counts['Muito Alto'] > counts['Alto'], 'Muito Alto deve ter mais sessões que Alto');
  assert.ok(counts['Alto'] > counts['Normal'], 'Alto deve ter mais sessões que Normal');
  assert.ok(counts['Normal'] > counts['Baixo'], 'Normal deve ter mais sessões que Baixo');
});

test('unknown priority values should stay at the normal weight instead of being treated as max', () => {
  const materias = [
    { nome: 'Custom', peso_prioridade: 1, cor: '#000000' },
    { nome: 'Máximo', peso_prioridade: 25, cor: '#111111' },
  ].map((m, i) => ({ ...m, id: `mat-${i}`, usuario_id: 'user-1' }));

  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: false,
    variar_materias_por_dia: true,
  });

  const counts = materias.reduce<Record<string, number>>((acc, materia) => {
    acc[materia.nome] = 0;
    return acc;
  }, {});

  for (const session of sessions) {
    counts[session.materia] += 1;
  }

  assert.ok(counts['Máximo'] > counts['Custom'], 'Matéria com prioridade máxima deve receber mais sessões do que uma prioridade desconhecida');
  assert.ok(counts['Custom'] <= counts['Máximo'] / 2, 'Prioridade desconhecida deve permanecer próxima à faixa normal, não ao máximo');
});

test('each selected study day receives at least one subject', () => {
  const materias = ['Matemática', 'Português', 'História'].map(materia);
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: false,
    variar_materias_por_dia: true,
  });

  const byDay = distinctSubjectsByDay(sessions);
  for (const dia of [1, 2, 3]) {
    assert.ok(byDay.has(dia), `Expected day ${dia} to have at least one study session`);
    assert.ok(byDay.get(dia)!.size > 0, `Expected day ${dia} to contain a subject`);
  }
});
