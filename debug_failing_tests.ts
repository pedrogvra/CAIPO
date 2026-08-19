import { gerarCronograma } from './src/services/algoritmos/gerarCronograma';

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

console.log('\n=== TEST 1: many subjects per day alternates subjects across consecutive days ===');
const materias1 = ['Matemática', 'Português', 'História', 'Geografia'].map(materia);
const sessions1 = gerarCronograma({
  horario_acordar: '07:00',
  horario_dormir: '23:00',
  dias_disponiveis: [1, 2, 3, 4, 5],
  materias: materias1,
  atividades_fixas: [],
  tempo_max_sem_pausa: 50,
  periodo_preferido: 'manha',
  varias_materias_por_dia: true,
  criar_dia_revisao: false,
  variar_materias_por_dia: true,
});

const byDay1 = distinctSubjectsByDay(sessions1);
console.log('Sessions by day:');
for (const [dia, subjects] of Array.from(byDay1.entries()).sort((a, b) => a[0] - b[0])) {
  console.log(`  Day ${dia}: ${Array.from(subjects).join(', ')}`);
}

const sortedDays = Array.from(byDay1.keys()).sort((a, b) => a - b);
console.log('\nConsecutive day overlaps:');
for (let i = 1; i < sortedDays.length; i += 1) {
  const previous = byDay1.get(sortedDays[i - 1])!;
  const current = byDay1.get(sortedDays[i])!;
  const overlap = Array.from(previous).filter((subject) => current.has(subject));
  if (overlap.length > 0) {
    console.log(`  Day ${sortedDays[i-1]} <-> Day ${sortedDays[i]}: ${overlap.join(', ')} (OVERLAP!)`);
  }
}

console.log('\n=== TEST 2: many subjects per day does not divide by two unless user chooses fewer subjects ===');
const materias2 = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química'].map(materia);
const sessions2 = gerarCronograma({
  horario_acordar: '07:00',
  horario_dormir: '23:00',
  dias_disponiveis: [1, 2, 3, 4, 5],
  materias: materias2,
  atividades_fixas: [],
  tempo_max_sem_pausa: 50,
  periodo_preferido: 'manha',
  varias_materias_por_dia: true,
  criar_dia_revisao: false,
  variar_materias_por_dia: true,
});

const byDay2 = distinctSubjectsByDay(sessions2);
console.log('Distinct subjects per day:');
const distinctCounts: number[] = [];
for (const [dia, subjects] of Array.from(byDay2.entries()).sort((a, b) => a[0] - b[0])) {
  console.log(`  Day ${dia}: ${subjects.size} distinct (${Array.from(subjects).join(', ')})`);
  distinctCounts.push(subjects.size);
}

console.log(`\nMax distinct per day: ${Math.max(...distinctCounts)}`);
console.log(`Total sessions: ${sessions2.length}`);
console.log(`Test expects at least one day with > 3 subjects (half of 6)`);
console.log(`Result: ${Math.max(...distinctCounts) > 3 ? 'PASS' : 'FAIL'}`);
