import { gerarCronograma } from './src/services/algoritmos/gerarCronograma';

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

const counts = Object.fromEntries(materias.map((m) => [m.nome, 0]));
for (const item of sessions) counts[item.materia] += 1;
console.log(JSON.stringify(counts));
console.log('len', sessions.length);
console.log(JSON.stringify(sessions, null, 2));
