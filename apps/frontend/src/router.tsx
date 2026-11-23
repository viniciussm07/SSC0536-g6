import { ProtecaoAlteracoesProvider } from '@/components/protecao-alteracoes';
import { AuditoriaPage } from '@/pages/auditoria';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import {
  ESQUEMA_CADASTUR,
  ESQUEMA_AUDITORIAS,
  ESQUEMA_CATALOGO_GRUPOS,
  ESQUEMA_CATALOGO_ITENS,
  ESQUEMA_CATALOGO_VERSOES,
  ESQUEMA_CONTAS,
  ESQUEMA_CONTATOS,
  ESQUEMA_EMPREENDIMENTOS,
  ESQUEMA_INDICADORES,
  ESQUEMA_INVENTARIOS,
  ESQUEMA_MODELOS_PESQUISA,
  ESQUEMA_PERIODOS,
  ESQUEMA_LOTES_IMPORTACAO,
  ESQUEMA_PESQUISAS,
  ESQUEMA_DESTINATARIOS,
  ESQUEMA_PERMISSOES,
  ESQUEMA_RESPOSTAS,
  ESQUEMA_PESQUISAS_RESPONDENTE,
  ESQUEMA_VERSOES_MODELO,
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
import { ModelosPesquisaPage } from '@/pages/modelos-pesquisa';
import { NaoEncontradaPage } from '@/pages/nao-encontrada';
import { PeriodosPage } from '@/pages/periodos';
import { ImportacoesPage } from '@/pages/importacoes';
import { PesquisasPage } from '@/pages/pesquisas';
import { ResponderPesquisaPage } from '@/pages/responder-pesquisa';
import { validarBuscaDaGrade, validarBuscaDasGrades } from '@/utils/grade';

// Rotas por código: cada caminho reaproveita as páginas de `pages/`.
// As permissões exibidas aqui orientam a interface; o servidor continua decidindo.
const raiz = createRootRoute({
  component: () => (
    <ProtecaoAlteracoesProvider>
      <Outlet />
    </ProtecaoAlteracoesProvider>
  ),
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
      { id: 'pesquisas', esquema: ESQUEMA_PESQUISAS_RESPONDENTE },
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

const auditoria = createRoute({
  getParentRoute: () => area,
  path: '/auditoria',
  validateSearch: (busca) =>
    validarBuscaDaGrade(busca, 'auditorias', ESQUEMA_AUDITORIAS),
  component: () => (
    <RotaProtegida recurso="auditoria" visaoGeral>
      <AuditoriaPage />
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
const periodos = createRoute({
  getParentRoute: () => area,
  path: '/periodos',
  validateSearch: (busca) =>
    validarBuscaDaGrade(busca, 'periodos', ESQUEMA_PERIODOS),
  component: () => (
    <RotaProtegida recurso="pesquisas" visaoGeral>
      <PeriodosPage />
    </RotaProtegida>
  ),
});

const importacoes = createRoute({
  getParentRoute: () => area,
  path: '/importacoes',
  validateSearch: (busca) =>
    validarBuscaDaGrade(busca, 'importacoes', ESQUEMA_LOTES_IMPORTACAO),
  component: () => (
    <RotaProtegida recurso="importacoes" visaoGeral>
      <ImportacoesPage />
    </RotaProtegida>
  ),
});

const modelosPesquisa = createRoute({
  getParentRoute: () => area,
  path: '/modelos-pesquisa',
  validateSearch: (busca) =>
    validarBuscaDasGrades(busca, [
      { id: 'modelos', esquema: ESQUEMA_MODELOS_PESQUISA },
      { id: 'versoes', esquema: ESQUEMA_VERSOES_MODELO },
    ]),
  component: () => (
    <RotaProtegida recurso="pesquisas" visaoGeral>
      <ModelosPesquisaPage />
    </RotaProtegida>
  ),
});

const pesquisas = createRoute({
  getParentRoute: () => area,
  path: '/pesquisas',
  validateSearch: (busca) =>
    validarBuscaDasGrades(busca, [
      { id: 'pesquisas', esquema: ESQUEMA_PESQUISAS },
      { id: 'destinatarios', esquema: ESQUEMA_DESTINATARIOS },
    ]),
  component: () => (
    <RotaProtegida recurso="pesquisas" visaoGeral>
      <PesquisasPage />
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

const responderPesquisa = createRoute({
  getParentRoute: () => area,
  path: '/responder/$pesquisaId',
  component: () => (
    <RotaProtegida recurso="respostas" exigeEntidade>
      <ResponderPesquisaPage />
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
    periodos,
    importacoes,
    modelosPesquisa,
    pesquisas,
    auditoria,
    formularioInventario,
    inventarioNovaVersao,
    responderPesquisa,
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
