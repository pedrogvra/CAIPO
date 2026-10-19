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

function eightSubjectNightSchedule(overrides: Partial<Parameters<typeof gerarCronograma>[0]> = {}) {
  const materias = Array.from({ length: 8 }, (_, index) => materia(`Matéria ${index + 1}`));
  return gerarCronograma({
    horario_acordar: '06:00',
    horario_dormir: '22:00',
    dias_disponiveis: [1, 2, 3, 4, 5],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 30,
    periodo_preferido: 'noite',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
    estrategia_poucas: 'dividir_por_2',
    ...overrides,
  });
}

function minutes(time: string) {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

test('eight subjects at night use four 30-minute study sessions from 18:00 to 20:45', () => {
  const sessions = eightSubjectNightSchedule();
  const monday = sessions.filter(session => session.dia_semana === 1);

  assert.deepEqual(monday.map(({ horario_inicio, horario_fim }) => [horario_inicio, horario_fim]), [
    ['18:00', '18:30'],
    ['18:45', '19:15'],
    ['19:30', '20:00'],
    ['20:15', '20:45'],
  ]);
  assert.equal(sessions.length, 20);
});

test('five-minute and fifteen-minute intervals produce the selected breaks', () => {
  const sessionsWithFiveMinutes = eightSubjectNightSchedule({ intervalo_entre_sessoes: 5 });
  const mondayWithFiveMinutes = sessionsWithFiveMinutes.filter(session => session.dia_semana === 1);
  assert.deepEqual(mondayWithFiveMinutes.map(({ horario_inicio, horario_fim }) => [horario_inicio, horario_fim]), [
    ['18:00', '18:30'],
    ['18:35', '19:05'],
    ['19:10', '19:40'],
    ['19:45', '20:15'],
    ['20:20', '20:50'],
  ]);
  assert.equal(new Set(mondayWithFiveMinutes.map(session => session.materia)).size, 4);

  const sessionsWithFifteenMinutes = eightSubjectNightSchedule({ intervalo_entre_sessoes: 15 });
  const mondayWithFifteenMinutes = sessionsWithFifteenMinutes.filter(session => session.dia_semana === 1);
  assert.deepEqual(mondayWithFifteenMinutes.map(({ horario_inicio, horario_fim }) => [horario_inicio, horario_fim]), [
    ['18:00', '18:30'],
    ['18:45', '19:15'],
    ['19:30', '20:00'],
    ['20:15', '20:45'],
  ]);
});

test('selected interval applies to review sessions as well as study sessions', () => {
  const sessions = eightSubjectNightSchedule({
    intervalo_entre_sessoes: 5,
    criar_dia_revisao: true,
    dia_revisao: 5,
  });
  const reviewSessions = sessions.filter(session => session.tipo === 'revisao');

  assert.equal(reviewSessions.length, 8);
  for (let index = 1; index < reviewSessions.length; index += 1) {
    assert.equal(minutes(reviewSessions[index].horario_inicio) - minutes(reviewSessions[index - 1].horario_fim), 5);
  }
});

test('eight-subject night schedule reaches four distinct subjects per day without counting repeats', () => {
  const sessions = eightSubjectNightSchedule();
  const byDay = distinctSubjectsByDay(sessions);

  assert.equal(byDay.size, 5);
  for (const [day, subjects] of byDay) {
    assert.equal(subjects.size, 4, `Expected four distinct subjects on day ${day}`);
  }
});

test('night schedule does not reserve a pause before the first session or after the last', () => {
  const monday = eightSubjectNightSchedule().filter(session => session.dia_semana === 1);
  assert.equal(monday[0].horario_inicio, '18:00');
  assert.equal(monday.at(-1)?.horario_fim, '20:45');
  for (let index = 1; index < monday.length; index += 1) {
    assert.equal(minutes(monday[index].horario_inicio) - minutes(monday[index - 1].horario_fim), 15);
  }
  assert.ok(minutes(monday.at(-1)!.horario_fim) <= 21 * 60);
  assert.ok(21 * 60 - minutes(monday.at(-1)!.horario_fim) < 45, 'The remaining window should not fit another 30-minute session and its required break');
});

test('night session duration never exceeds 30 minutes and the 15-minute breaks are respected', () => {
  const sessions = eightSubjectNightSchedule().filter(session => session.dia_semana === 1);
  for (let index = 0; index < sessions.length; index += 1) {
    assert.ok(minutes(sessions[index].horario_fim) - minutes(sessions[index].horario_inicio) <= 30);
    if (index > 0) {
      assert.ok(minutes(sessions[index].horario_inicio) - minutes(sessions[index - 1].horario_fim) >= 15);
    }
  }
});

test('night-window capacity responds to bedtime and other preferred study periods', () => {
  const earlierBedtime = eightSubjectNightSchedule({ horario_dormir: '21:00' });
  const earlierBedtimeMonday = earlierBedtime.filter(session => session.dia_semana === 1);
  assert.deepEqual(earlierBedtimeMonday.map(({ horario_inicio, horario_fim }) => [horario_inicio, horario_fim]), [
    ['18:00', '18:30'],
    ['18:45', '19:15'],
    ['19:30', '20:00'],
  ]);

  const laterBedtime = eightSubjectNightSchedule({ horario_dormir: '23:00' });
  const laterBedtimeMonday = laterBedtime.filter(session => session.dia_semana === 1);
  assert.equal(laterBedtimeMonday.length, 5, 'Fill the fifth complete slot while keeping the distinct-subject limit');
  assert.equal(new Set(laterBedtimeMonday.map(session => session.materia)).size, 4);
  assert.equal(laterBedtimeMonday[0].horario_inicio, '18:00');
  assert.equal(laterBedtimeMonday.at(-1)?.horario_fim, '21:30');

  const morning = eightSubjectNightSchedule({ periodo_preferido: 'manha' });
  const morningMonday = morning.filter(session => session.dia_semana === 1);
  assert.equal(morningMonday[0].horario_inicio, '06:30');
  assert.equal(morningMonday.length, 7);
  assert.ok(morningMonday.every(session => minutes(session.horario_fim) <= 12 * 60));

  const afternoon = eightSubjectNightSchedule({ periodo_preferido: 'tarde' });
  const afternoonMonday = afternoon.filter(session => session.dia_semana === 1);
  assert.equal(afternoonMonday[0].horario_inicio, '13:00');
  assert.equal(afternoonMonday.length, 7);
  assert.ok(afternoonMonday.every(session => minutes(session.horario_fim) <= 18 * 60));
});

test('fixed activities and safety margins reduce daily capacity without overlapping study sessions', () => {
  const sessions = eightSubjectNightSchedule({
    atividades_fixas: [
      { nome: 'Aula', dias_semana: [1], horario_inicio: '19:00', horario_fim: '19:30' },
    ],
  });
  const monday = sessions.filter(session => session.dia_semana === 1);

  assert.deepEqual(monday.map(({ horario_inicio, horario_fim }) => [horario_inicio, horario_fim]), [
    ['18:00', '18:30'],
    ['19:45', '20:15'],
    ['20:30', '21:00'],
  ]);
});

test('few-subject mode preserves coverage and priority weighting around fixed activities', () => {
  const materias = [
    { nome: 'Máximo', peso_prioridade: 25 },
    { nome: 'Muito Alto', peso_prioridade: 20 },
    { nome: 'Alto', peso_prioridade: 15 },
    { nome: 'Normal', peso_prioridade: 10 },
    { nome: 'Baixo', peso_prioridade: 5 },
    { nome: 'Normal 2', peso_prioridade: 10 },
    { nome: 'Alto 2', peso_prioridade: 15 },
    { nome: 'Muito Alto 2', peso_prioridade: 20 },
  ].map((subject, index) => ({
    ...subject,
    id: `priority-${index}`,
    usuario_id: 'user-1',
    cor: '#1E55A8',
  }));
  const sessions = eightSubjectNightSchedule({
    materias,
    atividades_fixas: [
      { nome: 'Aula', dias_semana: [1], horario_inicio: '19:00', horario_fim: '19:30' },
    ],
  });
  const counts = sessions.reduce<Record<string, number>>((result, session) => {
    result[session.materia] = (result[session.materia] || 0) + 1;
    return result;
  }, {});

  assert.equal(new Set(sessions.map(session => session.materia)).size, materias.length);
  assert.equal(sessions.length, 19);
  assert.ok(counts['Máximo'] > counts.Normal);
  assert.ok(counts['Muito Alto'] >= counts.Alto);
  assert.deepEqual(
    sessions.filter(session => session.dia_semana === 1).map(({ horario_inicio, horario_fim }) => [horario_inicio, horario_fim]),
    [['18:00', '18:30'], ['19:45', '20:15'], ['20:30', '21:00']],
  );
});

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
  assert.equal(sessions.length, 20, 'Expected all four available daily study slots to be filled across 5 days');
  assert.equal(byDay.size, 5, 'Expected each available day to have at least one subject');
  assert.ok(Array.from(byDay.values()).every(subjects => subjects.size === 2));
});

