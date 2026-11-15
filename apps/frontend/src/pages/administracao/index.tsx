import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { useMemo, useState } from 'react';
import {
  ESQUEMA_CONTAS,
  type AlterarConta,
  type ContaResumo,
  type CriarConta,
} from '@ssc0536/common';
import { KeyRound, Plus } from 'lucide-react';
import { Abas } from '@/components/abas';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { acessoService } from '@/services/acesso';
import { permite } from '@/utils/acesso';
import { colunasContas } from './colunas';
import { ContaForm } from './components/conta-form';
import { PoliticasPerfil } from './components/politicas';
import { VinculosConta } from './components/vinculos';
import { useAdministracao } from './hooks';

export function AdministracaoPage() {
  const acesso = useAcessoAtual();
  const [aba, setAba] = useState('contas');
  const [novaAberta, setNovaAberta] = useState(false);
  const [selecionada, setSelecionada] = useState<ContaResumo | null>(null);
  const { criar, alterar, recuperar } = useAdministracao();
  const colunas = useMemo(
    () =>
      colunasContas({
        usuarioId: acesso.usuarioId,
        onGerenciar: (conta) => {
          setSelecionada(conta);
          alterar.reset();
          recuperar.reset();
          criar.reset();
        },
      }),
    // `reset` das mutations é estável; só a identidade do usuário muda as colunas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acesso.usuarioId],
  );
  const codigo = criar.data ?? recuperar.data;
  const erro = criar.error ?? alterar.error ?? recuperar.error;
  const abas = [
    { id: 'contas', rotulo: 'Contas' },
    ...(permite(acesso, 'permissoes', 'consultar') &&
    permite(acesso, 'visibilidade', 'consultar')
      ? [{ id: 'politicas', rotulo: 'Permissões e visibilidade' }]
      : []),
  ];
  return (
    <section className="space-y-6" aria-label="Administração de acesso">
      <CabecalhoPagina
        titulo="Administração de acesso"
        descricao="Gerencie contas, vínculos com empreendimentos e o que cada perfil pode ver e fazer."
      />
      <Abas
        rotulo="Seções da administração"
        abas={abas}
        ativa={abas.some((a) => a.id === aba) ? aba : 'contas'}
        onChange={setAba}
      >
        {(ativa) =>
          ativa === 'contas' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Filtre pelo ícone de cada coluna. Você não pode gerenciar a
                  própria conta.
                </p>
                {permite(acesso, 'contas', 'criar') && (
                  <Button
                    onClick={() => {
                      criar.reset();
                      setNovaAberta(true);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    Nova conta
                  </Button>
                )}
              </div>
              {codigo && (
                <section
                  className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-4"
                  aria-label="Código de ativação"
                >
                  <p className="flex items-center gap-2 font-medium">
                    <KeyRound className="size-4" aria-hidden="true" />
                    Código de ativação gerado
                  </p>
                  <p className="text-sm">
                    Entregue este código ao titular por canal separado. Expira
                    em uma hora e não será exibido novamente.
                  </p>
                  <p className="break-all rounded-md bg-background p-2 font-mono text-sm">
                    {codigo.token}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      criar.reset();
                      recuperar.reset();
                    }}
                  >
                    Ocultar código
                  </Button>
                </section>
              )}
              {erro && !novaAberta && !selecionada && (
                <p role="alert" className="text-sm text-destructive">
                  {erro.message}
                </p>
              )}
              <GradeColecao
                id="contas"
                rotulo="Contas"
                esquema={ESQUEMA_CONTAS}
                colunas={colunas}
                getRowId={(c) => String(c.id)}
                chave={['contas', acesso.usuarioId, acesso.revisao]}
                buscar={(consulta, signal) =>
                  acessoService.contas(consulta, signal)
                }
                colunasADireita={['acoes']}
                mensagemVazia="Nenhuma conta encontrada."
              />
            </>
          ) : (
            <PoliticasPerfil acesso={acesso} />
          )
        }
      </Abas>

      <Dialog open={novaAberta} onOpenChange={setNovaAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta individual</DialogTitle>
            <DialogDescription>
              A pessoa ativa a conta com um código de uso único gerado após o
              cadastro.
            </DialogDescription>
          </DialogHeader>
          <ContaForm
            onSubmit={async (body) => {
              await criar.mutateAsync(body as CriarConta);
              setNovaAberta(false);
            }}
          />
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro.message}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selecionada !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setSelecionada(null);
            recuperar.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {selecionada && (
            <>
              <DialogHeader>
                <DialogTitle>Gerenciar {selecionada.nome}</DialogTitle>
                <DialogDescription>{selecionada.email}</DialogDescription>
              </DialogHeader>
              <div
                aria-label="Conta selecionada"
                role="group"
                className="space-y-6"
              >
                {permite(acesso, 'contas', 'alterar') && (
                  <section className="space-y-3" aria-label="Dados da conta">
                    <h3 className="font-semibold">Perfil e situação</h3>
                    <ContaForm
                      key={`${selecionada.id}:${selecionada.perfil}:${selecionada.ativo}`}
                      conta={selecionada}
                      onSubmit={async (body) => {
                        const nova = await alterar.mutateAsync({
                          id: selecionada.id,
                          body: body as AlterarConta,
                        });
                        setSelecionada(nova);
                      }}
                    />
                    <Button
                      variant="outline"
                      disabled={!selecionada.ativo || recuperar.isPending}
                      onClick={() => {
                        criar.reset();
                        recuperar.mutate(selecionada.id);
                      }}
                    >
                      <KeyRound aria-hidden="true" />
                      Gerar novo código para {selecionada.nome}
                    </Button>
                  </section>
                )}
                {permite(acesso, 'vinculos', 'consultar') && (
                  <VinculosConta
                    key={selecionada.id}
                    acesso={acesso}
                    usuarioId={selecionada.id}
                  />
                )}
                {erro && (
                  <p role="alert" className="text-sm text-destructive">
                    {erro.message}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
