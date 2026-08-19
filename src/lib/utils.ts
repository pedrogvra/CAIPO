export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getToday(timeZone = process.env.CAIPO_TIMEZONE || 'America/Sao_Paulo'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function classificarPontuacao(pontuacao: number): 'verde' | 'amarelo' | 'vermelho' {
  if (pontuacao >= 80) return 'verde';
  if (pontuacao >= 40) return 'amarelo';
  return 'vermelho';
}

export function getDescricaoPerfil(classificacao: 'verde' | 'amarelo' | 'vermelho'): string {
  const map = {
    verde: 'Você já possui hábitos sólidos de estudo.',
    amarelo: 'Você possui hábitos medianos. Vamos melhorá-los juntos.',
    vermelho: 'Percebemos que você enfrenta dificuldades. Vamos construir esse hábito juntos.',
  };
  return map[classificacao];
}
