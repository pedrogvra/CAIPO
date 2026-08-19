'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PomodoroEstado } from '@/types/pomodoro';
import { formatTime } from '@/lib/utils';

interface UsePomodoroProps {
  tempoFoco: number; // minutes
  tempoPausaCurta: number;
  tempoPausaLonga: number;
  sessoesAntesPausaLonga: number;
  onSessaoConcluida?: (duracao: number) => void;
  onSessaoInterrompida?: (duracao: number, motivo: string) => void;
}

interface UsePomodoroReturn {
  estado: PomodoroEstado;
  tempoRestante: number;
  tempoFormatado: string;
  sessaoAtual: number;
  iniciado: boolean;
  pausado: boolean;
  iniciar: () => void;
  pausar: () => void;
  retomar: () => void;
  pular: () => void;
  finalizar: (motivo?: string) => void;
  resetar: () => void;
  definirModo: (modo: PomodoroEstado) => void;
}

export function usePomodoro({
  tempoFoco,
  tempoPausaCurta,
  tempoPausaLonga,
  sessoesAntesPausaLonga,
  onSessaoConcluida,
  onSessaoInterrompida,
}: UsePomodoroProps): UsePomodoroReturn {
  const [estado, setEstado] = useState<PomodoroEstado>('idle');
  const [tempoRestante, setTempoRestante] = useState(tempoFoco * 60);
  const [sessaoAtual, setSessaoAtual] = useState(1);
  const [iniciado, setIniciado] = useState(false);
  const [pausado, setPausado] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tempoIniciadoRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const obterAudioContext = () => {
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  };

  const tocarSomDeConclusao = (modo: PomodoroEstado) => {
    const audioContext = obterAudioContext();
    if (!audioContext) return;
    void audioContext.resume();

    const frequencias = modo === 'focus'
      ? [660, 880]
      : modo === 'pausa_longa'
        ? [523, 659, 784]
        : [784, 988];

    frequencias.forEach((frequencia, indice) => {
      const oscillator = audioContext.createOscillator();
      const ganho = audioContext.createGain();
      const inicio = audioContext.currentTime + indice * 0.18;
      oscillator.frequency.value = frequencia;
      oscillator.type = 'sine';
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.16);
      oscillator.connect(ganho);
      ganho.connect(audioContext.destination);
      oscillator.start(inicio);
      oscillator.stop(inicio + 0.18);
    });

  };

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getDuracaoAtual = (est: PomodoroEstado) => {
    switch (est) {
      case 'focus': return tempoFoco * 60;
      case 'pausa_curta': return tempoPausaCurta * 60;
      case 'pausa_longa': return tempoPausaLonga * 60;
      default: return tempoFoco * 60;
    }
  };

  const iniciarTimer = useCallback((duracaoInicial: number) => {
    setTempoRestante(duracaoInicial);
    tempoIniciadoRef.current = Date.now();
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (tempoRestante === 0 && iniciado && !pausado) {
      tocarSomDeConclusao(estado);
      if (estado === 'focus') {
        const duracaoReal = Math.floor((Date.now() - tempoIniciadoRef.current) / 1000 / 60);
        onSessaoConcluida?.(duracaoReal);
        const novasSessoes = sessaoAtual + 1;
        setSessaoAtual(novasSessoes);
        if (novasSessoes % sessoesAntesPausaLonga === 0) {
          setEstado('pausa_longa');
          iniciarTimer(tempoPausaLonga * 60);
        } else {
          setEstado('pausa_curta');
          iniciarTimer(tempoPausaCurta * 60);
        }
      } else {
        setEstado('focus');
        iniciarTimer(tempoFoco * 60);
      }
    }
  }, [tempoRestante, iniciado, pausado, estado, sessaoAtual, sessoesAntesPausaLonga, tempoFoco, tempoPausaCurta, tempoPausaLonga, iniciarTimer, onSessaoConcluida]);

  useEffect(() => {
    return () => {
      clearTimer();
      void audioContextRef.current?.close();
    };
  }, []);

  const iniciar = useCallback(() => {
    void obterAudioContext()?.resume();
    setEstado('focus');
    setIniciado(true);
    setPausado(false);
    iniciarTimer(tempoFoco * 60);
  }, [tempoFoco, iniciarTimer]);

  const definirModo = useCallback((modo: PomodoroEstado) => {
    clearTimer();
    const duracao = getDuracaoAtual(modo);
    setEstado(modo);
    setIniciado(false);
    setPausado(false);
    setTempoRestante(duracao);
    setSessaoAtual(1);
  }, [getDuracaoAtual]);

  const pausar = useCallback(() => {
    clearTimer();
    setPausado(true);
  }, []);

  const retomar = useCallback(() => {
    setPausado(false);
    tempoIniciadoRef.current = Date.now();
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pular = useCallback(() => {
    clearTimer();
    if (estado === 'focus') {
      setEstado('pausa_curta');
      iniciarTimer(tempoPausaCurta * 60);
    } else {
      setEstado('focus');
      iniciarTimer(tempoFoco * 60);
    }
  }, [estado, tempoPausaCurta, tempoFoco, iniciarTimer]);

  const finalizar = useCallback((motivo?: string) => {
    clearTimer();
    const duracaoReal = Math.floor((Date.now() - tempoIniciadoRef.current) / 1000 / 60);
    if (motivo) onSessaoInterrompida?.(duracaoReal, motivo);
    setEstado('idle');
    setIniciado(false);
    setPausado(false);
    setTempoRestante(tempoFoco * 60);
    setSessaoAtual(1);
  }, [tempoFoco, onSessaoInterrompida]);

  const resetar = useCallback(() => {
    clearTimer();
    setEstado('idle');
    setIniciado(false);
    setPausado(false);
    setTempoRestante(tempoFoco * 60);
    setSessaoAtual(1);
  }, [tempoFoco]);

  useEffect(() => {
    if (!iniciado && !pausado) {
      const estadoBase = estado === 'idle' ? 'focus' : estado;
      const duracaoAtual = getDuracaoAtual(estadoBase);
      setTempoRestante(duracaoAtual);
    }
  }, [tempoFoco, tempoPausaCurta, tempoPausaLonga, estado, iniciado, pausado, getDuracaoAtual]);

  return {
    estado,
    tempoRestante,
    tempoFormatado: formatTime(tempoRestante),
    sessaoAtual,
    iniciado,
    pausado,
    iniciar,
    pausar,
    retomar,
    pular,
    finalizar,
    resetar,
    definirModo,
  };
}
