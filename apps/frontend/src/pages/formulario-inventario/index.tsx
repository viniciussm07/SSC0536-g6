import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ESTADOS_ITEM_INVENTARIO,
  type FormularioCatalogo,
  type GrupoCatalogo,
  type RespostaItemInventario,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useAppForm } from '@/hooks/use-app-form';
import { useSegmentos } from '@/hooks/use-segmentos';
import { catalogoService } from '@/services/catalogo';
import { errosDeCampo } from '@/services/cadastro';
import { HttpError } from '@/services/http';
import { ROTULOS_ESTADO_ITEM, ROTULOS_SELECAO } from '@/utils/catalogo';

const OPCOES_ESTADO = ESTADOS_ITEM_INVENTARIO.map((valor) => ({
  value: valor,
  label: ROTULOS_ESTADO_ITEM[valor],
}));
type Valores = Record<string, string>;

const chaveEstado = (id: number) => `e${id}`;
const chaveDetalhe = (id: number) => `d${id}`;
const chaveQuantidade = (id: number) => `q${id}`;

function valoresIniciais(formulario: FormularioCatalogo): Valores {
  const valores: Valores = {};
  for (const grupo of formulario.grupos)
    for (const item of grupo.itens) {
      valores[chaveEstado(item.id)] = 'nao_informado';
      valores[chaveDetalhe(item.id)] = '';
      valores[chaveQuantidade(item.id)] = '';
    }
  return valores;
}

/** Itens não informados são omitidos: desconhecido nunca vira "não". */
function montarRespostas(
  formulario: FormularioCatalogo,
  valores: Valores,
): RespostaItemInventario[] {
  const respostas: RespostaItemInventario[] = [];
  for (const grupo of formulario.grupos)
    for (const item of grupo.itens) {
      const estado = valores[chaveEstado(item.id)];
      if (estado === 'nao_informado') continue;
      const detalhe = valores[chaveDetalhe(item.id)].trim();
      const quantidade = valores[chaveQuantidade(item.id)].trim();
      respostas.push({
        itemId: item.id,
        estado: estado as RespostaItemInventario['estado'],
        ...(detalhe ? { detalhe } : {}),
        ...(quantidade
          ? {
              quantidade: /^\d+$/.test(quantidade)
                ? Number(quantidade)
                : (quantidade as unknown as number),
            }
          : {}),
      });
    }
  return respostas;
}

function agruparPorSecao(grupos: readonly GrupoCatalogo[]) {
  const secoes = new Map<string, GrupoCatalogo[]>();
  for (const grupo of grupos)
    secoes.set(grupo.secao ?? 'Outros', [
      ...(secoes.get(grupo.secao ?? 'Outros') ?? []),
      grupo,
    ]);
  return [...secoes];
}

