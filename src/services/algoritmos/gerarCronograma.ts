import { Materia } from '@/types/cronograma';

export interface SlotCronograma {
  materia: string;
  categoria?: string;
  dia_semana: number;
  horario_inicio: string;
  horario_fim: string;
  tipo: 'estudo' | 'revisao' | 'pausa';
}

interface ConfigCronograma {
  horario_acordar: string;
  horario_dormir: string;
  dias_disponiveis: number[];
  materias: Materia[];
  atividades_fixas: Array<{ nome: string; categoria: string; dias_semana: number[]; horario_inicio: string; horario_fim: string }>;
  tempo_max_sem_pausa: number;
  periodo_preferido: string;
  varias_materias_por_dia: boolean;
  criar_dia_revisao?: boolean;
  dia_revisao?: number | null;
  estrategia_poucas?: 'dividir_por_2' | 'uniforme';
  variar_materias_por_dia?: boolean;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Map priority categories to explicit frequency weights.
// Lower priority means fewer sessions; higher priority means more sessions.
// Baixo = 2, Normal = 4, Alto = 6, Muito Alto = 8, Máximo = 10.
function getWeightValue(peso: number): number {
  switch (peso) {
    case 5:
      return 2;
    case 10:
      return 4;
    case 15:
      return 6;
    case 20:
      return 8;
    case 25:
      return 10;
    default:
      return 4;
  }
}

function aplicarPesos(materias: Materia[], weeklyTargetSlots: number) {
  const weighted = materias
    .map((m) => ({
      nome: m.nome,
      peso: getWeightValue(m.peso_prioridade),
    }))
    .sort((a, b) => b.peso - a.peso || a.nome.localeCompare(b.nome));

  const targetSlots = Math.max(weeklyTargetSlots, 0);
  const counts = new Map<string, number>();

  if (targetSlots === 0) {
    for (const item of weighted) counts.set(item.nome, 0);
    return counts;
  }

  if (targetSlots < weighted.length) {
    for (let i = 0; i < targetSlots; i += 1) {
      const item = weighted[i % weighted.length];
      counts.set(item.nome, (counts.get(item.nome) || 0) + 1);
    }
    return counts;
  }

  for (const item of weighted) counts.set(item.nome, 1);

  const remaining = targetSlots - weighted.length;
  const totalPeso = weighted.reduce((sum, item) => sum + item.peso, 0) || 1;
  const distribution = weighted.map((item) => {
    const exact = (item.peso / totalPeso) * remaining;
    return {
      nome: item.nome,
      peso: item.peso,
      exact,
      base: Math.floor(exact),
      frac: exact - Math.floor(exact),
    };
  });

  let assigned = 0;
  for (const item of distribution) {
    counts.set(item.nome, (counts.get(item.nome) || 0) + item.base);
    assigned += item.base;
  }

  let remainder = remaining - assigned;
  const sorted = [...distribution].sort((a, b) => b.frac - a.frac || b.peso - a.peso || a.nome.localeCompare(b.nome));

  while (remainder > 0) {
    for (const item of sorted) {
      if (remainder <= 0) break;
      counts.set(item.nome, (counts.get(item.nome) || 0) + 1);
      remainder -= 1;
    }
  }

  return counts;
}

function calcularSomaPonderada(materias: Materia[], counts: Map<string, number>) {
  return materias.reduce((sum, materia) => {
    const count = counts.get(materia.nome) || 0;
    return sum + count * getWeightValue(materia.peso_prioridade);
  }, 0);
}

function getDailySubjectLimit(
  totalMaterias: number,
  studyDaysLength: number,
  poucasMateriasPorDia: boolean,
  estrategiaPoucas: ConfigCronograma['estrategia_poucas'] = 'dividir_por_2',
) {
  if (poucasMateriasPorDia) {
    if (estrategiaPoucas === 'dividir_por_2') {
      return Math.max(1, Math.ceil(totalMaterias / 2));
    }
    return Math.max(1, Math.ceil(totalMaterias / Math.max(1, studyDaysLength)));
  }

  const baseLimit = Math.max(1, Math.ceil(totalMaterias / 2));
  return Math.min(totalMaterias, baseLimit + (totalMaterias > 3 ? 1 : 0));
}

function buildDaySubjectPlan(
  materias: Materia[],
  targetCount: number,
  previousSubjects: string[] | undefined,
  subjectRemaining: Map<string, number>,
) {
  const previousSet = new Set(previousSubjects || []);
  const ordered = materias
    .slice()
    .sort((a, b) => (subjectRemaining.get(b.nome) || 0) - (subjectRemaining.get(a.nome) || 0)
      || getWeightValue(b.peso_prioridade) - getWeightValue(a.peso_prioridade)
      || a.nome.localeCompare(b.nome));

  const planejado = new Set<string>();
  for (const materia of ordered) {
    if (planejado.size >= targetCount) break;
    if (!previousSet.has(materia.nome) && (subjectRemaining.get(materia.nome) || 0) > 0) {
      planejado.add(materia.nome);
    }
  }

  if (planejado.size < targetCount) {
    for (const materia of ordered) {
      if (planejado.size >= targetCount) break;
      if ((subjectRemaining.get(materia.nome) || 0) > 0 && !planejado.has(materia.nome)) {
        planejado.add(materia.nome);
      }
    }
  }

  return Array.from(planejado).slice(0, targetCount);
}

function calculateDailyTargetForLowLoad(
  totalMaterias: number,
  studyDaysLength: number,
  estrategiaPoucas: ConfigCronograma['estrategia_poucas'] = 'dividir_por_2',
) {
  if (estrategiaPoucas === 'uniforme') {
    return Math.max(1, Math.ceil(totalMaterias / Math.max(1, studyDaysLength)));
  }

  return Math.max(1, Math.ceil(totalMaterias / 2));
}

function distributeSubjectSessions(materias: Materia[], targetSlots: number) {
  return aplicarPesos(materias, targetSlots);
}

function mergeIntervals(intervals: Array<{ inicio: number; fim: number }>) {
  const sorted = [...intervals].sort((a, b) => a.inicio - b.inicio);
  const merged: Array<{ inicio: number; fim: number }> = [];
  for (const interval of sorted) {
    if (merged.length === 0) {
      merged.push({ ...interval });
      continue;
    }
    const last = merged[merged.length - 1];
    if (interval.inicio <= last.fim) {
      last.fim = Math.max(last.fim, interval.fim);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

function validateFixedActivities(atividades: Array<{ nome: string; dias_semana: number[]; horario_inicio: string; horario_fim: string }>) {
  const porDia = new Map<number, Array<{ inicio: number; fim: number; nome: string }>>();
  for (const atividade of atividades) {
    const inicio = timeToMinutes(atividade.horario_inicio);
    const fim = timeToMinutes(atividade.horario_fim);
    if (fim <= inicio) {
      throw new Error(`Atividade fixa "${atividade.nome}" tem horário inválido.`);
    }
    for (const dia of atividade.dias_semana) {
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push({ inicio, fim, nome: atividade.nome });
    }
  }

  for (const [dia, intervals] of porDia) {
    intervals.sort((a, b) => a.inicio - b.inicio);
    for (let i = 1; i < intervals.length; i++) {
      const prev = intervals[i - 1];
      const current = intervals[i];
      if (current.inicio <= prev.fim) {
        throw new Error(`Conflito de horários entre atividades fixas no dia ${dia + 1}: "${prev.nome}" e "${current.nome}".`);
      }
    }
  }
}

function getPreferredWindow(wake: number, sleep: number, periodo_preferido: string) {
  const ranges: Record<string, [number, number]> = {
    manha: [wake, Math.min(sleep, 12 * 60)],
    tarde: [Math.max(wake, 13 * 60), Math.min(sleep, 18 * 60)],
    noite: [Math.max(wake, 18 * 60), sleep],
  };
  const [start, end] = ranges[periodo_preferido] ?? [wake, sleep];
  if (end - start < 90) {
    return [wake, sleep];
  }
  return [start, end];
}

function formatDayName(dia: number) {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return names[dia] ?? `dia ${dia}`;
}

function buildAvailableSegments(dia: number, wake: number, sleep: number, atividadesFixasDia: Array<{ inicio: number; fim: number }>) {
  const blocked = atividadesFixasDia.map(({ inicio, fim }) => ({ inicio: Math.max(wake, inicio - 15), fim: Math.min(sleep, fim + 15) }));
  const mergedBlocked = mergeIntervals(blocked);
  const available: Array<{ dia: number; inicio: number; fim: number }> = [];
  let cursor = wake;
  for (const block of mergedBlocked) {
    if (block.inicio > cursor) {
      available.push({ dia, inicio: cursor, fim: block.inicio });
    }
    cursor = Math.max(cursor, block.fim);
  }
  if (cursor < sleep) {
    available.push({ dia, inicio: cursor, fim: sleep });
  }
  return available;
}

function buildStudySlots(segments: Array<{ dia: number; inicio: number; fim: number }>, sessionDuration: number, breakDuration: number) {
  const slots: Array<{ dia: number; inicio: number; fim: number }> = [];
  const minDuration = 25;
  for (const segment of segments) {
    let cursor = segment.inicio;
    while (cursor + minDuration <= segment.fim) {
      const end = Math.min(cursor + sessionDuration, segment.fim);
      if (end - cursor < minDuration) break;
      slots.push({ dia: segment.dia, inicio: cursor, fim: end });
      cursor = end + breakDuration;
    }
  }
  return slots;
}

function buildWeightedPool(materias: Materia[]) {
  const pool: string[] = [];
  for (const materia of materias) {
    const peso = getWeightValue(materia.peso_prioridade);
    const repeats = Math.max(1, Math.ceil(peso / 2));
    for (let i = 0; i < repeats; i += 1) {
      pool.push(materia.nome);
    }
  }
  return pool;
}

function roundRobinStrategy(
  materias: Materia[],
  dayLimit: number,
  previousSubjects: string[] | undefined,
  dayIndex: number,
  _recentSubjects: string[] = [],
) {
  const pool = buildWeightedPool(materias);
  const orderedMaterias = materias
    .slice()
    .sort((a, b) => getWeightValue(b.peso_prioridade) - getWeightValue(a.peso_prioridade) || a.nome.localeCompare(b.nome));
  const previousSet = new Set(previousSubjects || []);
  const chosen = new Set<string>();
  const startIndex = dayIndex % pool.length;

  for (let offset = 0; offset < pool.length && chosen.size < dayLimit; offset += 1) {
    const nome = pool[(startIndex + offset) % pool.length];
    if (!previousSet.has(nome)) {
      chosen.add(nome);
    }
  }

  for (const materia of orderedMaterias) {
    if (chosen.size >= dayLimit) break;
    if (!previousSet.has(materia.nome)) {
      chosen.add(materia.nome);
    }
  }

  return Array.from(chosen).slice(0, dayLimit);
}

function controlledShuffleStrategy(
  materias: Materia[],
  dayLimit: number,
  previousSubjects: string[] | undefined,
  dayIndex: number,
  _recentSubjects: string[] = [],
) {
  const previousSet = new Set(previousSubjects || []);
  const ordered = materias
    .slice()
    .sort((a, b) => getWeightValue(b.peso_prioridade) - getWeightValue(a.peso_prioridade) || a.nome.localeCompare(b.nome));
  const candidates = ordered.map((m) => m.nome);
  const startingOffset = dayIndex % candidates.length;
  const chosen: string[] = [];

  for (let i = 0; i < candidates.length && chosen.length < dayLimit; i += 1) {
    const nome = candidates[(startingOffset + i) % candidates.length];
    if (!previousSet.has(nome) && !chosen.includes(nome)) {
      chosen.push(nome);
    }
  }

  for (const nome of candidates) {
    if (chosen.length >= dayLimit) break;
    if (!previousSet.has(nome) && !chosen.includes(nome)) {
      chosen.push(nome);
    }
  }

  return chosen.slice(0, dayLimit);
}

function priorityInterleaveStrategy(
  materias: Materia[],
  dayLimit: number,
  previousSubjects: string[] | undefined,
  _dayIndex: number,
  _recentSubjects: string[] = [],
) {
  const previousSet = new Set(previousSubjects || []);
  const ordered = materias
    .slice()
    .sort((a, b) => getWeightValue(b.peso_prioridade) - getWeightValue(a.peso_prioridade) || a.nome.localeCompare(b.nome));

  const heavy = ordered.filter((m) => getWeightValue(m.peso_prioridade) >= 6).map((m) => m.nome);
  const light = ordered.filter((m) => getWeightValue(m.peso_prioridade) < 6).map((m) => m.nome);
  const merged: string[] = [];
  const max = Math.max(heavy.length, light.length);

  for (let i = 0; i < max; i += 1) {
    if (i < heavy.length) merged.push(heavy[i]);
    if (i < light.length) merged.push(light[i]);
  }

  const chosen: string[] = [];
  for (const nome of merged) {
    if (chosen.length >= dayLimit) break;
    if (!previousSet.has(nome) && !chosen.includes(nome)) {
      chosen.push(nome);
    }
  }

  for (const materia of ordered.map((m) => m.nome)) {
    if (chosen.length >= dayLimit) break;
    if (!previousSet.has(materia) && !chosen.includes(materia)) {
      chosen.push(materia);
    }
  }

  return chosen.slice(0, dayLimit);
}

function frequencyBasedStrategy(
  materias: Materia[],
  dayLimit: number,
  previousSubjects: string[] | undefined,
  _dayIndex: number,
  recentSubjects: string[],
) {
  const previousSet = new Set(previousSubjects || []);
  const usageCounts = new Map<string, number>();
  for (const materia of materias) {
    usageCounts.set(materia.nome, 0);
  }
  for (const nome of recentSubjects) {
    usageCounts.set(nome, (usageCounts.get(nome) || 0) + 1);
  }

  const ordered = materias
    .slice()
    .sort((a, b) => {
      const aCount = usageCounts.get(a.nome) ?? 0;
      const bCount = usageCounts.get(b.nome) ?? 0;
      if (aCount !== bCount) return aCount - bCount;
      return getWeightValue(b.peso_prioridade) - getWeightValue(a.peso_prioridade) || a.nome.localeCompare(b.nome);
    });

  const chosen: string[] = [];
  for (const materia of ordered) {
    if (chosen.length >= dayLimit) break;
    if (!previousSet.has(materia.nome) && !chosen.includes(materia.nome)) {
      chosen.push(materia.nome);
    }
  }

  for (const materia of ordered.map((m) => m.nome)) {
    if (chosen.length >= dayLimit) break;
    if (!previousSet.has(materia) && !chosen.includes(materia)) {
      chosen.push(materia);
    }
  }

  return chosen.slice(0, dayLimit);
}

function chooseDaySubjects(
  materias: Materia[],
  diaIndex: number,
  dayLimit: number,
  previousSubjects: string[] | undefined,
  studyDaysLength: number,
  recentSubjects: string[],
  subjectRemaining: Map<string, number>,
  variarMateriasPorDia: boolean,
) {
  const totalMaterias = materias.length;
  let effectiveDayLimit = Math.max(1, Math.min(dayLimit, totalMaterias));

  // Preserve alternation on the first day without allowing every single subject to
  // be packed onto a single day when there are multiple study days available.
  if (studyDaysLength > 1 && diaIndex === 0 && effectiveDayLimit >= totalMaterias) {
    effectiveDayLimit = Math.max(1, Math.ceil(totalMaterias / 2));
  }

  if (studyDaysLength > 1 && totalMaterias <= 4 && effectiveDayLimit > Math.ceil(totalMaterias / 2)) {
    effectiveDayLimit = Math.max(1, Math.ceil(totalMaterias / 2));
  }

  const orderedByRemaining = materias
    .slice()
    .sort((a, b) => {
      const aRemaining = subjectRemaining.get(a.nome) || 0;
      const bRemaining = subjectRemaining.get(b.nome) || 0;
      const aWeight = getWeightValue(a.peso_prioridade);
      const bWeight = getWeightValue(b.peso_prioridade);
      return (bRemaining * 100 + bWeight * 10) - (aRemaining * 100 + aWeight * 10)
        || a.nome.localeCompare(b.nome);
    });

  if (!variarMateriasPorDia) {
    return orderedByRemaining.slice(0, effectiveDayLimit).map((m) => m.nome);
  }

  const previousSet = new Set(previousSubjects || []);
  const preferred = orderedByRemaining.filter((materia) => !previousSet.has(materia.nome));
  const fallback = orderedByRemaining.filter((materia) => previousSet.has(materia.nome));
  const chosen: string[] = [];

  const usableLimit = Math.min(
    effectiveDayLimit,
    Math.max(1, preferred.length || fallback.length || 1),
  );

  for (const materia of preferred) {
    if (chosen.length >= usableLimit) break;
    chosen.push(materia.nome);
  }

  if (chosen.length < usableLimit) {
    for (const materia of fallback) {
      if (chosen.length >= usableLimit) break;
      if (!chosen.includes(materia.nome)) {
        chosen.push(materia.nome);
      }
    }
  }

  if (chosen.length === 0) {
    for (const materia of orderedByRemaining) {
      const remaining = subjectRemaining.get(materia.nome) || 0;
      if (remaining <= 0) continue;
      chosen.push(materia.nome);
      if (chosen.length >= Math.max(1, effectiveDayLimit)) break;
    }
  }

  return chosen.slice(0, Math.max(1, usableLimit));
}

function chooseNextMateria(
  subjectRemaining: Map<string, number>,
  todaySubjects: string[],
  subjectOrder: string[],
  lastAssigned: string | undefined,
  prevDaySubjects: string[] | undefined,
  assignedToday: Set<string> = new Set(),
  subjectWeights: Map<string, number> = new Map(),
) {
  const prevSet = new Set(prevDaySubjects || []);
  const candidates = todaySubjects
    .filter((nome) => (subjectRemaining.get(nome) || 0) > 0 && !assignedToday.has(nome))
    .map((nome) => ({
      nome,
      remaining: subjectRemaining.get(nome) || 0,
      weight: subjectWeights.get(nome) ?? getWeightValue(10),
    }))
    .sort((a, b) => b.remaining - a.remaining || b.weight - a.weight || subjectOrder.indexOf(a.nome) - subjectOrder.indexOf(b.nome));

  const preferred = candidates.find((candidate) => candidate.nome !== lastAssigned && !prevSet.has(candidate.nome));
  if (preferred) return preferred.nome;

  const fallback = candidates.find((candidate) => candidate.nome !== lastAssigned) || candidates[0];
  return fallback?.nome;
}

function distributeWithBalance(
  config: ConfigCronograma,
  studyDays: number[],
  slotsByDay: Map<number, Array<{ dia: number; inicio: number; fim: number }>>,
  subjectCounts: Map<string, number>,
): SlotCronograma[] {
  const sessions: SlotCronograma[] = [];
  
  if (subjectCounts.size === 0) return sessions;
  
  // Create a list of subjects with their remaining counts to distribute
  const subjects = Array.from(subjectCounts.keys());
  const remaining = new Map<string, number>(subjectCounts);
  
  // Track subjects used on the previous day to avoid consecutive repetitions
  let previousDaySubjects = new Set<string>();
  
  // For each day, use a rotating offset to vary which subjects appear first
  // This ensures consecutive days have different subject distributions
  for (let dayIdx = 0; dayIdx < studyDays.length; dayIdx += 1) {
    const dia = studyDays[dayIdx];
    const daySlots = slotsByDay.get(dia) || [];
    if (daySlots.length === 0) continue;
    
    // Calculate offset for this day: rotates which subject appears first
    // This ensures each day has a different distribution
    const offset = (dayIdx * config.materias.length) % subjects.length;
    
    // Track subjects for this day to compare with next day
    const currentDaySubjects = new Set<string>();
    
    // Distribute slots for this day by cycling through subjects starting at offset
    let slotCounter = 0;
    for (let slotIdx = 0; slotIdx < daySlots.length; slotIdx += 1) {
      // Find next subject with remaining count, starting from offset position
      // STRATEGY: First try to find subjects NOT from previous day (to avoid repetition)
      // If none available, fall back to any subject with remaining count
      let found = false;
      let selectedSubject: string | null = null;
      
      // First pass: prefer subjects that were NOT on the previous day
      for (let i = 0; i < subjects.length; i += 1) {
        const subject = subjects[(offset + i + slotCounter) % subjects.length];
        if ((remaining.get(subject) || 0) > 0 && !previousDaySubjects.has(subject)) {
          selectedSubject = subject;
          found = true;
          break;
        }
      }
      
      // Second pass: if no subjects available (all must be repeated or exhausted), use any
      if (!found) {
        for (let i = 0; i < subjects.length; i += 1) {
          const subject = subjects[(offset + i + slotCounter) % subjects.length];
          if ((remaining.get(subject) || 0) > 0) {
            selectedSubject = subject;
            found = true;
            break;
          }
        }
      }
      
      if (found && selectedSubject) {
        const slot = daySlots[slotIdx];
        sessions.push({
          materia: selectedSubject,
          dia_semana: dia,
          horario_inicio: minutesToTime(slot.inicio),
          horario_fim: minutesToTime(slot.fim),
          tipo: 'estudo',
        });
        remaining.set(selectedSubject, (remaining.get(selectedSubject) || 0) - 1);
        currentDaySubjects.add(selectedSubject);
        slotCounter += 1;
      } else {
        // If no subject found, skip this slot (shouldn't happen with correct logic)
        break;
      }
    }
    
    // Update previous day subjects for next iteration
    previousDaySubjects = currentDaySubjects;
  }
  
  return sessions;
}


function distributeWithAlternation(
  config: ConfigCronograma,
  studyDays: number[],
  slotsByDay: Map<number, Array<{ dia: number; inicio: number; fim: number }>>,
  subjectCounts: Map<string, number>,
): SlotCronograma[] {
  const sessions: SlotCronograma[] = [];
  const remainingCounts = new Map<string, number>();
  for (const item of config.materias) remainingCounts.set(item.nome, subjectCounts.get(item.nome) || 0);
  const previousDaySubjects = new Map<number, string[]>();
  
  for (const dia of studyDays) {
    const daySlots = slotsByDay.get(dia) || [];
    const dayIndex = studyDays.indexOf(dia);
    const previousSubjects = new Set(previousDaySubjects.get(studyDays[Math.max(0, dayIndex - 1)]) || []);
    
    // Sort subjects by: remaining count (descending), weight (descending), name (alphabetical)
    const ordered = [...config.materias]
      .slice()
      .sort((a, b) => {
        const aRemaining = remainingCounts.get(a.nome) || 0;
        const bRemaining = remainingCounts.get(b.nome) || 0;
        const aWeight = getWeightValue(a.peso_prioridade);
        const bWeight = getWeightValue(b.peso_prioridade);
        if (bRemaining !== aRemaining) return bRemaining - aRemaining;
        if (bWeight !== aWeight) return bWeight - aWeight;
        return a.nome.localeCompare(b.nome);
      })
      .map((materia) => materia.nome);
    
    const dailyTarget = Math.ceil(config.materias.length / 2);
    const picked: string[] = [];
    
    // FIRST PASS: Try to avoid subjects from previous day
    for (const nome of ordered) {
      if ((remainingCounts.get(nome) || 0) <= 0) continue;
      if (previousSubjects.has(nome)) continue; // Skip if was in previous day
      if (picked.includes(nome)) continue;
      if (picked.length >= dailyTarget) break;
      picked.push(nome);
      remainingCounts.set(nome, (remainingCounts.get(nome) || 0) - 1);
    }
    
    // SECOND PASS: If still need subjects, allow repeating from previous day (fallback)
    if (picked.length < dailyTarget) {
      for (const nome of ordered) {
        if ((remainingCounts.get(nome) || 0) <= 0) continue;
        if (picked.includes(nome)) continue;
        if (picked.length >= dailyTarget) break;
        picked.push(nome);
        remainingCounts.set(nome, (remainingCounts.get(nome) || 0) - 1);
      }
    }
    
    // Fill available slots with picked subjects
    const finalPlan = picked.slice(0, Math.min(daySlots.length, dailyTarget));
    for (let index = 0; index < finalPlan.length; index += 1) {
      const slot = daySlots[index];
      if (!slot) continue;
      sessions.push({
        materia: finalPlan[index],
        dia_semana: dia,
        horario_inicio: minutesToTime(slot.inicio),
        horario_fim: minutesToTime(slot.fim),
        tipo: 'estudo',
      });
    }
    
    // Track subjects for this day (for next iteration)
    previousDaySubjects.set(dia, [...finalPlan]);
  }
  
  return sessions;
}
function scheduleReviewDay(
  dia: number,
  segments: Array<{ dia: number; inicio: number; fim: number }>,
  materias: Materia[],
) {
  const reviewSessionDuration = 25;
  const breakDuration = 15;
  const reviewSlots = buildStudySlots(segments, reviewSessionDuration, breakDuration).slice(0, materias.length);
  return reviewSlots.map((slot, index) => ({
    materia: materias[index].nome,
    dia_semana: dia,
    horario_inicio: minutesToTime(slot.inicio),
    horario_fim: minutesToTime(slot.fim),
    tipo: 'revisao' as const,
  }));
}

function buildFixedActivitySessions(
  atividades: ConfigCronograma['atividades_fixas'],
) {
  return atividades.flatMap((atividade) => {
    const horarioInicio = timeToMinutes(atividade.horario_inicio);
    const horarioFim = timeToMinutes(atividade.horario_fim);
    return atividade.dias_semana.map((dia) => ({
      materia: atividade.nome,
      categoria: atividade.categoria,
      dia_semana: dia,
      horario_inicio: minutesToTime(horarioInicio),
      horario_fim: minutesToTime(horarioFim),
      tipo: 'pausa' as const,
    }));
  });
}

export function gerarCronograma(config: ConfigCronograma): SlotCronograma[] {
  if (!config.materias || config.materias.length === 0) {
    return [];
  }

  if (config.atividades_fixas.length > 0) {
    validateFixedActivities(config.atividades_fixas);
  }

  const dias = [...config.dias_disponiveis];
  const wakeBase = timeToMinutes(config.horario_acordar) + 30;
  const sleepBase = timeToMinutes(config.horario_dormir) - 60;
  const sessionDuration = Math.min(config.tempo_max_sem_pausa, 50);
  const breakDuration = 15;

  const reviewDay = config.criar_dia_revisao && dias.length > 0
    ? (config.dia_revisao !== undefined && config.dia_revisao !== null && dias.includes(config.dia_revisao)
      ? config.dia_revisao
      : dias[dias.length - 1])
    : null;
  const studyDays = reviewDay === null ? dias : dias.filter((dia) => dia !== reviewDay);

  const dayStudySegments = new Map<number, Array<{ dia: number; inicio: number; fim: number }>>();
  for (const dia of studyDays) {
    const fixedForDay = config.atividades_fixas
      .filter((atividade) => atividade.dias_semana.includes(dia))
      .map((atividade) => ({ inicio: timeToMinutes(atividade.horario_inicio), fim: timeToMinutes(atividade.horario_fim) }));

    const [start, end] = getPreferredWindow(wakeBase, sleepBase, config.periodo_preferido);
    const segments = buildAvailableSegments(dia, start, end, fixedForDay);
    dayStudySegments.set(dia, segments);
  }

  const allStudySlots = buildStudySlots(
    Array.from(dayStudySegments.values()).flat(),
    sessionDuration,
    breakDuration,
  );
  const slotsByDay = new Map<number, Array<{ dia: number; inicio: number; fim: number }>>();
  for (const slot of allStudySlots) {
    if (!slotsByDay.has(slot.dia)) slotsByDay.set(slot.dia, []);
    slotsByDay.get(slot.dia)!.push(slot);
  }

  const totalSlots = allStudySlots.length;
  if (totalSlots === 0 && config.materias.length > 0) {
    throw new Error('Não há tempo disponível para gerar o cronograma de estudos. Ajuste horários ou atividades fixas.');
  }

  const fewSubjectsMode = !config.varias_materias_por_dia;
  const daySubjectLimit = getDailySubjectLimit(config.materias.length, studyDays.length, fewSubjectsMode, config.estrategia_poucas);
  const dailyTarget = fewSubjectsMode
    ? calculateDailyTargetForLowLoad(config.materias.length, studyDays.length, config.estrategia_poucas)
    : daySubjectLimit;

  const slotTarget = fewSubjectsMode ? Math.max(1, dailyTarget * Math.max(1, studyDays.length)) : totalSlots;
  const subjectCounts = distributeSubjectSessions(config.materias, slotTarget);

  if (subjectCounts.size === 0) {
    return [];
  }

  const sessions: SlotCronograma[] = buildFixedActivitySessions(config.atividades_fixas);
  
  if (config.varias_materias_por_dia) {
    sessions.push(...distributeWithBalance(config, studyDays, slotsByDay, subjectCounts));
  } else {
    sessions.push(...distributeWithAlternation(config, studyDays, slotsByDay, subjectCounts));
  }

  if (reviewDay !== null) {
    const fixedForReview = config.atividades_fixas
      .filter((atividade) => atividade.dias_semana.includes(reviewDay))
      .map((atividade) => ({ inicio: timeToMinutes(atividade.horario_inicio), fim: timeToMinutes(atividade.horario_fim) }));
    const reviewSegments = buildAvailableSegments(reviewDay, wakeBase, sleepBase, fixedForReview);
    const reviewSessions = scheduleReviewDay(reviewDay, reviewSegments, config.materias);
    sessions.push(...reviewSessions);
  }

  return sessions;
}





