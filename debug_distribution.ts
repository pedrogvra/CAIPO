// Temporary debug to trace what's happening in distributeWithBalance
import { gerarCronograma } from './src/services/algoritmos/gerarCronograma';

// Monkey-patch to see what's going on
const originalLog = console.log;

const materias = [
  { id: 'mat-0', nome: 'Máximo', peso_prioridade: 25, cor: '#000000', usuario_id: 'user-1' },
  { id: 'mat-1', nome: 'Muito Alto', peso_prioridade: 20, cor: '#111111', usuario_id: 'user-1' },
  { id: 'mat-2', nome: 'Alto', peso_prioridade: 15, cor: '#222222', usuario_id: 'user-1' },
  { id: 'mat-3', nome: 'Normal', peso_prioridade: 10, cor: '#333333', usuario_id: 'user-1' },
  { id: 'mat-4', nome: 'Baixo', peso_prioridade: 5, cor: '#444444', usuario_id: 'user-1' },
];

// Add a debug statement to understand what's happening
// Let's manually check what aplicarPesos should return

// peso: 10 + 8 + 6 + 4 + 2 = 30
// 20 slots total
// Base: 1 per subject = 5 slots
// Remaining: 15 slots
// Máximo: 10/30 * 15 = 5.0 -> 1 + 5 = 6
// Muito Alto: 8/30 * 15 = 4.0 -> 1 + 4 = 5
// Alto: 6/30 * 15 = 3.0 -> 1 + 3 = 4
// Normal: 4/30 * 15 = 2.0 -> 1 + 2 = 3
// Baixo: 2/30 * 15 = 1.0 -> 1 + 1 = 2
// Total: 20 ✓

console.log('Expected distribution:');
console.log('{ Máximo: 6, Muito Alto: 5, Alto: 4, Normal: 3, Baixo: 2 }');
console.log('');

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

const counts = {};
for (const mat of materias) counts[mat.nome] = 0;
for (const session of sessions) counts[session.materia] += 1;

console.log('Actual distribution:');
console.log(counts);
