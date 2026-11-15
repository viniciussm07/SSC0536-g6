import type { ValorAuditoria } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useEventoAuditoria } from '../../hooks';
import { ROTULOS_ORIGEM } from '../../colunas';
const ROTULOS_CAMPOS: Readonly<Record<string, string>> = {
  nomeFantasia: 'Nome fantasia',
  razaoSocial: 'Razão social',
  cnpj: 'CNPJ',
  situacao: 'Situação',
  idOrigem: 'ID de origem',
  tipoHospedagem: 'Tipo de hospedagem',
  categoriaIndicador: 'Categoria do indicador',
  endereco: 'Endereço',
  zona: 'Zona',
  localizacao: 'Localização',
  dataInicioAtividades: 'Início das atividades',
  dataEncerramento: 'Encerramento',
  segmentos: 'Segmentos',
  contatos: 'Contatos',
  cadastur: 'Cadastur',
  capacidade: 'Capacidade',
  itens: 'Itens do inventário',
  vigenciaInicio: 'Início da vigência',
  vigenciaFim: 'Fim da vigência',
  tipoAlteracao: 'Tipo de alteração',
  situacaoConferencia: 'Situação da conferência',
  motivo: 'Motivo',
  evento: 'Evento',
  nome: 'Nome',
  email: 'E-mail',
  perfil: 'Perfil',
  ativo: 'Ativo',
  permissoes: 'Permissões',
  permitido: 'Visibilidade liberada',
  versao: 'Versão',
  rotulo: 'Rótulo',
  pergunta: 'Pergunta',
};
const rotuloCampo = (campo: string) => ROTULOS_CAMPOS[campo] ?? campo;

function Valor({
  valor,
  presente,
}: {
  valor: ValorAuditoria;
  presente: boolean;
}) {
  if (!presente) return <span className="text-muted-foreground">Ausente</span>;
  if (valor === null)
    return <span className="text-muted-foreground">Não informado</span>;
  if (typeof valor === 'boolean') return <span>{valor ? 'Sim' : 'Não'}</span>;
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm">
      {typeof valor === 'object'
        ? JSON.stringify(valor, null, 2)
        : String(valor)}
    </pre>
  );
}
export function DetalheEvento({ id }: { id: number }) {
  const consulta = useEventoAuditoria(id);
  if (consulta.isPending) return <p role="status">Carregando evento…</p>;
  if (consulta.isError)
    return (
      <div className="space-y-3">
        <p role="alert">{consulta.error.message}</p>
        <Button variant="outline" onClick={() => void consulta.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  const evento = consulta.data;
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Autor</dt>
          <dd>{evento.autor}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Data e hora</dt>
          <dd>{new Date(evento.em).toLocaleString('pt-BR')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Registro</dt>
          <dd>
            {evento.entidade} · {evento.entidadeId}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ação</dt>
          <dd>{evento.acao}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Origem</dt>
          <dd>{ROTULOS_ORIGEM[evento.origem]}</dd>
        </div>
        {evento.processo && (
          <div>
            <dt className="text-muted-foreground">Processo</dt>
            <dd>{evento.processo}</dd>
          </div>
        )}
        {evento.correlacaoId && (
          <div>
            <dt className="text-muted-foreground">Correlação</dt>
            <dd className="break-all">{evento.correlacaoId}</dd>
          </div>
        )}
      </dl>
      <section
        aria-label="Alterações registradas"
        className="min-w-0 space-y-3"
      >
        <h2 className="text-lg font-semibold">Antes e depois</h2>
        {evento.diferencas.length ? (
          <Table aria-label="Diferenças do evento" className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Antes</TableHead>
                <TableHead>Depois</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evento.diferencas.map((d) => (
                <TableRow key={rotuloCampo(d.campo)}>
                  <TableCell className="whitespace-normal break-words align-top">
                    {rotuloCampo(d.campo)}
                  </TableCell>
                  <TableCell className="whitespace-normal align-top">
                    <Valor valor={d.antes} presente={d.antesPresente} />
                  </TableCell>
                  <TableCell className="whitespace-normal align-top">
                    <Valor valor={d.depois} presente={d.depoisPresente} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>Nenhuma diferença de campos registrada neste evento.</p>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        Ausente indica campo não incluído no snapshot; não equivale a null, zero
        ou falso. O evento registra somente os campos auditados pela operação.
      </p>
    </div>
  );
}
