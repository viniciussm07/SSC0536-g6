import type { Prisma } from '../generated/prisma/client';

/**
 * Carga inicial dos catálogos de hospedagem — dicionário técnico versão 1.
 *
 * Origem: cabeçalhos (linhas 2, 4 e 5, colunas AZ:HC) da aba `MEIOS DE HOSPEDAGEM ` do
 * inventário oficial, conforme `docs/contratos/dicionario-inventario.md`. NÃO é homologada
 * pelo OTO: rótulos seguem a planilha (inclusive grafias a revisar, como "Anfiteratro" e
 * "Obtáculos"), legendas e obrigatoriedade seguem pendentes. As colunas AX (Reservas) e AY
 * (Formas de pagamento) não entram: o cabeçalho não traz opções e não se inventam opções.
 */
type Db = Prisma.TransactionClient;

interface GrupoCarga {
  slug: string;
  pergunta: string;
  secao: string;
  selecao: 'unica' | 'multipla';
  itens: string[];
}
const SERVICOS = 'Serviços e equipamentos';
const ACESSIBILIDADE = 'Acessibilidade';
const g = (
  slug: string,
  pergunta: string,
  secao: string,
  itens: string[],
  selecao: GrupoCarga['selecao'] = 'multipla',
): GrupoCarga => ({ slug, pergunta, secao, selecao, itens });

export const SEGMENTO_HOSPEDAGEM = {
  chave: 'hospedagem',
  nome: 'Meios de hospedagem',
  nivelCadastro: 'completo',
} as const;
export const MOTIVO_CARGA_V1 =
  'Carga inicial: dicionário técnico v1 do inventário (não homologado)';

