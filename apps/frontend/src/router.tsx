import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import {
  ESQUEMA_CADASTUR,
  ESQUEMA_CONTAS,
  ESQUEMA_CONTATOS,
  ESQUEMA_EMPREENDIMENTOS,
  ESQUEMA_INDICADORES,
  ESQUEMA_INVENTARIOS,
  ESQUEMA_PERMISSOES,
  ESQUEMA_RESPOSTAS,
  ESQUEMA_VINCULOS_CONTA,
  ESQUEMA_VISIBILIDADES,
} from '@ssc0536/common';
import { RotaProtegida } from '@/components/rota-protegida';
import { AcessoPage } from '@/pages/acesso';
import { AdministracaoPage } from '@/pages/administracao';
import { AreaAutenticadaPage } from '@/pages/area-autenticada';
import { EditarEmpreendimentoPage } from '@/pages/empreendimento-editar';
import { NovoEmpreendimentoPage } from '@/pages/empreendimento-novo';
import { EmpreendimentosPage } from '@/pages/empreendimentos';
import { IndicadoresPage } from '@/pages/indicadores';
import { InicioPage } from '@/pages/inicio';
import { NaoEncontradaPage } from '@/pages/nao-encontrada';
import { validarBuscaDaGrade, validarBuscaDasGrades } from '@/utils/grade';

// Rotas por código: cada caminho reaproveita as páginas de `pages/`.
// As permissões exibidas aqui orientam a interface; o servidor continua decidindo.
const raiz = createRootRoute({
  component: Outlet,
  notFoundComponent: NaoEncontradaPage,
});
const entrar = createRoute({
  getParentRoute: () => raiz,
  path: '/entrar',
  component: AcessoPage,
});
const area = createRoute({
  getParentRoute: () => raiz,
  id: 'area-autenticada',
  component: AreaAutenticadaPage,
});
const inicio = createRoute({
  getParentRoute: () => area,
  path: '/',
  validateSearch: (busca) =>
    validarBuscaDasGrades(busca, [
      { id: 'contatos', esquema: ESQUEMA_CONTATOS },
      { id: 'cadastur', esquema: ESQUEMA_CADASTUR },
      { id: 'inventarios', esquema: ESQUEMA_INVENTARIOS },
      { id: 'respostas', esquema: ESQUEMA_RESPOSTAS },
    ]),
  component: InicioPage,
});
const empreendimentos = createRoute({
  getParentRoute: () => area,
  path: '/empreendimentos',
  validateSearch: (busca) =>
    validarBuscaDaGrade(busca, 'empreendimentos', ESQUEMA_EMPREENDIMENTOS),
  component: () => (
    <RotaProtegida recurso="empreendimentos" visaoGeral>
      <EmpreendimentosPage />
    </RotaProtegida>
  ),
});
const novoEmpreendimento = createRoute({
  getParentRoute: () => area,
  path: '/empreendimentos/novo',
  component: () => (
    <RotaProtegida recurso="empreendimentos" acao="criar" visaoGeral>
      <NovoEmpreendimentoPage />
    </RotaProtegida>
  ),
});
const editarEmpreendimento = createRoute({
  getParentRoute: () => area,
  path: '/editar',
  component: () => (
    <RotaProtegida recurso="empreendimentos" acao="alterar" exigeEntidade>
      <EditarEmpreendimentoPage />
    </RotaProtegida>
  ),
});
const indicadores = createRoute({
  getParentRoute: () => area,
  path: '/indicadores',
  validateSearch: (busca) =>
    validarBuscaDaGrade(busca, 'indicadores', ESQUEMA_INDICADORES),
  component: () => (
    <RotaProtegida recurso="indicadores" visaoGeral>
      <IndicadoresPage />
    </RotaProtegida>
  ),
});
const administracao = createRoute({
  getParentRoute: () => area,
  path: '/administracao',
  validateSearch: (busca) =>
    validarBuscaDasGrades(busca, [
      { id: 'contas', esquema: ESQUEMA_CONTAS },
      { id: 'vinculos', esquema: ESQUEMA_VINCULOS_CONTA },
      { id: 'permissoes', esquema: ESQUEMA_PERMISSOES },
      { id: 'visibilidades', esquema: ESQUEMA_VISIBILIDADES },
    ]),
  component: () => (
    <RotaProtegida recurso="contas" visaoGeral>
      <AdministracaoPage />
    </RotaProtegida>
  ),
});

const arvore = raiz.addChildren([
  entrar,
  area.addChildren([
    inicio,
    empreendimentos,
    novoEmpreendimento,
    editarEmpreendimento,
    indicadores,
    administracao,
  ]),
]);

export function criarRouter(history?: RouterHistory) {
  return createRouter({ routeTree: arvore, history });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof criarRouter>;
  }
}
