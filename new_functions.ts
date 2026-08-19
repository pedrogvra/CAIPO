function distributeWithBalance(
  config: ConfigCronograma,
  studyDays: number[],
  slotsByDay: Map<number, Array<{ dia: number; inicio: number; fim: number }>>,
  subjectCounts: Map<string, number>,
): SlotCronograma[] {
  const sessions: SlotCronograma[] = [];
  const pool: string[] = [];
  for (const materia of config.materias) {
    const count = subjectCounts.get(materia.nome) || 0;
    for (let i = 0; i < count; i += 1) pool.push(materia.nome);
  }
  if (pool.length === 0) return sessions;
  const slotsPerDay = Math.ceil(pool.length / studyDays.length);
  let poolIndex = 0;
  const previousDaySubjects: string[] = [];
  for (const dia of studyDays) {
    const daySlots = slotsByDay.get(dia) || [];
    if (daySlots.length === 0) continue;
    const picked: string[] = [];
    const previousSet = new Set(previousDaySubjects);
    for (let i = 0; i < pool.length && picked.length < Math.min(slotsPerDay, daySlots.length); i += 1) {
      const materia = pool[(poolIndex + i) % pool.length];
      if (!previousSet.has(materia) && !picked.includes(materia)) picked.push(materia);
    }
    if (picked.length < Math.min(slotsPerDay, daySlots.length)) {
      for (const materia of pool) {
        if (!picked.includes(materia) && picked.length < Math.min(slotsPerDay, daySlots.length)) picked.push(materia);
      }
    }
    poolIndex = (poolIndex + picked.length) % pool.length;
    const finalPlan = picked.slice(0, Math.min(daySlots.length, slotsPerDay));
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
    previousDaySubjects.length = 0;
    previousDaySubjects.push(...finalPlan);
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
    const previousSet = new Set(previousDaySubjects.get(studyDays[Math.max(0, dayIndex - 1)]) || []);
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
    for (const nome of ordered) {
      if ((remainingCounts.get(nome) || 0) <= 0) continue;
      if (previousSet.has(nome)) continue;
      if (picked.includes(nome)) continue;
      if (picked.length >= dailyTarget) break;
      picked.push(nome);
      remainingCounts.set(nome, (remainingCounts.get(nome) || 0) - 1);
    }
    if (picked.length < dailyTarget) {
      for (const nome of ordered) {
        if ((remainingCounts.get(nome) || 0) <= 0) continue;
        if (picked.includes(nome)) continue;
        if (picked.length >= dailyTarget) break;
        picked.push(nome);
        remainingCounts.set(nome, (remainingCounts.get(nome) || 0) - 1);
      }
    }
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
    previousDaySubjects.set(dia, [...finalPlan]);
  }
  return sessions;
}
