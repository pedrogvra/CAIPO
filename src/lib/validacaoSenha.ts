export function validarSenha(senha: string): string | null {
  if ([...senha].length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) {
    return 'A senha deve conter pelo menos uma letra e um dígito.';
  }
  return null;
}
