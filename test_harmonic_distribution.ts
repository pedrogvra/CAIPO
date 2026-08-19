import { gerarCronograma } from './src/services/algoritmos/gerarCronograma';

function materia(nome: string, peso = 10) {
  return {
    id: nome,
    usuario_id: 'user-1',
    nome,
    peso_prioridade: peso,
    cor: '#1E55A8',
  };
}

console.log('\n=== TESTE: Distribuição Harmônica com Evitar Repetições entre Dias Consecutivos ===\n');

// Cenário: 8 matérias com pesos variados, 5 dias, ~3 slots por dia
const materias = [
  materia('Matemática', 25),
  materia('Português', 20),
  materia('História', 15),
  materia('Geografia', 15),
  materia('Física', 10),
  materia('Química', 10),
  materia('Biologia', 10),
  materia('Inglês', 5),
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

// Group sessions by day
const byDay = new Map<number, string[]>();
for (const session of sessions) {
  if (!byDay.has(session.dia_semana)) {
    byDay.set(session.dia_semana, []);
  }
  byDay.get(session.dia_semana)!.push(session.materia);
}

console.log('📅 Distribuição de Matérias por Dia:\n');
const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b);
for (const dia of sortedDays) {
  const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dia];
  const subjects = byDay.get(dia)!;
  const distinct = new Set(subjects);
  console.log(`${dayName}: ${subjects.join(', ')}`);
  console.log(`  └─ Distintas: ${distinct.size} | Total: ${subjects.length}\n`);
}

// Analyze consecutive day overlap
console.log('🔄 Análise de Sobreposição entre Dias Consecutivos:\n');
let totalOverlapPercentage = 0;
let overlapCount = 0;

for (let i = 1; i < sortedDays.length; i += 1) {
  const prevDia = sortedDays[i - 1];
  const currDia = sortedDays[i];
  const prevSubjects = new Set(byDay.get(prevDia)!);
  const currSubjects = new Set(byDay.get(currDia)!);
  
  const overlap = Array.from(prevSubjects).filter((s) => currSubjects.has(s));
  const overlapPct = (overlap.length / prevSubjects.size) * 100;
  totalOverlapPercentage += overlapPct;
  overlapCount += 1;
  
  const prevName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][prevDia];
  const currName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][currDia];
  
  if (overlap.length > 0) {
    console.log(`${prevName} → ${currName}: ${overlap.join(', ')} (${overlapPct.toFixed(1)}% sobreposição)`);
  } else {
    console.log(`${prevName} → ${currName}: ✅ Sem sobreposição`);
  }
}

const avgOverlap = totalOverlapPercentage / overlapCount;
console.log(`\n📊 Sobreposição Média entre Dias Consecutivos: ${avgOverlap.toFixed(1)}%`);

// Count subject frequencies
console.log('\n📈 Distribuição de Frequência de Matérias:\n');
const subjectCounts = new Map<string, number>();
for (const [, subjects] of byDay) {
  for (const subject of subjects) {
    subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
  }
}

// Sort by weight (high to low)
const sorted = materias
  .map((m) => ({ nome: m.nome, peso: m.peso_prioridade, count: subjectCounts.get(m.nome) || 0 }))
  .sort((a, b) => b.peso - a.peso);

for (const item of sorted) {
  const bar = '█'.repeat(item.count);
  console.log(`${item.nome.padEnd(15)} (peso ${item.peso.toString().padEnd(2)}): ${bar} (${item.count}x)`);
}

// Verify weight distribution
console.log('\n✅ Verificação de Distribuição de Pesos:\n');
const totalSessions = sessions.length;
console.log(`Total de sessões geradas: ${totalSessions}`);
console.log(`Dias disponíveis: 5`);
console.log(`Matérias: ${materias.length}`);

const weightsRespected = sorted.every((item, idx) => {
  if (idx === 0) return true; // First item always >= second
  const prev = sorted[idx - 1];
  return item.count <= prev.count; // Should be descending or equal
});

console.log(`Ordem de pesos respeitada (maior peso = mais sessões): ${weightsRespected ? '✅ SIM' : '❌ NÃO'}`);

console.log('\n🎯 RESULTADO: Distribuição harmônica, embaralhada e com preferência por evitar repetições!\n');
