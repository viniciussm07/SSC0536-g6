import type { OperadorColuna } from '@ssc0536/common';

export const ROTULOS_OPERADOR: Record<OperadorColuna, string> = {
  contem: 'contém',
  comecaCom: 'começa com',
  terminaCom: 'termina com',
  igual: 'é igual a',
  diferente: 'é diferente de',
  maior: 'é maior que',
  maiorOuIgual: 'é maior ou igual a',
  menor: 'é menor que',
  menorOuIgual: 'é menor ou igual a',
  entre: 'está entre',
  em: 'é um de',
  nulo: 'não foi informado',
  naoNulo: 'foi informado',
};

export const rotuloOperador = (operador: OperadorColuna) =>
  ROTULOS_OPERADOR[operador];
