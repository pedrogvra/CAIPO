import { gerarCronograma } from './src/services/algoritmos/gerarCronograma';

// Test the weight distribution function directly
const materias = [
  { id: 'mat-0', nome: 'Máximo', peso_prioridade: 25, cor: '#000000', usuario_id: 'user-1' },
  { id: 'mat-1', nome: 'Muito Alto', peso_prioridade: 20, cor: '#111111', usuario_id: 'user-1' },
  { id: 'mat-2', nome: 'Alto', peso_prioridade: 15, cor: '#222222', usuario_id: 'user-1' },
  { id: 'mat-3', nome: 'Normal', peso_prioridade: 10, cor: '#333333', usuario_id: 'user-1' },
  { id: 'mat-4', nome: 'Baixo', peso_prioridade: 5, cor: '#444444', usuario_id: 'user-1' },
];

// peso_prioridade values: 5->2, 10->4, 15->6, 20->8, 25->10
// Total weight = 10 + 8 + 6 + 4 + 2 = 30
// For 20 slots:
// - Everyone gets 1 slot base = 5 slots consumed, 15 remaining
// - Remaining 15 distributed by weight ratio:
//   - Máximo (weight 10/30 = 33.3%) -> 5 slots
//   - Muito Alto (weight 8/30 = 26.7%) -> 4 slots
//   - Alto (weight 6/30 = 20%) -> 3 slots
//   - Normal (weight 4/30 = 13.3%) -> 2 slots
//   - Baixo (weight 2/30 = 6.7%) -> 1 slot
// Expected: 6, 5, 4, 3, 2 (total 20)

console.log('Testing with 20 slots:');
console.log('Expected: Máximo=6, Muito Alto=5, Alto=4, Normal=3, Baixo=2');
console.log('(Weights: 10+8+6+4+2=30; 20 slots distributed proportionally)');

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

console.log('Actual:', counts);
console.log('\nComparisons:');
console.log('Máximo > Muito Alto:', counts['Máximo'] > counts['Muito Alto'], `(${counts['Máximo']} > ${counts['Muito Alto']})`);
console.log('Muito Alto > Alto:', counts['Muito Alto'] > counts['Alto'], `(${counts['Muito Alto']} > ${counts['Alto']})`);
console.log('Alto > Normal:', counts['Alto'] > counts['Normal'], `(${counts['Alto']} > ${counts['Normal']})`);
console.log('Normal > Baixo:', counts['Normal'] > counts['Baixo'], `(${counts['Normal']} > ${counts['Baixo']})`);
