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

const counts = materias.reduce<Record<string, number>>((acc, materia) => {
  acc[materia.nome] = 0;
  return acc;
}, {});

for (const session of sessions) {
  counts[session.materia] += 1;
}

console.log('Total sessions:', sessions.length);
console.log('Counts:', counts);
console.log('Máximo > Muito Alto:', counts['Máximo'] > counts['Muito Alto']);
console.log('Muito Alto > Alto:', counts['Muito Alto'] > counts['Alto']);
console.log('Alto > Normal:', counts['Alto'] > counts['Normal']);
console.log('Normal > Baixo:', counts['Normal'] > counts['Baixo']);
