import { useState } from 'react';
import {
  montarFiltro,
  operadoresDoCampo,
  type CampoOData,
  type CondicaoColuna,
  type EsquemaOData,
  type OperadorColuna,
} from '@ssc0536/common';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppForm } from '@/hooks/use-app-form';
import { ROTULOS_OPERADOR } from './rotulos';

const entradaDoCampo = (campo: CampoOData) => {
  if (campo.tipo === 'inteiro') return { type: 'number', step: '1' } as const;
  if (campo.tipo === 'decimal') return { type: 'number', step: 'any' } as const;
  if (campo.tipo === 'data') return { type: 'date' } as const;
  return { type: 'text' } as const;
};

function condicaoDoFormulario(
  campo: CampoOData,
  valores: {
    operador: string;
    valor: string;
    valor2: string;
    valores: string[];
  },
): CondicaoColuna {
  return {
    campo: campo.nome,
    operador: valores.operador as OperadorColuna,
    valor: valores.valor,
    valor2: valores.valor2,
    valores: valores.valores,
  };
}

export function FiltroColuna({
  campo,
  rotulo,
  esquema,
  atual,
  rotulosValores,
  onAplicar,
}: {
  campo: CampoOData;
  rotulo: string;
  esquema: EsquemaOData;
  atual?: CondicaoColuna;
  rotulosValores?: Readonly<Record<string, string>>;
  onAplicar: (condicao: CondicaoColuna) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const operadores = operadoresDoCampo(campo);
  const form = useAppForm({
    defaultValues: {
      operador: atual?.operador ?? operadores[0] ?? 'igual',
      valor: atual?.valor ?? '',
      valor2: atual?.valor2 ?? '',
      valores: atual?.valores ?? [],
    },
    validators: {
      onSubmit: ({ value }) => {
        const resultado = montarFiltro(
          [condicaoDoFormulario(campo, value)],
          esquema,
        );
        return resultado.valido
          ? undefined
          : resultado.erros.map((item) => item.message).join(' ');
      },
    },
    onSubmit: ({ value }) => {
      const condicao = condicaoDoFormulario(campo, value);
      const resultado = montarFiltro([condicao], esquema);
      if (!resultado.valido) return;
      onAplicar(condicao);
      setAberto(false);
    },
  });
  const opcoesEnum = (campo.valores ?? []).map((valor) => ({
    value: valor,
    label: rotulosValores?.[valor] ?? valor.replaceAll('_', ' '),
  }));

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={atual ? 'secondary' : 'ghost'}
          size="icon-xs"
          aria-label={`Filtrar ${rotulo}`}
        >
          <Filter aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader className="mb-4">
          <PopoverTitle>Filtrar {rotulo}</PopoverTitle>
          <PopoverDescription>
            O filtro será aplicado a toda a coleção.
          </PopoverDescription>
        </PopoverHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.AppField name="operador">
            {(f) => (
              <f.Select
                label="Operador"
                options={operadores.map((operador) => ({
                  value: operador,
                  label: ROTULOS_OPERADOR[operador],
                }))}
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.operador}>
            {(operador) => {
              if (operador === 'nulo' || operador === 'naoNulo') return null;
              if (operador === 'em' && campo.tipo === 'enum')
                return (
                  <form.AppField name="valores">
                    {(f) => (
                      <f.Checkboxes label="Valores" options={opcoesEnum} />
                    )}
                  </form.AppField>
                );
              const opcoes =
                campo.tipo === 'enum'
                  ? [{ value: '', label: 'Selecione' }, ...opcoesEnum]
                  : campo.tipo === 'booleano'
                    ? [
                        { value: '', label: 'Selecione' },
                        { value: 'true', label: 'Sim' },
                        { value: 'false', label: 'Não' },
                      ]
                    : null;
              return (
                <div className="space-y-4">
                  <form.AppField name="valor">
                    {(f) =>
                      opcoes ? (
                        <f.Select label="Valor" options={opcoes} />
                      ) : (
                        <f.Input
                          label={
                            operador === 'entre' ? 'Valor inicial' : 'Valor'
                          }
                          {...entradaDoCampo(campo)}
                          placeholder={
                            campo.tipo === 'datahora'
                              ? 'AAAA-MM-DDTHH:mm:ssZ'
                              : undefined
                          }
                        />
                      )
                    }
                  </form.AppField>
                  {operador === 'entre' && (
                    <form.AppField name="valor2">
                      {(f) => (
                        <f.Input
                          label="Valor final"
                          {...entradaDoCampo(campo)}
                        />
                      )}
                    </form.AppField>
                  )}
                </div>
              );
            }}
          </form.Subscribe>
          <form.Subscribe selector={(state) => state.errors}>
            {(erros) =>
              erros.length > 0 && (
                <p role="alert" className="text-sm text-destructive">
                  {erros.filter((erro) => typeof erro === 'string').join(' ')}
                </p>
              )
            }
          </form.Subscribe>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Aplicar</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
