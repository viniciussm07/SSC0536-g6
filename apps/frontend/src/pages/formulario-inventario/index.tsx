import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type FormularioCatalogo,
  type RespostaItemInventario,
} from '@ssc0536/common';
import { SecoesCatalogo } from '@/components/secoes-catalogo';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useAppForm } from '@/hooks/use-app-form';
import { useSegmentos } from '@/hooks/use-segmentos';
import { catalogoService } from '@/services/catalogo';
import { errosDeCampo } from '@/services/cadastro';
import { HttpError } from '@/services/http';
import {
  distribuirErros,
  montarRespostas,
  valoresIniciaisCatalogo,
} from '@/utils/catalogo';

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
    defaultValues: valoresIniciaisCatalogo(formulario) as Record<
      string,
      string
    >,
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
        const distribuidos = distribuirErros(
          errosDeCampo(erro.details),
          respostas,
        );
        setErrosItem(distribuidos.porItem);
        setErrosGrupo(distribuidos.porGrupo);
      }
    },
  });

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <SecoesCatalogo
        form={form}
        formulario={formulario}
        errosItem={errosItem}
        errosGrupo={errosGrupo}
      />
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
        <h1 className="font-heading text-[22px] font-extrabold sm:text-[26px]">
          Formulário de inventário
        </h1>
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
