import { SENHA_LIMITES } from '@ssc0536/common';

export function validarEmail({ value }: { value: string }) {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? undefined
    : 'Informe um e-mail válido.';
}
export function validarSenhaLogin({ value }: { value: string }) {
  return value.length >= 1 && value.length <= SENHA_LIMITES.maximo
    ? undefined
    : 'Informe a senha (até 128 caracteres).';
}
export function validarSenhaAtivacao({ value }: { value: string }) {
  return value.length >= SENHA_LIMITES.minimo &&
    value.length <= SENHA_LIMITES.maximo
    ? undefined
    : 'Use entre 12 e 128 caracteres na senha.';
}
export function validarCodigoAtivacao({ value }: { value: string }) {
  return /^[a-f0-9]{64}$/.test(value)
    ? undefined
    : 'Informe o código de 64 caracteres fornecido pelo administrador.';
}
