// GET /api/shopping/demanda?periodo= (RF29): o que os clientes buscaram e o que não acharam em
// nenhuma loja, por categoria, sem identificar ninguém (RN12). A mesma base alimenta o
// cruzamento com as lojas vagas (vagas.ts). Números de 30 dias, escalados para 7 e 90 dias;
// as buscas da categoria da Loja de esportes batem com o Desempenho dela ("tênis de trilha").
import type { BuscaContada, Demanda, Periodo } from '../../tipos/shopping'
import { dadosInvalidos, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { exigirAdmin } from './auth'

export const ESCALA: Record<Periodo, number> = { '7d': 0.25, '30d': 1, '90d': 2.8 }

/** Buscas sem resultado em nenhuma loja, em 30 dias, por categoria e termo. */
const SEM_RESULTADO: Record<string, [string, number][]> = {
  eletronicos: [['fone bluetooth', 96], ['carregador turbo', 71], ['smartwatch', 58], ['caixa de som', 44]],
  infantil: [['roupa de bebê', 88], ['carrinho de bebê', 52], ['brinquedo educativo', 47]],
  calcados: [['tênis de trilha', 120], ['chuteira society', 39], ['bota de couro', 22]],
  alimentacao: [['comida árabe', 64], ['açaí', 58], ['poke', 33], ['comida vegana', 21]],
  pet: [['ração', 61], ['petshop', 49], ['coleira', 20]],
  esportes: [['bicicleta', 41], ['raquete de beach tennis', 34], ['halteres', 26]],
  casa: [['jogo de cama', 37], ['panela elétrica', 29], ['luminária', 18]],
  acessorios: [['luva de academia', 31], ['tornozeleira', 22], ['viseira', 15]],
  otica: [['lente de contato', 34], ['óculos de grau', 21]],
  livraria: [['livro infantil', 28], ['material escolar', 25]],
  roupas: [['legging feminina', 47]],
  perfumaria: [['perfume importado', 24], ['maquiagem profissional', 18]],
  joias: [['aliança de prata', 12], ['piercing', 7]],
}

/** As buscas mais feitas, com ou sem resultado, em 30 dias. */
const MAIS_BUSCADOS: [string, number][] = [
  ['tênis de corrida', 214],
  ['camiseta dry-fit', 156],
  ['perfume', 133],
  ['tênis de trilha', 120],
  ['hambúrguer', 118],
  ['fone bluetooth', 96],
  ['roupa de bebê', 88],
  ['garrafa térmica', 88],
]

/** Todas as buscas de 30 dias, com e sem resultado. */
const BUSCAS_EM_30_DIAS = 6840

const escalar = (valor: number, periodo: Periodo) => Math.max(1, Math.round(valor * ESCALA[periodo]))

/** As buscas sem resultado do período, por categoria, da que mais falta para a que menos falta. */
export function semResultadoPorCategoria(periodo: Periodo): Demanda['semResultadoPorCategoria'] {
  return Object.entries(SEM_RESULTADO)
    .map(([categoria, termos]) => {
      const contados: BuscaContada[] = termos.map(([termo, buscas]) => ({ termo, buscas: escalar(buscas, periodo) }))
      return { categoria, buscas: contados.reduce((soma, t) => soma + t.buscas, 0), termos: contados }
    })
    .sort((a, b) => b.buscas - a.buscas)
}

export function lerPeriodo(pedido: PedidoMock): Periodo | null {
  const periodo = pedido.busca.get('periodo') ?? '30d'
  return periodo in ESCALA ? (periodo as Periodo) : null
}

export function buscarDemanda(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const periodo = lerPeriodo(pedido)
  if (!periodo) return dadosInvalidos('Use periodo 7d, 30d ou 90d.')

  const porCategoria = semResultadoPorCategoria(periodo)
  const demanda: Demanda = {
    periodo,
    buscas: escalar(BUSCAS_EM_30_DIAS, periodo),
    semResultado: porCategoria.reduce((soma, c) => soma + c.buscas, 0),
    maisBuscados: MAIS_BUSCADOS.map(([termo, buscas]) => ({ termo, buscas: escalar(buscas, periodo) })),
    semResultadoPorCategoria: porCategoria,
  }
  return ok(demanda)
}