test('few-subject mode fills available sessions without exceeding the distinct-subject limit', () => {
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
    assert.equal(subjects.length, 4, `Expected all four available sessions on day ${day}`);
    assert.ok(unique.size <= 3, `Expected at most 3 distinct subjects per day, got ${unique.size} on day ${day}`);
    assert.equal(unique.size, 3, `Expected the daily distinct-subject target on day ${day}`);
    for (let index = 1; index < subjects.length; index += 1) {
      assert.notEqual(subjects[index], subjects[index - 1], `Expected subject alternation between sessions on day ${day}`);
    }
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

  const expectedPerDay = Math.floor(materias.length / 2);
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

test('few-subject mode uses floor(total subjects / 2) per day for 4 to 10 subjects', () => {
  for (let totalSubjects = 4; totalSubjects <= 10; totalSubjects += 1) {
    const materias = Array.from({ length: totalSubjects }, (_, index) => materia(`Matéria ${index + 1}`));
    const sessions = gerarCronograma({
      horario_acordar: '06:00',
      horario_dormir: '23:00',
      dias_disponiveis: [1, 2, 3, 4, 5],
      materias,
      atividades_fixas: [],
      tempo_max_sem_pausa: 50,
      periodo_preferido: 'qualquer',
      varias_materias_por_dia: false,
      criar_dia_revisao: false,
      estrategia_poucas: 'dividir_por_2',
    });

    const byDay = distinctSubjectsByDay(sessions);
    const expected = Math.max(1, Math.floor(totalSubjects / 2));
    assert.equal(new Set(sessions.map((session) => session.materia)).size, totalSubjects);
    assert.equal(byDay.size, 5);
    for (const [day, subjects] of byDay) {
      assert.equal(subjects.size, expected, `Expected ${expected} distinct subjects on day ${day} with ${totalSubjects} total subjects`);
    }
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
    varias_materias_por_dia: true,
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

  assert.equal(sessions.length, 8, 'Expected all available study slots to be filled');
  assert.equal(counts.A, 1);
  assert.equal(counts.B, 1);
  assert.equal(counts.C, 1);
  assert.equal(counts.D, 2);
  assert.equal(counts.E, 3);
});

test('few-subject mode preserves priority weighting after weekly subject coverage', () => {
  const materias = [
    { nome: 'Baixo', peso_prioridade: 5, cor: '#000000' },
    { nome: 'Normal', peso_prioridade: 10, cor: '#111111' },
    { nome: 'Alto', peso_prioridade: 15, cor: '#222222' },
    { nome: 'Muito Alto', peso_prioridade: 20, cor: '#333333' },
    { nome: 'Máximo', peso_prioridade: 25, cor: '#444444' },
  ].map((m, index) => ({ ...m, id: `mat-${index}`, usuario_id: 'user-1' }));
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
  });
  const counts = sessions.reduce<Record<string, number>>((result, session) => {
    result[session.materia] = (result[session.materia] || 0) + 1;
    return result;
  }, {});

  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 20);
  assert.ok(counts['Máximo'] >= counts['Muito Alto']);
  assert.ok(counts['Muito Alto'] >= counts.Alto);
  assert.ok(counts.Alto >= counts.Normal);
  assert.ok(counts.Normal >= counts.Baixo);
  assert.ok(counts['Máximo'] > counts.Normal);
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

test('insufficient weekly capacity reports an error instead of omitting selected subjects', () => {
  const materias = Array.from({ length: 7 }, (_, index) => materia(`Matéria ${index + 1}`));
  assert.throws(() => gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1],
    materias,
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: false,
    criar_dia_revisao: false,
  }), /capacidade disponível permite estudar apenas 3 matérias na semana/);

  assert.throws(() => gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1],
    materias: materias.slice(0, 5),
    atividades_fixas: [],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: false,
  }), /capacidade disponível permite 4 sessões na semana/);
});

