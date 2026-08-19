import { gerarCronograma } from './src/services/algoritmos/gerarCronograma';

const materias = [
  { id: 'mat-0', nome: 'Máximo', peso_prioridade: 25, cor: '#000000', usuario_id: 'user-1' },
  { id: 'mat-1', nome: 'Muito Alto', peso_prioridade: 20, cor: '#111111', usuario_id: 'user-1' },
  { id: 'mat-2', nome: 'Alto', peso_prioridade: 15, cor: '#222222', usuario_id: 'user-1' },
  { id: 'mat-3', nome: 'Normal', peso_prioridade: 10, cor: '#333333', usuario_id: 'user-1' },
  { id: 'mat-4', nome: 'Baixo', peso_prioridade: 5, cor: '#444444', usuario_id: 'user-1' },
];

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

// Group by day
const byDay = new Map<number, string[]>();
for (const session of sessions) {
  if (!byDay.has(session.dia_semana)) byDay.set(session.dia_semana, []);
  byDay.get(session.dia_semana)!.push(session.materia);
}

console.log('Distribution by day:');
for (const day of [1,2,3,4,5]) {
  const subs = byDay.get(day) || [];
  console.log(`Day ${day}: ${subs.join(', ')}`);
}

const counts = materias.reduce<Record<string, number>>((acc, materia) => {
  acc[materia.nome] = 0;
  return acc;
}, {});

for (const session of sessions) {
  counts[session.materia] += 1;
}

console.log('\nTotal counts:', counts);
console.log('Expected: { Máximo: 6, Muito Alto: 5, Alto: 4, Normal: 3, Baixo: 2 }');
