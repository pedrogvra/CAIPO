export const MAX_CARACTERES_NOME = 30;
export const MIN_CARACTERES_NOME = 2;

export function contarCaracteresNome(nome: string): number {
  return Array.from(nome.trim()).length;
}

export function validarNome(nome: string): string | null {
  const nomeNormalizado = nome.trim();
  if (!nomeNormalizado) return 'Informe seu nome.';
  const quantidadeCaracteres = contarCaracteresNome(nomeNormalizado);
  if (quantidadeCaracteres < MIN_CARACTERES_NOME) {
    return `O nome deve ter pelo menos ${MIN_CARACTERES_NOME} caracteres.`;
  }
  if (quantidadeCaracteres > MAX_CARACTERES_NOME) {
    return `O nome deve ter no máximo ${MAX_CARACTERES_NOME} caracteres.`;
  }
  return null;
}
