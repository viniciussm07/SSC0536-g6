import type {
  CadasturEntrada,
  ErroCampo,
  SituacaoEmpreendimento,
} from './cadastro.types.js';

export interface EstadoCadastro {
  situacao: SituacaoEmpreendimento;
  cnpj: string | null;
  dataInicioAtividades: string | null;
  dataEncerramento: string | null;
  cadastur: readonly Pick<CadasturEntrada, 'situacao'>[];
}

/** Regras entre campos sobre o estado FINAL do cadastro (depois de mesclar a atualização). */
export function validarConsistenciaCadastro(estado: EstadoCadastro) {
  const erros: ErroCampo[] = [];
  if (estado.situacao === 'encerrado' && !estado.dataEncerramento)
    erros.push({
      field: 'dataEncerramento',
      message: 'Informe a data de encerramento.',
    });
  if (estado.situacao === 'ativo' && estado.dataEncerramento)
    erros.push({
      field: 'dataEncerramento',
      message:
        'Empreendimento ativo não tem data de encerramento; reative limpando a data.',
    });
  if (
    estado.dataInicioAtividades &&
    estado.dataEncerramento &&
    estado.dataEncerramento < estado.dataInicioAtividades
  )
    erros.push({
      field: 'dataEncerramento',
      message: 'O encerramento não pode ser anterior ao início das atividades.',
    });
  if (!estado.cnpj && estado.cadastur.some((c) => c.situacao === 'igual_cnpj'))
    erros.push({
      field: 'cadastur',
      message: 'Cadastur igual ao CNPJ exige um CNPJ cadastrado.',
    });
  return erros;
}
