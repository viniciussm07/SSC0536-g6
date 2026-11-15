import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import {
  ESQUEMA_CADASTUR,
  ESQUEMA_CATALOGO_GRUPOS,
  ESQUEMA_CATALOGO_ITENS,
  ESQUEMA_CATALOGO_VERSOES,
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
import { InventarioVersaoPage } from '@/pages/inventario-versao';
import { CatalogosPage } from '@/pages/catalogos';
import { FormularioInventarioPage } from '@/pages/formulario-inventario';
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

const catalogos = createRoute({
  getParentRoute: () => area,
  path: '/catalogos',
  validateSearch: (busca) =>
    validarBuscaDasGrades(busca, [
      { id: 'itens', esquema: ESQUEMA_CATALOGO_ITENS },
      { id: 'grupos', esquema: ESQUEMA_CATALOGO_GRUPOS },
      { id: 'versoes', esquema: ESQUEMA_CATALOGO_VERSOES },
    ]),
  component: () => (
    <RotaProtegida recurso="catalogos" visaoGeral>
      <CatalogosPage />
    </RotaProtegida>
  ),
});
const formularioInventario = createRoute({
  getParentRoute: () => area,
  path: '/formulario-inventario',
  component: () => (
    <RotaProtegida recurso="inventarios" visaoGeral>
      <FormularioInventarioPage />
    </RotaProtegida>
  ),
});

const inventarioNovaVersao = createRoute({
  getParentRoute: () => area,
  path: '/inventario/nova-versao',
  validateSearch: (busca: Record<string, unknown>) => {
    const corrigir = Number(busca.corrigir);
    return Number.isSafeInteger(corrigir) && corrigir > 0 ? { corrigir } : {};
  },
  component: () => (
    <RotaProtegida recurso="inventarios" acao="criar" exigeEntidade>
      <InventarioVersaoPage />
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
    catalogos,
    formularioInventario,
    inventarioNovaVersao,
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
