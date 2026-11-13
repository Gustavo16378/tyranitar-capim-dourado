// GET /api/loja/relatorios?periodo= (RF24). Números de 30 dias, escalados para 7 e 90 dias,
// coerentes com o catálogo e os cupons do mock. Os cupons usam o uso real do mock (de todo
// o período, para simplificar); as reservas em aberto são as ativas agora.
import type { Periodo, Relatorio } from '../../tipos/loja'
import { STATUS_ATIVOS } from '../../loja/comum/reserva'
import { exigirLojista } from './auth'
import { banco, usosDoCupom } from './dados'
import { dadosInvalidos, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'

const ESCALA: Record<Periodo, number> = { '7d': 0.25, '30d': 1, '90d': 2.8 }

// Base de 30 dias.
const VENDIDOS = [
  ['p3', 41],
  ['p4', 33],
  ['p2', 21],
  ['p1', 18],
  ['p5', 15],
] as const
const BUSCADOS = [
  ['tênis de corrida', 214],
  ['camiseta dry-fit', 156],
  ['tênis de trilha', 120],
  ['garrafa térmica', 88],
  ['meia de compressão', 64],
] as const
const NAO_ENCONTRADOS = [
  ['tênis de trilha', 120],
  ['legging feminina', 47],
  ['luva de academia', 31],
  ['tornozeleira', 22],
  ['viseira', 15],
] as const
const RESERVAS = { retiradas: 41, canceladas: 9, expiradas: 7 }

/** Movimento por dia e hora: sexta à noite e sábado à tarde enchem a loja. */
function picos(escala: number): Relatorio['picos'] {
  const lista: Relatorio['picos'] = []
  for (let dia = 0; dia < 7; dia++) {
    for (let hora = 10; hora <= 21; hora++) {
      const fimDeSemana = dia === 6 ? 2 : dia === 5 && hora >= 17 ? 1.6 : dia === 0 ? 1.2 : 1
      const pico = hora >= 17 && hora <= 20 ? 2 : hora >= 12 && hora <= 14 ? 1.4 : 1
      lista.push({ diaDaSemana: dia, hora, compras: Math.round(1.5 * fimDeSemana * pico * escala * 4) })
    }
  }
  return lista
}

export function buscarRelatorio(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const periodo = (pedido.busca.get('periodo') ?? '30d') as Periodo
  if (!(periodo in ESCALA)) return dadosInvalidos('Use periodo 7d, 30d ou 90d.')
  const escala = ESCALA[periodo]
  const n = (valor: number) => Math.max(1, Math.round(valor * escala))

  const reservas = {
    retiradas: n(RESERVAS.retiradas),
    emAberto: banco.reservas.filter((r) => STATUS_ATIVOS.includes(r.status)).length,
    canceladas: n(RESERVAS.canceladas),
    expiradas: n(RESERVAS.expiradas),
  }

  const relatorio: Relatorio = {
    periodo,
    maisVendidos: VENDIDOS.map(([id, quantidade]) => {
      const produto = banco.produtos.find((p) => p.id === id)
      return {
        produtoId: id,
        nome: produto?.nome ?? id,
        quantidade: n(quantidade),
        valorCentavos: n(quantidade) * (produto?.precoCentavos ?? 0),
      }
    }),
    maisBuscados: BUSCADOS.map(([termo, buscas]) => ({ termo, buscas: n(buscas) })),
    naoEncontrados: NAO_ENCONTRADOS.map(([termo, buscas]) => ({ termo, buscas: n(buscas) })),
    parados: [
      { produtoId: 'p9', nome: 'Jaqueta corta-vento', estoque: 3, diasSemVenda: 54 },
      { produtoId: 'p8', nome: 'Mochila de hidratação', estoque: 1, diasSemVenda: 38 },
      { produtoId: 'p7', nome: 'Garrafa térmica 1 L', estoque: 4, diasSemVenda: 31 },
    ],
    picos: picos(escala),
    cupons: banco.cupons
      .filter((c) => c.origem === 'LOJA')
      .map((c) => {
        const usos = usosDoCupom(c)
        return { cupomId: c.id, titulo: c.titulo, usos: usos.length, descontoCentavos: usos.reduce((s, u) => s + u.centavos, 0) }
      })
      .filter((c) => c.usos > 0),
    ticketMedio: { comFichaCentavos: 31240, semFichaCentavos: 18990 },
    // Calçados e roupas têm 3 lojas ou mais no shopping; acessórios não (RN13).
    comparativoCategoria: [
      { categoria: 'calcados', ticketMedioLojaCentavos: 34990, ticketMedioCategoriaCentavos: 29870 },
      { categoria: 'roupas', ticketMedioLojaCentavos: 11240, ticketMedioCategoriaCentavos: 12650 },
    ],
    reservas: {
      feitas: reservas.retiradas + reservas.emAberto + reservas.canceladas + reservas.expiradas,
      ...reservas,
    },
  }
  return ok(relatorio)
}
