import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import { RotaProtegida } from '@/components/rota-protegida';
import { AcessoPage } from '@/pages/acesso';
import { AdministracaoPage } from '@/pages/administracao';
import { AreaAutenticadaPage } from '@/pages/area-autenticada';
import { IndicadoresPage } from '@/pages/indicadores';
import { InicioPage } from '@/pages/inicio';
import { NaoEncontradaPage } from '@/pages/nao-encontrada';

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
  component: InicioPage,
});
const indicadores = createRoute({
  getParentRoute: () => area,
  path: '/indicadores',
  component: () => (
    <RotaProtegida recurso="indicadores" visaoGeral>
      <IndicadoresPage />
    </RotaProtegida>
  ),
});
const administracao = createRoute({
  getParentRoute: () => area,
  path: '/administracao',
  component: () => (
    <RotaProtegida recurso="contas" visaoGeral>
      <AdministracaoPage />
    </RotaProtegida>
  ),
});

const arvore = raiz.addChildren([
  entrar,
  area.addChildren([inicio, indicadores, administracao]),
]);

export function criarRouter(history?: RouterHistory) {
  return createRouter({ routeTree: arvore, history });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof criarRouter>;
  }
}