test('review sessions respect the selected review day and fixed-activity buffer', () => {
  const materias = [materia('Matemática'), materia('Português')];
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1, 2, 3],
    materias,
    atividades_fixas: [
      { nome: 'Aula', dias_semana: [3], horario_inicio: '08:00', horario_fim: '09:00' },
    ],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
    criar_dia_revisao: true,
    dia_revisao: 3,
  });

  const reviewSessions = sessions.filter((session) => session.tipo === 'revisao');
  assert.ok(reviewSessions.length > 0);
  assert.ok(reviewSessions.every((session) => session.dia_semana === 3));
  assert.ok(sessions.filter((session) => session.tipo === 'estudo').every((session) => session.dia_semana !== 3));
  for (const session of reviewSessions) {
    const start = Number(session.horario_inicio.slice(0, 2)) * 60 + Number(session.horario_inicio.slice(3));
    const end = Number(session.horario_fim.slice(0, 2)) * 60 + Number(session.horario_fim.slice(3));
    assert.ok(end <= 7 * 60 + 45 || start >= 9 * 60 + 15, 'Review session overlaps a fixed activity buffer');
  }
});

test('consecutive fixed activities with no overlap are accepted', () => {
  const sessions = gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1],
    materias: [materia('Matemática')],
    atividades_fixas: [
      { nome: 'Aula', dias_semana: [1], horario_inicio: '08:00', horario_fim: '09:00' },
      { nome: 'Deslocamento', dias_semana: [1], horario_inicio: '09:00', horario_fim: '10:00' },
    ],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
  });

  assert.ok(sessions.length > 0);
});

test('overlapping fixed activities report the conflicting activities', () => {
  assert.throws(() => gerarCronograma({
    horario_acordar: '07:00',
    horario_dormir: '23:00',
    dias_disponiveis: [1],
    materias: [materia('Matemática')],
    atividades_fixas: [
      { nome: 'Aula', dias_semana: [1], horario_inicio: '08:00', horario_fim: '09:30' },
      { nome: 'Deslocamento', dias_semana: [1], horario_inicio: '09:00', horario_fim: '10:00' },
    ],
    tempo_max_sem_pausa: 50,
    periodo_preferido: 'manha',
    varias_materias_por_dia: true,
  }), /Conflito de horários entre atividades fixas no dia 2: "Aula" e "Deslocamento"/);
});
