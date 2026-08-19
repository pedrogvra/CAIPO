function distributeWithBalance(
  config: ConfigCronograma,
  studyDays: number[],
  slotsByDay: Map<number, Array<{ dia: number; inicio: number; fim: number }>>,
  subjectCounts: Map<string, number>,
): SlotCronograma[] {
  const sessions: SlotCronograma[] = [];
  const remaining = new Map<string, number>(subjectCounts);
  const previousDaySubjects: string[] = [];
  const totalRemaining = Array.from(remaining.values()).reduce((sum, x) => sum + x, 0);
  const targetPerDay = Math.ceil(totalRemaining / Math.max(1, studyDays.length));
  
  for (const dia of studyDays) {
    const daySlots = slotsByDay.get(dia) || [];
    if (daySlots.length === 0) continue;
    
    const previousSet = new Set(previousDaySubjects);
    const targetThisDay = Math.min(daySlots.length, targetPerDay);
    const picked: string[] = [];
    
    const candidates = [...config.materias]
      .sort((a, b) => {
        const aRem = remaining.get(a.nome) || 0;
        const bRem = remaining.get(b.nome) || 0;
        const aWeight = getWeightValue(a.peso_prioridade);
        const bWeight = getWeightValue(b.peso_prioridade);
        if (bRem !== aRem) return bRem - aRem;
        return bWeight - aWeight;
      })
      .map((m) => m.nome);
    
    // First pass: prefer subjects not in previous day
    for (const nome of candidates) {
      if ((remaining.get(nome) || 0) <= 0) continue;
      if (picked.length >= targetThisDay) break;
      if (!previousSet.has(nome) && !picked.includes(nome)) {
        picked.push(nome);
        remaining.set(nome, (remaining.get(nome) || 0) - 1);
      }
    }
    
    // Second pass: allow repeating if needed to reach target
    if (picked.length < targetThisDay) {
      for (const nome of candidates) {
        if ((remaining.get(nome) || 0) <= 0) continue;
        if (picked.length >= targetThisDay) break;
        if (!picked.includes(nome)) {
          picked.push(nome);
          remaining.set(nome, (remaining.get(nome) || 0) - 1);
        }
      }
    }
    
    const finalPlan = picked.slice(0, Math.min(daySlots.length, targetThisDay));
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
