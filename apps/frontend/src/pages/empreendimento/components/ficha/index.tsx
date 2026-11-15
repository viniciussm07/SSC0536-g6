import { Link } from '@tanstack/react-router';
import type { EmpreendimentoDetalhe } from '@ssc0536/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROTULOS_PENDENCIA, ROTULOS_SITUACAO } from '@/utils/cadastro';
import { formatarCnpj, rotuloIdentificacao } from '@/utils/documento';

const dataBr = (data: string | null) =>
  data ? data.split('-').reverse().join('/') : null;
const nada = <span className="text-muted-foreground">Não informado</span>;

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd>{children ?? nada}</dd>
    </div>
  );
}

export function FichaCadastral({
  detalhe,
  podeEditar,
}: {
  detalhe: EmpreendimentoDetalhe;
  podeEditar: boolean;
}) {
  return (
    <section aria-label="Cadastro" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{detalhe.nomeFantasia}</h1>
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {rotuloIdentificacao(detalhe.cnpj, detalhe.id)}
            <Badge
              variant={detalhe.situacao === 'ativo' ? 'secondary' : 'outline'}
            >
              {ROTULOS_SITUACAO[
                detalhe.situacao as keyof typeof ROTULOS_SITUACAO
              ] ?? detalhe.situacao}
            </Badge>
          </p>
        </div>
        {podeEditar && (
          <Button asChild variant="outline">
            <Link to="/editar">Editar cadastro</Link>
          </Button>
        )}
      </div>

      {detalhe.pendencias.length > 0 && (
        <div
          role="status"
          aria-label="Informações faltantes"
          className="space-y-2 rounded-md border p-4"
        >
          <p className="font-medium">Informações faltantes neste cadastro</p>
          <ul className="flex flex-wrap gap-2">
            {detalhe.pendencias.map((p) => (
              <li key={p}>
                <Badge variant="outline">{ROTULOS_PENDENCIA[p]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Razão social">{detalhe.razaoSocial}</Campo>
        <Campo rotulo="CNPJ">
          {detalhe.cnpj && formatarCnpj(detalhe.cnpj)}
        </Campo>
        <Campo rotulo="ID de origem">{detalhe.idOrigem}</Campo>
        <Campo rotulo="Tipo de hospedagem">{detalhe.tipoHospedagem}</Campo>
        <Campo rotulo="Categoria do indicador">
          {detalhe.categoriaIndicador}
        </Campo>
        <Campo rotulo="Segmentos">
          {detalhe.segmentos.length
            ? detalhe.segmentos.map((s) => s.nome).join(', ')
            : null}
        </Campo>
        <Campo rotulo="Endereço">{detalhe.endereco}</Campo>
        <Campo rotulo="Zona">
          {detalhe.zona && (detalhe.zona === 'urbana' ? 'Urbana' : 'Rural')}
        </Campo>
        <Campo rotulo="Localização">
          {detalhe.localizacao &&
            `${detalhe.localizacao.latitude}, ${detalhe.localizacao.longitude}`}
        </Campo>
        <Campo rotulo="Início das atividades">
          {dataBr(detalhe.dataInicioAtividades)}
        </Campo>
        {detalhe.situacao === 'encerrado' && (
          <Campo rotulo="Encerramento">
            {dataBr(detalhe.dataEncerramento)}
          </Campo>
        )}
      </dl>
    </section>
  );
}
