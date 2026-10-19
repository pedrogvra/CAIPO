'use client';

import { useState } from 'react';
import { gerarCronograma } from '@/services/algoritmos/gerarCronograma';
import type { CronogramaCompleto, Materia } from '@/types/cronograma';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  cronogramaInicial?: CronogramaCompleto | null;
  materiasDisponiveis?: Materia[];
}

interface AtividadeFixa {
  nome: string;
  dias_semana: number[];
  horario_inicio: string;
  horario_fim: string;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CORES_MATERIAS = ['#1E55A8', '#5395CF', '#0C3067', '#091541', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const MATERIAS_SUGERIDAS = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Inglês'];
const LIMITE_CARACTERES_NOME = 50;
const isUnpersistedMateria = (materia: Materia) => (
  String(materia.id).startsWith('temp-') || String(materia.id).startsWith('cronograma-')
);
const isValidTime24 = (time: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return Boolean(match);
};

function TimeInput24({
  value,
  onChange,
  style,
  className,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  style: React.CSSProperties;
  className?: string;
  label: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hour = '00', minute = '00'] = isValidTime24(value) ? value.split(':') : [];
  const selectStyle: React.CSSProperties = {
    ...style,
    minWidth: 0,
    width: '100%',
    padding: '8px 10px',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          className={className}
          type="text"
          inputMode="text"
          placeholder="HH:mm"
          maxLength={5}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          aria-label={label}
          autoComplete="off"
          value={value}
          onChange={event => onChange(event.target.value)}
          style={{ ...style, width: '100%', paddingRight: 44 }}
        />
        <button
          type="button"
          aria-label={`Escolher ${label.toLowerCase()} pelo relógio`}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen(open => !open)}
          style={{
            position: 'absolute',
            right: 6,
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            padding: 0,
            color: '#FFDE68',
            background: 'transparent',
            border: 0,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
      </div>
      {pickerOpen && (
        <div
          role="group"
          aria-label={`Seletor de horário de ${label.toLowerCase()}`}
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 6px)',
            right: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            width: 'min(100%, 240px)',
            padding: 12,
            background: '#0C3067',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <label style={{ color: 'white', fontSize: 12 }}>
            Hora
            <select
              aria-label="Hora"
              value={hour}
              onChange={event => onChange(`${event.target.value}:${minute}`)}
              style={selectStyle}
            >
              {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label style={{ color: 'white', fontSize: 12 }}>
            Minuto
            <select
              aria-label="Minuto"
              value={minute}
              onChange={event => onChange(`${hour}:${event.target.value}`)}
              style={selectStyle}
            >
              {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            style={{
              gridColumn: '1 / -1',
              padding: '7px 10px',
              color: '#091541',
              background: '#FFDE68',
              border: 0,
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}

const ATIVIDADES_SUGERIDAS: Record<string, string[]> = {
  'Refeição': ['Café da manhã', 'Almoço', 'Café da tarde', 'Jantar'],
  'Aula / Escola': ['Aula de Inglês', 'Aula de Matemática', 'Aula de História', 'Aula de Português'],
  'Esporte / Treino': ['Treino de Academia', 'Treino de Futebol', 'Yoga', 'Corrida'],
  'Transporte / Deslocamento': ['Deslocamento para a escola'],
  'Lazer / Pessoal': ['Tempo livre', 'Lazer', 'Descanso'],
  'Outro': [],
};

export default function CronogramaWizard({
  onClose,
  onSuccess,
  cronogramaInicial = null,
  materiasDisponiveis = [],
}: Props) {
  const [etapa, setEtapa] = useState(1);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  // Etapa 1 - Disponibilidade
  const [horarioAcordar, setHorarioAcordar] = useState(cronogramaInicial?.horario_acordar || '07:00');
  const [horarioDormir, setHorarioDormir] = useState(cronogramaInicial?.horario_dormir || '23:00');
  const [diasDisponiveis, setDiasDisponiveis] = useState<number[]>(cronogramaInicial?.dias_disponiveis || [1, 2, 3, 4, 5]);

  // Etapa 2 - Atividades Fixas
  const [atividadesFixas, setAtividadesFixas] = useState<AtividadeFixa[]>(() => {
    const activities = new Map<string, AtividadeFixa>();
    for (const session of cronogramaInicial?.sessoes || []) {
      if (session.tipo !== 'atividade_fixa') continue;
      const key = `${session.materia}|${session.horario_inicio}|${session.horario_fim}`;
      const activity = activities.get(key) || {
        nome: session.materia,
        dias_semana: [],
        horario_inicio: session.horario_inicio,
        horario_fim: session.horario_fim,
      };
      if (!activity.dias_semana.includes(session.dia_semana)) activity.dias_semana.push(session.dia_semana);
      activities.set(key, activity);
    }
    return Array.from(activities.values());
  });
  const [novaAtividade, setNovaAtividade] = useState({ nome: '', dias_semana: [] as number[], horario_inicio: '08:00', horario_fim: '09:00' });
  const [atividadeEditando, setAtividadeEditando] = useState<number | null>(null);
  const [categoriaAberta, setCategoriaAberta] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [tentouAdicionarSemDia, setTentouAdicionarSemDia] = useState(false);

  // Etapa 3 - Matérias
  const [materias, setMaterias] = useState<Materia[]>(() => {
    const subjects = new Set(
      (cronogramaInicial?.sessoes || [])
        .filter(session => session.tipo !== 'revisao' && session.tipo !== 'atividade_fixa')
        .map(session => session.materia),
    );
    return Array.from(subjects, nome => (
      materiasDisponiveis.find(materia => materia.nome === nome) || {
        id: `cronograma-${nome}`,
        usuario_id: '',
        nome,
        peso_prioridade: 10,
        cor: CORES_MATERIAS[0],
      }
    ));
  });
  const [novaMateria, setNovaMateria] = useState({ nome: '', peso_prioridade: 10, cor: CORES_MATERIAS[0] });
  const [materiaCorAberta, setMateriaCorAberta] = useState<string | null>(null);

  // Etapa 4 - Preferências
  const [periodoPreferido, setPeriodoPreferido] = useState(cronogramaInicial?.periodo_preferido || 'manha');
  const [tempoMaxSemPausa, setTempoMaxSemPausa] = useState(cronogramaInicial?.tempo_max_sem_pausa || 50);
  const [intervaloEntreSessoes, setIntervaloEntreSessoes] = useState<5 | 15>(
    cronogramaInicial?.intervalo_entre_sessoes === 5 ? 5 : 15,
  );
  const [variasMateriasPorDia, setVariasMateriasPorDia] = useState(cronogramaInicial?.varias_materias_por_dia ?? true);
  const [diaRevisaoSelecionado, setDiaRevisaoSelecionado] = useState<number | null>(() => {
    const reviewDays = new Set(
      (cronogramaInicial?.sessoes || [])
        .filter(session => session.tipo === 'revisao')
        .map(session => session.dia_semana),
    );
    return reviewDays.size === 1 ? Array.from(reviewDays)[0] : null;
  });

  const alterarDiasDisponiveis = (dia: number) => {
    const novosDiasDisponiveis = diasDisponiveis.includes(dia)
      ? diasDisponiveis.filter(d => d !== dia)
      : [...diasDisponiveis, dia];
    setDiasDisponiveis(novosDiasDisponiveis);
    setAtividadesFixas(prev => prev.map(atividade => ({
      ...atividade,
      dias_semana: atividade.dias_semana.filter(d => novosDiasDisponiveis.includes(d)),
    })));
    setNovaAtividade(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.filter(d => novosDiasDisponiveis.includes(d)),
    }));
    if (diaRevisaoSelecionado !== null && !novosDiasDisponiveis.includes(diaRevisaoSelecionado)) {
      setDiaRevisaoSelecionado(null);
    }
  };

  const adicionarAtividade = () => {
    const nome = novaAtividade.nome.slice(0, LIMITE_CARACTERES_NOME);
    if (!nome.trim()) return;
    if (!isValidTime24(novaAtividade.horario_inicio) || !isValidTime24(novaAtividade.horario_fim)) {
      setErro('Informe os horários da atividade no formato 24 horas, por exemplo 22:00.');
      return;
    }
    if (novaAtividade.dias_semana.length === 0) {
      setTentouAdicionarSemDia(true);
      return;
    }
    const atividade = { ...novaAtividade, nome };
    if (atividadeEditando === null) {
      setAtividadesFixas(prev => [...prev, atividade]);
    } else {
      setAtividadesFixas(prev => prev.map((atividade, index) => (
        index === atividadeEditando ? { ...novaAtividade, nome } : atividade
      )));
      setAtividadeEditando(null);
    }
    setTentouAdicionarSemDia(false);
    setNovaAtividade({ nome: '', dias_semana: [], horario_inicio: '08:00', horario_fim: '09:00' });
  };

  const editarAtividade = (index: number) => {
    const atividade = atividadesFixas[index];
    if (!atividade) return;
    setNovaAtividade({ ...atividade, dias_semana: [...atividade.dias_semana] });
    setAtividadeEditando(index);
    setTentouAdicionarSemDia(false);
  };

  const cancelarEdicaoAtividade = () => {
    setAtividadeEditando(null);
    setNovaAtividade({ nome: '', dias_semana: [], horario_inicio: '08:00', horario_fim: '09:00' });
    setTentouAdicionarSemDia(false);
  };

  const selecionarCategoria = (categoria: string) => {
    setCategoriaSelecionada(categoria);
    const sugestao = ATIVIDADES_SUGERIDAS[categoria]?.[0];
    setNovaAtividade(atividade => ({ ...atividade, nome: sugestao ?? '' }));
    setCategoriaAberta(false);
  };

  const adicionarMateria = () => {
    const nome = novaMateria.nome.slice(0, LIMITE_CARACTERES_NOME).trim();
    if (!nome) return;
    if (materias.some(m => m.nome === nome)) return;
    setMaterias(prev => [...prev, {
      id: 'temp-' + Math.random().toString(),
      usuario_id: '',
      ...novaMateria,
      nome,
    }]);
    setNovaMateria({ nome: '', peso_prioridade: 10, cor: CORES_MATERIAS[materias.length % CORES_MATERIAS.length] });
  };

  const handleFinalizar = async () => {
    if (materias.length === 0) { setErro('Adicione pelo menos uma matéria.'); return; }
    if (diasDisponiveis.length === 0) { setErro('Selecione pelo menos um dia disponível.'); return; }
    if (atividadesFixas.some(atividade => atividade.dias_semana.length === 0)) {
      setErro('Selecione pelo menos um dia de estudo para cada atividade fixa.');
      return;
    }
    if (!isValidTime24(horarioAcordar) || !isValidTime24(horarioDormir)) {
      setErro('Informe os horários de acordar e dormir no formato 24 horas, por exemplo 22:00.');
      return;
    }
    if (diaRevisaoSelecionado !== null && !diasDisponiveis.includes(diaRevisaoSelecionado)) {
      setErro('O dia de revisão precisa estar marcado como disponível para estudo.');
      return;
    }

    setSaving(true);
    setErro('');

    try {
      let persistedMaterias = [...materias];
      const toPersist = persistedMaterias.filter(isUnpersistedMateria);
      if (toPersist.length > 0) {
        for (const m of toPersist) {
          const response = await fetch('/api/materias', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: m.nome, peso_prioridade: m.peso_prioridade, cor: m.cor }),
          });
          const result = await response.json();
          if (!response.ok || !result.materia) {
            throw new Error(result.error || `Não foi possível salvar a matéria "${m.nome}".`);
          }
          const idx = persistedMaterias.findIndex(pm => pm.nome === result.materia.nome && isUnpersistedMateria(pm));
          if (idx !== -1) persistedMaterias[idx] = result.materia;
        }
      }

      const existingMaterias = persistedMaterias.filter(m => !isUnpersistedMateria(m));
      for (const materia of existingMaterias) {
        const response = await fetch('/api/materias', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: materia.id,
            cor: materia.cor,
            peso_prioridade: materia.peso_prioridade,
          }),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || `Não foi possível atualizar a matéria "${materia.nome}".`);
        }
      }

      const sessoesEstudo = gerarCronograma({
        horario_acordar: horarioAcordar,
        horario_dormir: horarioDormir,
        dias_disponiveis: diasDisponiveis,
        materias: persistedMaterias,
        atividades_fixas: atividadesFixas,
        tempo_max_sem_pausa: tempoMaxSemPausa,
        intervalo_entre_sessoes: intervaloEntreSessoes,
        periodo_preferido: periodoPreferido,
        varias_materias_por_dia: variasMateriasPorDia,
        criar_dia_revisao: diaRevisaoSelecionado !== null,
        dia_revisao: diaRevisaoSelecionado,
        variar_materias_por_dia: true,
        estrategia_poucas: variasMateriasPorDia ? undefined : 'dividir_por_2',
      });
      const sessoes = [
        ...sessoesEstudo,
        ...atividadesFixas.flatMap(atividade => atividade.dias_semana.map(dia => ({
          materia: atividade.nome,
          dia_semana: dia,
          horario_inicio: atividade.horario_inicio,
          horario_fim: atividade.horario_fim,
          tipo: 'atividade_fixa' as const,
        }))),
      ];

      const res = await fetch('/api/cronograma', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Meu Cronograma',
          horario_acordar: horarioAcordar,
          horario_dormir: horarioDormir,
          dias_disponiveis: diasDisponiveis,
          periodo_preferido: periodoPreferido,
          tempo_max_sem_pausa: tempoMaxSemPausa,
          intervalo_entre_sessoes: intervaloEntreSessoes,
          varias_materias_por_dia: variasMateriasPorDia,
          sessoes,
        }),
      });