function Formulario({
  formulario,
  segmentoId,
}: {
  formulario: FormularioCatalogo;
  segmentoId: number;
}) {
  // Erros do servidor por item (índice da resposta enviada) e por grupo.
  const [errosItem, setErrosItem] = useState<Record<number, string[]>>({});
  const [errosGrupo, setErrosGrupo] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<string>('');
  const validar = useMutation({
    mutationFn: (respostas: RespostaItemInventario[]) =>
      catalogoService.validar(segmentoId, respostas),
  });
  const form = useAppForm({
    defaultValues: valoresIniciais(formulario),
    onSubmit: async ({ value }) => {
      const respostas = montarRespostas(formulario, value);
      setErrosItem({});
      setErrosGrupo({});
      setResultado('');
      try {
        const ok = await validar.mutateAsync(respostas);
        setResultado(
          `Respostas válidas: ${ok.itens.length} ${ok.itens.length === 1 ? 'item informado' : 'itens informados'}. Pré-visualização: nada foi gravado.`,
        );
      } catch (erro) {
        if (!(erro instanceof HttpError) || erro.code !== 'ENTRADA_INVALIDA')
          return;
        const porItem: Record<number, string[]> = {};
        const porGrupo: Record<string, string> = {};
        for (const { field, message } of errosDeCampo(erro.details)) {
          const m = /^itens\[(\d+)\]/.exec(field);
          if (m) {
            const itemId = respostas[Number(m[1])]?.itemId;
            if (itemId !== undefined)
              porItem[itemId] = [...(porItem[itemId] ?? []), message];
          } else if (field.startsWith('grupos.'))
            porGrupo[field.slice('grupos.'.length)] = message;
        }
        setErrosItem(porItem);
        setErrosGrupo(porGrupo);
      }
    },
  });
  const secoes = useMemo(
    () => agruparPorSecao(formulario.grupos),
    [formulario.grupos],
  );

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      {secoes.map(([secao, grupos]) => (
        <section key={secao} aria-label={secao} className="space-y-4">
          <h2 className="text-lg font-semibold">{secao}</h2>
          {grupos.map((grupo) => (
            <fieldset
              key={grupo.id}
              className="space-y-3 rounded-lg border p-4"
              aria-describedby={
                errosGrupo[grupo.chave] ? `erro-${grupo.id}` : undefined
              }
            >
              <legend className="px-1 font-medium">
                {grupo.pergunta}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({ROTULOS_SELECAO[grupo.selecao]})
                </span>
              </legend>
              <div className="grid gap-3 md:grid-cols-2">
                {grupo.itens.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <form.AppField name={chaveEstado(item.id)}>
                      {(f) => (
                        <f.Select label={item.rotulo} options={OPCOES_ESTADO} />
                      )}
                    </form.AppField>
                    {(item.outro || item.aceitaQuantidade) && (
                      <form.Subscribe
                        selector={(s) => s.values[chaveEstado(item.id)]}
                      >
                        {(estado) =>
                          estado === 'sim' && (
                            <div className="space-y-2 pl-3">
                              {item.outro && (
                                <form.AppField name={chaveDetalhe(item.id)}>
                                  {(f) => (
                                    <f.Input
                                      label={`Detalhe de “${item.rotulo}”`}
                                      maxLength={300}
                                    />
                                  )}
                                </form.AppField>
                              )}
                              {item.aceitaQuantidade && (
                                <form.AppField name={chaveQuantidade(item.id)}>
                                  {(f) => (
                                    <f.Input
                                      label={`Quantidade de “${item.rotulo}”`}
                                      inputMode="numeric"
                                    />
                                  )}
                                </form.AppField>
                              )}
                            </div>
                          )
                        }
                      </form.Subscribe>
                    )}
                    {errosItem[item.id]?.map((mensagem) => (
                      <p
                        key={mensagem}
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {mensagem}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              {errosGrupo[grupo.chave] && (
                <p
                  id={`erro-${grupo.id}`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errosGrupo[grupo.chave]}
                </p>
              )}
            </fieldset>
          ))}
        </section>
      ))}
      {validar.isError &&
        !(
          validar.error instanceof HttpError &&
          validar.error.code === 'ENTRADA_INVALIDA'
        ) && (
          <p role="alert" className="text-sm text-destructive">
            {validar.error.message}
          </p>
        )}
      {resultado && (
        <p role="status" className="text-sm">
          {resultado}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(pending) => (
            <Button type="submit" disabled={pending}>
              {pending ? 'Validando…' : 'Validar respostas'}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setErrosItem({});
            setErrosGrupo({});
            setResultado('');
          }}
        >
          Limpar
        </Button>
      </div>
    </form>
  );
}

/** Pré-visualização do formulário canônico: renderiza o catálogo ativo e valida no servidor, sem gravar. */
export function FormularioInventarioPage() {
  const acesso = useAcessoAtual();
  const segmentos = useSegmentos(acesso);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const segmentoId =
    escolhido ??
    segmentos.data?.find((s) => s.chave === 'hospedagem')?.id ??
    segmentos.data?.[0]?.id;
  const formulario = useQuery({
    queryKey: [
      'catalogo-formulario',
      acesso.usuarioId,
      acesso.revisao,
      segmentoId,
    ],
    queryFn: ({ signal }) => catalogoService.formulario(segmentoId!, signal),
    enabled: segmentoId !== undefined,
    retry: false,
  });
  return (
    <section className="space-y-6" aria-label="Formulário de inventário">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Formulário de inventário</h1>
        <p className="text-sm text-muted-foreground">
          Pré-visualização do formulário canônico. Itens sem resposta permanecem
          “não informado”; nada é gravado aqui. O inventário com vigência e
          histórico é a parte 06.
        </p>
      </header>
      {segmentos.data && segmentos.data.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="segmento-formulario" className="text-sm font-medium">
            Segmento
          </label>
          <select
            id="segmento-formulario"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={segmentoId}
            onChange={(e) => setEscolhido(Number(e.target.value))}
          >
            {segmentos.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {segmentos.isPending || formulario.isPending ? (
        segmentoId === undefined && segmentos.isSuccess ? (
          <p>Nenhum segmento cadastrado.</p>
        ) : (
          <p role="status">Carregando formulário…</p>
        )
      ) : segmentos.isError || formulario.isError ? (
        <p role="alert">{(segmentos.error ?? formulario.error)?.message}</p>
      ) : !formulario.data.grupos.length ? (
        <p>
          Este segmento ainda não tem catálogo. Execute a carga inicial (pnpm
          db:catalogos) ou cadastre grupos em Catálogos.
        </p>
      ) : (
        <Formulario
          key={`${segmentoId}:${formulario.dataUpdatedAt}`}
          formulario={formulario.data}
          segmentoId={segmentoId!}
        />
      )}
    </section>
  );
}