export const GRUPOS_HOSPEDAGEM_V1: readonly GrupoCarga[] = [
  g('geral', 'Geral', SERVICOS, [
    'Estacionamento',
    'Manobrista',
    'Mensageiro',
    'Área para fumantes',
    'Pet',
  ]),
  g('lingua-estrangeira', 'Atendimento em língua estrangeira', SERVICOS, [
    'Inglês',
    'Espanhol',
    'Outra',
  ]),
  g('uh', 'UH', SERVICOS, [
    'Internet sem fio',
    'Ar Condicionado',
    'Ventilador/Climatizador',
    'Frigobar',
    'TV',
    'Outros',
  ]),
  g('recepcao', 'Recepção', SERVICOS, [
    'Não',
    'Internet Sem Fio',
    'Ar condicionado',
    'Climatizador Ventilador',
    'Área de estar',
    'Sanitário',
    'Sanitário PCD',
    'Outros',
  ]),
  g('ab', 'A&B', SERVICOS, [
    'Não',
    'Café da Manhã',
    'Meia Pensão',
    'Pensão Completa',
    'All-Inclusive',
    'Room Service',
    'Restaurante',
    'Lanchonete',
    'Bar',
    'Bar Molhado',
    'Copa do bebê',
    'Área pra refeições/copa',
    'Sanitário exclusivo para área de A&B',
    'Sanitário PCD exclusivo para área de A&B',
    'Aberto ao público',
    'Alimentação diferenciada (diabeticos, celiacos, veganos, etc)',
    'Outros',
  ]),
  g('eventos', 'Área de eventos', SERVICOS, [
    'Não',
    'Ar condicionado',
    'Climatizador Ventilador',
    'Sanitário exclusivo área de eventos',
    'Sanitário PCD exclusivo área de eventos',
    'Mobiliários',
    'Eq. Audiovisuais',
    'Outros',
  ]),
  g('recreacao', 'Área de recreação', SERVICOS, [
    'Não',
    'Piscina',
    'Piscina infantil',
    'Sauna',
    'SPA / ofuro',
    'Área Verde',
    'Área Descanso / leitura',
    'Academia',
    'Quadra Poliesportiva',
    'Salão de Jogos',
    'Área de lazer para crianças',
    'Equipe de recreação para crianças',
    'Anfiteratro/Cinema',
    'Mini Golf / Golf',
    'Mini Campo / Campo de futebol',
    'Sanitário exclusivo área de lazer',
    'Sanitário PCD exclusivo área de lazer',
    'Outros',
  ]),
  g(
    'pcd-facilidade',
    'Possui alguma facilidade para pessoas com deficiência ou mobilidade reduzida?',
    ACESSIBILIDADE,
    ['Não', 'Sim (responda às questões seguintes)'],
    'unica',
  ),
  g(
    'pcd-pessoal',
    'Pessoal capacitado para receber pessoas com deficiência',
    ACESSIBILIDADE,
    ['Não', 'Física', 'Auditiva', 'Visual', 'Intelectual', 'Múltipla'],
  ),
  g('pcd-rota-externa', 'Rota externa acessível', ACESSIBILIDADE, [
    'Não',
    'Calçada rebaixada',
    'Faixa de pedestre',
    'Rampa',
    'Semáforo Sonoro',
    'Piso tátil de alerta',
    'Piso regular e antiderrapante',
    'Livre de obstáculos',
    'Acesso em nível',
  ]),
  g('pcd-embarque', 'Local de embarque e desembarque', ACESSIBILIDADE, [
    'Não',
    'Sinalizado',
    'Com acesso em nível',
    'Sem Obtáculos',
    'Outras',
  ]),
  g('pcd-vaga', 'Vaga em estacionamento', ACESSIBILIDADE, [
    'Não',
    'Sinalizada',
    'Com acesso em nível',
    'Alargada para cadeira de rodas',
    'Rampa de acesso à calçada',
    'Outras',
  ]),
  g(
    'pcd-circulacao',
    'Área de circulação/acesso interno para cadeiras de rodas',
    ACESSIBILIDADE,
    [
      'Não',
      'Plataforma elevatória',
      'Com circulação entre mobiliário',
      'Porta larga',
      'Outras',
    ],
  ),
  g('pcd-escada', 'Escada', ACESSIBILIDADE, [
    'Não',
    'Corrimão',
    'Patamar para descanso',
    'Sinalização/Piso tátil de alerta',
    'Sinalização visual',
    'Piso antiderrapante',
    'Outros',
  ]),
  g('pcd-rampa', 'Rampa', ACESSIBILIDADE, [
    'Não',
    'Corrimão',
    'Patamar para descanso',
    'Piso antiderrapante',
    'Sinalização / piso tátil',
    'Inclinação adequada',
  ]),
  g('pcd-piso', 'Piso', ACESSIBILIDADE, [
    'Não',
    'Tátil',
    'Regular, sem obstáculos (tapete ou desnível)',
    'Antiderrapante/deslizante',
  ]),
  g('pcd-elevador', 'Elevador', ACESSIBILIDADE, [
    'Não',
    'Sinalizado em Braille',
    'Dispositivo sonoro',
    'Dispositivo luminoso',
    'Sensor eletrônico (porta)',
    'Sinalização visual',
    'Outros',
  ]),
  g(
    'pcd-equipamento-motorizado',
    'Equipamento motorizado para deslocamento interno',
    ACESSIBILIDADE,
    ['Não', 'Sim'],
    'unica',
  ),
  g('pcd-sinalizacao-visual', 'Sinalização visual', ACESSIBILIDADE, [
    'Não',
    'Entrada / Saída',
    'Recepção',
    'Sanitário',
    'Eventos',
    'Restaurante',
    'Área de lazer',
    'Área de resgate',
  ]),
  g(
    'pcd-alarme',
    'Alarme de emergência',
    ACESSIBILIDADE,
    ['Não', 'Sim'],
    'unica',
  ),
  g('pcd-comunicacao', 'Comunicação', ACESSIBILIDADE, [
    'Não',
    'Texto informativo em Braille',
    'Texto informativo em fonte ampliada',
    'Intérprete em Libras (língua brasileira de sinais)',
  ]),
  g('pcd-balcao', 'Balcão de atendimento', ACESSIBILIDADE, [
    'Não',
    'Rebaixado',
    'Preferencial para pessoas com deficiência ou mobilidade reduzida',
  ]),
  g('pcd-mobiliario', 'Mobiliário', ACESSIBILIDADE, [
    'Não',
    'Altura adequada',
    'Recuo adequado',
  ]),
  g('pcd-sanitario', 'Sanitário', ACESSIBILIDADE, [
    'Não',
    'Barra de apoio',
    'Porta larga suficiente para entrada de cadeira de rodas',
    'Acesso e giro para cadeira de rodas',
    'Pia rebaixada',
    'Espelho rebaixado ou com ângulo de alcance visual',
    'Box ou banheira adaptada',
    'Torneira monocomando/alavanca',
    'Piso regular, sem obstáculos',
    'Piso tátil',
    'Outros',
  ]),
  g('pcd-telefone', 'Telefone', ACESSIBILIDADE, [
    'Não',
    'Altura adequada',
    'Para surdos (TPS ou TTS)',
  ]),
  g(
    'pcd-atendimento-preferencial',
    'Sinalização indicativa de atendimento preferencial para PCD',
    ACESSIBILIDADE,
    ['Sim', 'Não'],
    'unica',
  ),
];

