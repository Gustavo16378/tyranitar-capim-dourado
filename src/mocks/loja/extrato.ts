// GET /api/loja/extrato?periodo=&pagina=&tamanho= (RF25): as compras da loja pela plataforma
// no período, os descontos de cada lado e os reembolsos dos vouchers do shopping (RN11).
import type { Extrato, LancamentoDoExtrato, Periodo } from '../../tipos/loja'
import { todosOsReembolsos } from '../comum/reembolsos'
import { dadosInvalidos, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { exigirLojista } from './auth'
import { banco, LOJA } from './dados'

const DIAS: Record<Periodo, number> = { '7d': 7, '30d': 30, '90d': 90 }

export function buscarExtrato(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const periodo = (pedido.busca.get('periodo') ?? '30d') as Periodo
  if (!(periodo in DIAS)) return dadosInvalidos('Use periodo 7d, 30d ou 90d.')
  const pagina = Number(pedido.busca.get('pagina') ?? 1)
  const tamanho = Number(pedido.busca.get('tamanho') ?? 20)
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(tamanho) || tamanho < 1 || tamanho > 100) {
    return dadosInvalidos('Use pagina a partir de 1 e tamanho de 1 a 100.')
  }

  const desde = new Date(Date.now() - DIAS[periodo] * 24 * 60 * 60 * 1000).toISOString()
  const reembolsos = todosOsReembolsos().filter((r) => r.lojaId === LOJA.id)
  const doPeriodo = banco.compras
    .filter((c) => c.criadoEm >= desde)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

  const soma = (campo: 'brutoCentavos' | 'descontoLojaCentavos' | 'descontoShoppingCentavos' | 'pagoCentavos') =>
    doPeriodo.reduce((total, c) => total + c[campo], 0)

  const lancamentos: LancamentoDoExtrato[] = doPeriodo.slice((pagina - 1) * tamanho, pagina * tamanho).map((c) => {
    const reembolso = reembolsos.find((r) => r.compraId === c.id)
    return {
      id: c.id,
      criadoEm: c.criadoEm,
      cliente: c.cliente,
      brutoCentavos: c.brutoCentavos,
      descontoLojaCentavos: c.descontoLojaCentavos,
      descontoShoppingCentavos: c.descontoShoppingCentavos,
      pagoCentavos: c.pagoCentavos,
      retirada: c.retirada,
      reembolso: reembolso ? { status: reembolso.status, pagoEm: reembolso.pagoEm } : null,
    }
  })

  const extrato: Extrato = {
    periodo,
    resumo: {
      compras: doPeriodo.length,
      brutoCentavos: soma('brutoCentavos'),
      descontoLojaCentavos: soma('descontoLojaCentavos'),
      descontoShoppingCentavos: soma('descontoShoppingCentavos'),
      pagoCentavos: soma('pagoCentavos'),
    },
    reembolsos: {
      pendenteCentavos: reembolsos.filter((r) => r.status === 'PENDENTE').reduce((t, r) => t + r.centavos, 0),
      pagoNoPeriodoCentavos: reembolsos
        .filter((r) => r.status === 'PAGO' && r.pagoEm && r.pagoEm >= desde)
        .reduce((t, r) => t + r.centavos, 0),
    },
    lancamentos: { itens: lancamentos, total: doPeriodo.length },
  }
  return ok(extrato)
}
