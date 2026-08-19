'use client';

import { useState } from 'react';
import { gerarCronograma } from '@/services/algoritmos/gerarCronograma';
import type { Materia } from '@/types/cronograma';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface AtividadeFixa {
  nome: string;
  categoria: string;
  dias_semana: number[];
  horario_inicio: string;
  horario_fim: string;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CORES_MATERIAS = ['#1E55A8', '#5395CF', '#0C3067', '#091541', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const MATERIAS_SUGERIDAS = ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Inglês'];
const CATEGORIAS_ATIVIDADES = [
  'Refeição',
  'Aula / Escola',
  'Trabalho',
  'Esporte / Treino',
  'Transporte / Deslocamento',
  'Lazer / Pessoal',
  'Outro',
];

export default function CronogramaWizard({ onClose, onSuccess }: Props) {
  const [etapa, setEtapa] = useState(1);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  // Etapa 1 - Disponibilidade
  const [horarioAcordar, setHorarioAcordar] = useState('07:00');
  const [horarioDormir, setHorarioDormir] = useState('23:00');
  const [diasDisponiveis, setDiasDisponiveis] = useState<number[]>([1, 2, 3, 4, 5]);

  // Etapa 2 - Atividades Fixas
  const [atividadesFixas, setAtividadesFixas] = useState<AtividadeFixa[]>([]);
  const [novaAtividade, setNovaAtividade] = useState({ nome: '', categoria: '', dias_semana: [] as number[], horario_inicio: '08:00', horario_fim: '09:00' });

  // Etapa 3 - Matérias
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [novaMateria, setNovaMateria] = useState({ nome: '', peso_prioridade: 10, cor: CORES_MATERIAS[0] });

  // Etapa 4 - Preferências
  const [periodoPreferido, setPeriodoPreferido] = useState('manha');
  const [tempoMaxSemPausa, setTempoMaxSemPausa] = useState(50);
  const [variasMateriasPorDia, setVariasMateriasPorDia] = useState(true);
  const [diaRevisaoSelecionado, setDiaRevisaoSelecionado] = useState<number | null>(null);

  const toggleDia = (dia: number, dias: number[], setDias: (d: number[]) => void) => {
    setDias(dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia]);
  };

  const adicionarAtividade = () => {
    if (!novaAtividade.nome.trim()) {
      setErro('Informe o nome da atividade fixa.');
      return;
    }
    if (!novaAtividade.categoria) {
      setErro('Selecione uma categoria para a atividade fixa.');
      return;
    }
    if (novaAtividade.dias_semana.length === 0) {
      setErro('Selecione pelo menos um dia da semana para a atividade fixa.');
      return;
    }
    if (novaAtividade.dias_semana.some(dia => !diasDisponiveis.includes(dia))) {
      setErro('A atividade fixa só pode usar dias disponíveis para estudo.');
      return;
    }
    setAtividadesFixas(prev => [...prev, { ...novaAtividade }]);
    setErro('');
    setNovaAtividade({ nome: '', categoria: '', dias_semana: [], horario_inicio: '08:00', horario_fim: '09:00' });
  };

  const adicionarMateria = () => {
    if (!novaMateria.nome) return;
    if (materias.some(m => m.nome === novaMateria.nome)) return;
    setMaterias(prev => [...prev, {
      id: 'temp-' + Math.random().toString(),
      usuario_id: '',
      ...novaMateria,
    }]);
    setNovaMateria({ nome: '', peso_prioridade: 10, cor: CORES_MATERIAS[materias.length % CORES_MATERIAS.length] });
  };

  const handleFinalizar = async () => {
    if (materias.length === 0) { setErro('Adicione pelo menos uma matéria.'); return; }
    if (diasDisponiveis.length === 0) { setErro('Selecione pelo menos um dia disponível.'); return; }
    if (atividadesFixas.some(atividade => atividade.dias_semana.some(dia => !diasDisponiveis.includes(dia)))) {
      setErro('As atividades fixas só podem usar dias disponíveis para estudo.');
      return;
    }
    if (diaRevisaoSelecionado !== null && !diasDisponiveis.includes(diaRevisaoSelecionado)) {
      setErro('O dia de revisão precisa estar marcado como disponível para estudo.');
      return;
    }

    setSaving(true);
    setErro('');

    try {
      const sessoes = gerarCronograma({
        horario_acordar: horarioAcordar,
        horario_dormir: horarioDormir,
        dias_disponiveis: diasDisponiveis,
        materias,
        atividades_fixas: atividadesFixas,
        tempo_max_sem_pausa: tempoMaxSemPausa,
        periodo_preferido: periodoPreferido,
        varias_materias_por_dia: variasMateriasPorDia,
        criar_dia_revisao: diaRevisaoSelecionado !== null,
        dia_revisao: diaRevisaoSelecionado,
        variar_materias_por_dia: true,
        estrategia_poucas: variasMateriasPorDia ? undefined : 'dividir_por_2',
      });

      const res = await fetch('/api/cronograma', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Meu Cronograma',
          horario_acordar: horarioAcordar,
          horario_dormir: horarioDormir,
          dias_disponiveis: diasDisponiveis,
          periodo_preferido: periodoPreferido,
          tempo_max_sem_pausa: tempoMaxSemPausa,
          varias_materias_por_dia: variasMateriasPorDia,
          sessoes,
        }),
      });

      if (!res.ok) {
        const resposta = await res.json().catch(() => null);
        throw new Error(resposta?.detalhe || resposta?.error || 'Erro ao salvar cronograma');
      }

      const materiasResponse = await fetch('/api/materias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materias: materias.map((materia) => ({
            nome: materia.nome,
            peso_prioridade: materia.peso_prioridade,
            cor: materia.cor,
          })),
        }),
      });
      if (!materiasResponse.ok) {
        const resposta = await materiasResponse.json().catch(() => null);
        throw new Error(resposta?.error || 'Cronograma salvo, mas não foi possível salvar as matérias.');
      }
      onSuccess();
    } catch (e) {
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
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24, fontFamily: 'Poppins',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }} className="cronograma-wizard-scroll">
        <div style={{
          width: '100%', maxWidth: 600,
          minHeight: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
          borderRadius: 25, padding: 32,
          boxShadow: '6px 6px 20px rgba(0, 0, 0, 0.5)',
        }} className="cronograma-wizard-scroll">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: '#FFDE68', fontSize: 26, fontWeight: 600, margin: 0 }}>
            Criar Cronograma – Etapa {etapa}/4
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

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Horário de acordar</label>
                <input type="time" value={horarioAcordar} onChange={e => setHorarioAcordar(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Horário de dormir</label>
                <input type="time" value={horarioDormir} onChange={e => setHorarioDormir(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Dias disponíveis para estudo</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} onClick={() => toggleDia(i, diasDisponiveis, setDiasDisponiveis)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={novaAtividade.categoria}
                  onChange={e => setNovaAtividade(p => ({ ...p, categoria: e.target.value }))}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    height: 44,
                    cursor: 'pointer',
                    appearance: 'none',
                    paddingRight: 40,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3E%3Cpath fill=%27%23091541%27 d=%27M1 1l5 5 5-5%27/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 14px center',
                  }}
                >
                  <option value="">📋 Selecionar categoria...</option>
                  {CATEGORIAS_ATIVIDADES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Nome da atividade"
                  value={novaAtividade.nome}
                  onChange={e => setNovaAtividade(p => ({ ...p, nome: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', height: 44 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} disabled={!diasDisponiveis.includes(i)} onClick={() => {
                    const dias = novaAtividade.dias_semana;
                    setNovaAtividade(p => ({
                      ...p,
                      dias_semana: dias.includes(i) ? dias.filter(x => x !== i) : [...dias, i]
                    }));
                  }}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: '2px solid',
                      borderColor: novaAtividade.dias_semana.includes(i) ? '#FFDE68' : 'rgba(255,255,255,0.3)',
                      background: novaAtividade.dias_semana.includes(i) ? 'rgba(255,222,104,0.2)' : 'transparent',
                      color: novaAtividade.dias_semana.includes(i) ? '#FFDE68' : 'white',
                      opacity: diasDisponiveis.includes(i) ? 1 : 0.45,
                      fontWeight: 600, fontSize: 13,
                      cursor: diasDisponiveis.includes(i) ? 'pointer' : 'not-allowed',
                      fontFamily: 'Poppins',
                    }}>
                    {d}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 13 }}>Início</label>
                  <input type="time" value={novaAtividade.horario_inicio}
                    onChange={e => setNovaAtividade(p => ({ ...p, horario_inicio: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 13 }}>Fim</label>
                  <input type="time" value={novaAtividade.horario_fim}
                    onChange={e => setNovaAtividade(p => ({ ...p, horario_fim: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }} />
                </div>
              </div>

              <button onClick={adicionarAtividade}
                style={{
                  padding: '10px', borderRadius: 8, border: '2px dashed rgba(255,255,255,0.4)',
                  background: 'transparent', color: 'white', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Poppins',
                }}>
                + Adicionar atividade
              </button>
            </div>

            {atividadesFixas.length > 0 && (
              <div>
                <div style={{ color: '#FFDE68', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Adicionadas:</div>
                {atividadesFixas.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                  }}>
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
                      {a.nome} ({a.categoria}) – {a.horario_inicio} às {a.horario_fim}
                    </span>
                    <button onClick={() => setAtividadesFixas(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18 }}>×</button>
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
              <input placeholder="Outra matéria" value={novaMateria.nome}
                onChange={e => setNovaMateria(p => ({ ...p, nome: e.target.value }))}
                style={{ ...inputStyle, flex: 1, height: 40 }} />
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
                {materias.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: m.cor, flexShrink: 0 }} />
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
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
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