const slug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const ehOutro = (rotulo: string) => /^outr(?:o|a)s?$/i.test(rotulo);
const ehNao = (rotulo: string) => rotulo === 'Não';

/** Chaves de grupos e itens que a carga cria (úteis para conferir unicidade). */
export function chavesCargaHospedagem() {
  return GRUPOS_HOSPEDAGEM_V1.flatMap((grupo) => {
    const chaveGrupo = `hospedagem.${grupo.slug}`;
    return [
      chaveGrupo,
      ...grupo.itens.map((rotulo) => `${chaveGrupo}.${slug(rotulo)}`),
    ];
  });
}

/**
 * Carga idempotente e não destrutiva: cria o que falta (segmento, grupos, itens e a versão 1 de
 * cada item) e nunca altera o que já existe, inclusive edições feitas pela gestão do catálogo.
 */
export async function carregarCatalogoHospedagem(db: Db) {
  const segmento =
    (await db.segmento.findUnique({
      where: { chave: SEGMENTO_HOSPEDAGEM.chave },
    })) ?? (await db.segmento.create({ data: { ...SEGMENTO_HOSPEDAGEM } }));
  const resumo = { gruposCriados: 0, itensCriados: 0, jaExistentes: 0 };
  for (const [ig, definicao] of GRUPOS_HOSPEDAGEM_V1.entries()) {
    const chaveGrupo = `hospedagem.${definicao.slug}`;
    let grupo = await db.catalogoGrupo.findUnique({
      where: { chave: chaveGrupo },
    });
    if (grupo) resumo.jaExistentes++;
    else {
      grupo = await db.catalogoGrupo.create({
        data: {
          segmentoId: segmento.id,
          chave: chaveGrupo,
          pergunta: definicao.pergunta,
          selecao: definicao.selecao,
          permiteOutro: definicao.itens.some(ehOutro),
          secao: definicao.secao,
          ordem: (ig + 1) * 10,
        },
      });
      resumo.gruposCriados++;
    }
    for (const [ii, rotulo] of definicao.itens.entries()) {
      const chave = `${chaveGrupo}.${slug(rotulo)}`;
      if (await db.catalogoItem.findUnique({ where: { chave } })) {
        resumo.jaExistentes++;
        continue;
      }
      const item = await db.catalogoItem.create({
        data: {
          grupoId: grupo.id,
          chave,
          rotulo,
          exclusivo: ehNao(rotulo),
          outro: ehOutro(rotulo),
          aceitaQuantidade: false,
          ordem: (ii + 1) * 10,
        },
      });
      await db.catalogoItemVersao.create({
        data: {
          itemId: item.id,
          numero: 1,
          rotulo: item.rotulo,
          pergunta: grupo.pergunta,
          selecao: grupo.selecao,
          exclusivo: item.exclusivo,
          outro: item.outro,
          aceitaQuantidade: item.aceitaQuantidade,
          criadaEm: new Date(),
          motivo: MOTIVO_CARGA_V1,
        },
      });
      resumo.itensCriados++;
    }
  }
  return resumo;
}