      const resposta = await res.json();
      if (!res.ok) {
        throw new Error(resposta.error || 'Não foi possível salvar o cronograma. Tente novamente.');
      }
      if (!resposta.cronograma) {
        throw new Error(resposta.message || 'O cronograma não foi salvo. Verifique a conexão e tente novamente.');
      }
      onSuccess();
    } catch (e) {
      console.error('Erro ao criar cronograma:', e);
      setErro(e instanceof Error ? e.message : 'Erro ao criar cronograma. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'white', border: 'none', borderRadius: 8, padding: '8px 12px',
    fontSize: 15, fontWeight: 600, fontFamily: 'Poppins', color: '#091541', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    color: 'white', fontSize: 16, fontWeight: 600, marginBottom: 8, display: 'block',
  };

  return (
    <>
      <style jsx>{`
        .cronograma-wizard-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: 24, fontFamily: 'Poppins',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="cronograma-wizard-scroll cronograma-wizard-overlay"
      >
        <div
          onClick={event => event.stopPropagation()}
          style={{
          width: '100%', maxWidth: 600,
          maxHeight: 'calc(100dvh - 48px)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
          borderRadius: 25, padding: 32,
          boxShadow: '6px 6px 20px rgba(0, 0, 0, 0.5)',
          }}
          className="cronograma-wizard-scroll cronograma-wizard-card"
        >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="cronograma-wizard-title" style={{ color: '#FFDE68', fontSize: 26, fontWeight: 600, margin: 0 }}>
            {cronogramaInicial ? 'Editar cronograma' : 'Criar cronograma'} – Etapa {etapa}/4
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1,2,3,4].map(e => (
            <div key={e} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: e <= etapa ? '#FFDE68' : 'rgba(255,255,255,0.2)',
            }} />
          ))}
        </div>

        {/* ETAPA 1 */}
        {etapa === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>Disponibilidade</h3>

            <div className="cronograma-availability-times" style={{ display: 'flex', gap: 16 }}>
              <div className="cronograma-availability-time-field" style={{ flex: 1 }}>
                <label style={labelStyle}>Horário de acordar</label>
                <TimeInput24 className="cronograma-availability-time-input" label="Horário de acordar" value={horarioAcordar} onChange={setHorarioAcordar} style={inputStyle} />
              </div>
              <div className="cronograma-availability-time-field" style={{ flex: 1 }}>
                <label style={labelStyle}>Horário de dormir</label>
                <TimeInput24 className="cronograma-availability-time-input" label="Horário de dormir" value={horarioDormir} onChange={setHorarioDormir} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Dias disponíveis para estudo</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} onClick={() => alterarDiasDisponiveis(i)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: '2px solid',
                      borderColor: diasDisponiveis.includes(i) ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                      background: diasDisponiveis.includes(i) ? 'rgba(255,222,104,0.2)' : 'transparent',
                      color: diasDisponiveis.includes(i) ? '#FFDE68' : 'white',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2 */}
        {etapa === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>Atividades Fixas (opcional)</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, margin: 0 }}>
              Informe aulas, esportes ou compromissos que já têm horário definido.
            </p>
            {cronogramaInicial && !cronogramaInicial.sessoes.some(session => session.tipo === 'atividade_fixa') && (
              <p style={{ color: '#FFDE68', fontSize: 13, fontWeight: 600, margin: 0 }}>
                As atividades fixas deste cronograma não foram salvas anteriormente. Adicione-as novamente para incluí-las na edição.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={categoriaAberta}
                  onClick={() => setCategoriaAberta(aberta => !aberta)}
                  style={{
                    ...inputStyle,
                    width: '100%',
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>{categoriaSelecionada ? `📋 ${categoriaSelecionada}` : '📋 Selecionar categoria...'}</span>
                  <span aria-hidden="true" style={{ fontSize: 12 }}>{categoriaAberta ? '▲' : '▼'}</span>
                </button>
                {categoriaAberta && (
                  <div
                    role="listbox"
                    aria-label="Categorias de atividade"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      zIndex: 5,
                      maxHeight: 220,
                      overflowY: 'auto',
                      padding: 6,
                      borderRadius: 12,
                      border: '1px solid rgba(255,222,104,0.45)',
                      background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    }}
                  >
                    {Object.keys(ATIVIDADES_SUGERIDAS).map(categoria => (
                      <button
                        key={categoria}
                        type="button"
                        role="option"
                        aria-selected={categoriaSelecionada === categoria}
                        onClick={() => selecionarCategoria(categoria)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: 8,
                          background: categoriaSelecionada === categoria ? 'rgba(255,222,104,0.18)' : 'transparent',
                          color: categoriaSelecionada === categoria ? '#FFDE68' : 'white',
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: 'Poppins',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={event => {
                          event.currentTarget.style.background = 'rgba(255,222,104,0.18)';
                        }}
                        onMouseLeave={event => {
                          event.currentTarget.style.background = categoriaSelecionada === categoria ? 'rgba(255,222,104,0.18)' : 'transparent';
                        }}
                      >
                        {categoria}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <input
                  placeholder="Nome da atividade"
                  value={novaAtividade.nome}
                  maxLength={LIMITE_CARACTERES_NOME}
                  onChange={e => setNovaAtividade(p => ({ ...p, nome: e.target.value.slice(0, LIMITE_CARACTERES_NOME) }))}
                  style={{ ...inputStyle, width: '100%', height: 44 }}
                />
                <span style={{ alignSelf: 'flex-end', color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: '16px' }}>
                  {novaAtividade.nome.length}/{LIMITE_CARACTERES_NOME}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} type="button" disabled={!diasDisponiveis.includes(i)} title={!diasDisponiveis.includes(i) ? 'Selecione primeiro este dia como disponível para estudo.' : undefined} onClick={() => {
                    if (!diasDisponiveis.includes(i)) return;
                    const dias = novaAtividade.dias_semana;
                    const novosDias = dias.includes(i) ? dias.filter(x => x !== i) : [...dias, i];
                    setNovaAtividade(p => ({ ...p, dias_semana: novosDias }));
                    if (novosDias.length > 0) setTentouAdicionarSemDia(false);
                  }}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: '2px solid',
                      borderColor: !diasDisponiveis.includes(i) ? 'rgba(255,255,255,0.12)' : novaAtividade.dias_semana.includes(i) ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                      background: novaAtividade.dias_semana.includes(i) ? 'rgba(255,222,104,0.2)' : 'transparent',
                      color: !diasDisponiveis.includes(i) ? 'rgba(255,255,255,0.35)' : novaAtividade.dias_semana.includes(i) ? '#FFDE68' : 'white',
                      fontWeight: 600, fontSize: 13, cursor: !diasDisponiveis.includes(i) ? 'not-allowed' : 'pointer', fontFamily: 'Poppins',
                    }}>
                    {d}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 13 }}>Início</label>
                  <TimeInput24 label="Horário de início" value={novaAtividade.horario_inicio}
                    onChange={value => setNovaAtividade(p => ({ ...p, horario_inicio: value }))}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 13 }}>Fim</label>
                  <TimeInput24 label="Horário de fim" value={novaAtividade.horario_fim}
                    onChange={value => setNovaAtividade(p => ({ ...p, horario_fim: value }))}
                    style={inputStyle} />
                </div>
              </div>

              {tentouAdicionarSemDia && novaAtividade.dias_semana.length === 0 && (
                <span style={{ color: '#FFDE68', fontSize: 13, fontWeight: 600 }}>
                  Marque pelo menos um dia para adicionar a atividade.
                </span>
              )}
              <button
                onClick={adicionarAtividade}
                type="button"
                disabled={!novaAtividade.nome.trim()}
                style={{
                  padding: '10px', borderRadius: 8, border: '2px dashed rgba(255,255,255,0.4)',
                  background: 'transparent',
                  color: !novaAtividade.nome.trim() ? 'rgba(255,255,255,0.45)' : 'white',
                  fontSize: 15, fontWeight: 600,
                  cursor: !novaAtividade.nome.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'Poppins',
                }}>
                {atividadeEditando === null ? '+ Adicionar atividade' : 'Salvar alterações'}
              </button>
              {atividadeEditando !== null && (
                <button
                  type="button"
                  onClick={cancelarEdicaoAtividade}
                  style={{
                    padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
                    background: 'transparent', color: 'rgba(255,255,255,0.8)', fontSize: 14,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins',
                  }}
                >
                  Cancelar edição
                </button>
              )}
            </div>

            {atividadesFixas.length > 0 && (
              <div>
                <div style={{ color: '#FFDE68', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Adicionadas:</div>
                {atividadesFixas.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                  }}>
                    <div style={{ color: 'white', fontSize: 14, fontWeight: 600, minWidth: 0 }}>
                      <div>{a.nome} – {a.horario_inicio} às {a.horario_fim}</div>
                      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
                        {a.dias_semana.length > 0 ? a.dias_semana.map(dia => DIAS_SEMANA[dia]).join(', ') : 'Selecione novamente os dias disponíveis para estudo'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => editarAtividade(i)}
                        style={{ background: 'none', border: 'none', color: '#FFDE68', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Poppins' }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${a.nome}`}
                        onClick={() => {
                          setAtividadesFixas(prev => prev.filter((_, j) => j !== i));
                          if (atividadeEditando === i) cancelarEdicaoAtividade();
                          else if (atividadeEditando !== null && atividadeEditando > i) setAtividadeEditando(atividadeEditando - 1);
                        }}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18 }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 3 */}
        {etapa === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>Matérias</h3>

            <div>
              <label style={labelStyle}>Sugestões</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {MATERIAS_SUGERIDAS.filter(m => !materias.some(x => x.nome === m)).map(m => (
                  <button key={m} onClick={() => {
                    setMaterias(prev => [...prev, {
                      id: 'temp-' + Math.random().toString(), usuario_id: '', nome: m,
                      peso_prioridade: 10, cor: CORES_MATERIAS[prev.length % CORES_MATERIAS.length],
                    }]);
                  }}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '2px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.07)', color: 'white',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins',
                    }}>
                    + {m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  placeholder="Outra matéria"
                  value={novaMateria.nome}
                  maxLength={LIMITE_CARACTERES_NOME}
                  onChange={e => setNovaMateria(p => ({ ...p, nome: e.target.value.slice(0, LIMITE_CARACTERES_NOME) }))}
                  style={{ ...inputStyle, width: '100%', height: 40 }}
                />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
                  {novaMateria.nome.length}/{LIMITE_CARACTERES_NOME}
                </div>
              </div>
              <button onClick={adicionarMateria}
                style={{
                  padding: '0 16px', borderRadius: 8, border: 'none',
                  background: '#FFDE68', color: '#091541', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Poppins', height: 40,
                }}>
                Adicionar
              </button>
            </div>

            {materias.length > 0 && (
              <div>
                <div style={{ color: '#FFDE68', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Matérias selecionadas:</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 10 }}>
                  Clique na bolinha ao lado da matéria para escolher entre as cores predefinidas.
                </div>
                {materias.map((m, i) => (
                  <div key={m.id} style={{ marginBottom: 8 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px',
                    }}>
                      <button
                        type="button"
                        title={`Escolher cor para ${m.nome}`}
                        aria-label={`Escolher cor para ${m.nome}`}
                        aria-expanded={materiaCorAberta === String(m.id)}
                        onClick={() => setMateriaCorAberta(prev => prev === String(m.id) ? null : String(m.id))}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: m.cor,
                          border: '2px solid rgba(255,255,255,0.85)',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                      <span style={{ color: 'white', fontSize: 15, fontWeight: 600, flex: 1 }}>{m.nome}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>Prioridade:</span>
                        <select
                          value={m.peso_prioridade}
                          onChange={e => setMaterias(prev => prev.map((x, j) => j === i ? { ...x, peso_prioridade: Number(e.target.value) } : x))}
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: 13 }}
                        >
                          {[5, 10, 15, 20, 25].map(p => <option key={p} value={p}>{['Baixo', 'Normal', 'Alto', 'Muito Alto', 'Máximo'][[5,10,15,20,25].indexOf(p)]}</option>)}
                        </select>
                      </div>
                      <button onClick={() => setMaterias(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 20 }}>×</button>
                    </div>
                    {materiaCorAberta === String(m.id) && (
                      <div
                        role="group"
                        aria-label={`Cores predefinidas para ${m.nome}`}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '0 0 10px 10px',
                        }}
                      >
                        {CORES_MATERIAS.map(cor => (
                          <button
                            key={cor}
                            type="button"
                            aria-label={`Selecionar cor ${cor}`}
                            aria-pressed={m.cor.toLowerCase() === cor.toLowerCase()}
                            onClick={() => {
                              setMaterias(prev => prev.map(x => String(x.id) === String(m.id) ? { ...x, cor } : x));
                              setMateriaCorAberta(null);
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: cor,
                              border: m.cor.toLowerCase() === cor.toLowerCase() ? '3px solid white' : '2px solid rgba(255,255,255,0.45)',
                              boxShadow: m.cor.toLowerCase() === cor.toLowerCase() ? '0 0 0 2px #FFDE68' : 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 4 */}
        {etapa === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>Preferências</h3>

            <div>
              <label style={labelStyle}>Período preferido de estudo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['manha', 'tarde', 'noite'].map(p => (
                  <button key={p} onClick={() => setPeriodoPreferido(p)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: '2px solid',
                      borderColor: periodoPreferido === p ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                      background: periodoPreferido === p ? 'rgba(255,222,104,0.2)' : 'transparent',
                      color: periodoPreferido === p ? '#FFDE68' : 'white',
                      fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'Poppins',
                      textTransform: 'capitalize',
                    }}>
                    {p === 'manha' ? 'Manhã' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tempo máximo sem pausa: {tempoMaxSemPausa} min</label>
              <input type="range" min="25" max="90" step="5" value={tempoMaxSemPausa}
                onChange={e => setTempoMaxSemPausa(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#FFDE68' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>
                <span>25 min</span><span>90 min</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Intervalo entre as sessões</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([5, 15] as const).map(intervalo => (
                  <button
                    key={intervalo}
                    type="button"
                    onClick={() => setIntervaloEntreSessoes(intervalo)}
                    aria-pressed={intervaloEntreSessoes === intervalo}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: '2px solid',
                      borderColor: intervaloEntreSessoes === intervalo ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                      background: intervaloEntreSessoes === intervalo ? 'rgba(255,222,104,0.2)' : 'transparent',
                      color: intervaloEntreSessoes === intervalo ? '#FFDE68' : 'white',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      fontFamily: 'Poppins',
                    }}
                  >
                    {intervalo} minutos
                  </button>
                ))}
              </div>
            </div>

              <div>
                <label style={labelStyle}>Prefere estudar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setVariasMateriasPorDia(v)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: '2px solid',
                      borderColor: variasMateriasPorDia === v ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                      background: variasMateriasPorDia === v ? 'rgba(255,222,104,0.2)' : 'transparent',
                      color: variasMateriasPorDia === v ? '#FFDE68' : 'white',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins',
                    }}>
                    {v ? 'Muitas matérias/dia' : 'Menos matérias/dia'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color: 'white', fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 8 }}>
                Dia exclusivo para revisão (opcional)
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DIAS_SEMANA.map((dia, index) => {
                  const disponivel = diasDisponiveis.includes(index);
                  return (
                    <button
                      key={dia}
                      onClick={() => {
                        if (!disponivel) {
                          setErro('Selecione primeiro o dia como disponível para estudo.');
                          return;
                        }
                        setDiaRevisaoSelecionado((prev) => prev === index ? null : index);
                        setErro('');
                      }}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: '2px solid',
                        borderColor: diaRevisaoSelecionado === index ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                        background: diaRevisaoSelecionado === index ? 'rgba(255,222,104,0.2)' : 'transparent',
                        color: disponivel ? (diaRevisaoSelecionado === index ? '#FFDE68' : 'white') : 'rgba(255,255,255,0.35)',
                        fontWeight: 600, fontSize: 13, cursor: disponivel ? 'pointer' : 'not-allowed',
                        fontFamily: 'Poppins',
                        opacity: disponivel ? 1 : 0.7,
                      }}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>

            {erro && (
              <div style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.4)', borderRadius: 8, padding: '10px 16px', color: '#ffaaaa', fontSize: 15, fontWeight: 600 }}>
                {erro}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="cronograma-wizard-navigation" style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {etapa > 1 && (
            <button onClick={() => setEtapa(e => e - 1)}
              style={{
                flex: 1, padding: '14px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.3)',
                background: 'transparent', color: 'white', fontSize: 17, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins',
              }}>
              Voltar
            </button>
          )}
          {etapa < 4 ? (
            <button onClick={() => setEtapa(e => e + 1)}
              style={{
                flex: 1, padding: '14px', borderRadius: 12, border: 'none',
                background: '#FFDE68', color: '#091541', fontSize: 17, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins',
              }}>
              Próximo
            </button>
          ) : (
            <button onClick={handleFinalizar} disabled={saving}
              style={{
                flex: 1, padding: '14px', borderRadius: 12, border: 'none',
                background: saving ? 'rgba(255,255,255,0.2)' : '#FFDE68',
                color: saving ? 'rgba(255,255,255,0.4)' : '#091541',
                fontSize: 17, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Poppins',
              }}>
              {saving ? 'Gerando cronograma...' : 'Criar Cronograma'}
            </button>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
