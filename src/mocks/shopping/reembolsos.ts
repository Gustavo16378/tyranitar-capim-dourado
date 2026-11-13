// GET /api/shopping/reembolsos?status= e PATCH /api/shopping/reembolsos/{id} (RF31): o que o
// shopping deve a cada loja pelos vouchers usados nela (RN11). Os reembolsos ficam em
// mocks/comum, os mesmos que o Extrato da loja lê.
import type { ReembolsoDoShopping, Reembolsos, ReembolsosDaLoja } from '../../tipos/shopping'
import { pagarReembolso as pagar, todosOsReembolsos, type ReembolsoMock } from '../comum/reembolsos'
import { dadosInvalidos, erro, naoEncontrado, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { todosOsVouchers } from '../comum/vouchers'
import { exigirAdmin } from './auth'
import { banco } from './dados'

function paraApi(r: ReembolsoMock): ReembolsoDoShopping {
  const voucher = todosOsVouchers().find((v) => v.id === r.cupomId)
  return {
    id: r.id,
    compraId: r.compraId,
    cupom: { id: r.cupomId, titulo: voucher?.titulo ?? 'Voucher do shopping' },
    centavos: r.centavos,
    status: r.status,
    criadoEm: r.criadoEm,
    pagoEm: r.pagoEm,
  }
}

const soma = (lista: ReembolsoMock[]) => lista.reduce((total, r) => total + r.centavos, 0)

export function listarReembolsos(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const status = pedido.busca.get('status')
  if (status && status !== 'PENDENTE' && status !== 'PAGO') return dadosInvalidos('Use status PENDENTE ou PAGO.')

  const todos = todosOsReembolsos()
  const pendentes = todos.filter((r) => r.status === 'PENDENTE')
  const ha30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const lojas: ReembolsosDaLoja[] = banco.lojas
    .map((loja) => {
      const daLoja = todos.filter((r) => r.lojaId === loja.id)
      const itens = daLoja
        .filter((r) => !status || r.status === status)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .map(paraApi)
      return {
        loja: { id: loja.id, nome: loja.nome, unidade: loja.unidade },
        pendenteCentavos: soma(daLoja.filter((r) => r.status === 'PENDENTE')),
        pagoCentavos: soma(daLoja.filter((r) => r.status === 'PAGO')),
        itens,
      }
    })
    .filter((l) => l.itens.length > 0)
    // Quem mais tem a receber primeiro.
    .sort((a, b) => b.pendenteCentavos - a.pendenteCentavos || a.loja.nome.localeCompare(b.loja.nome, 'pt-BR'))

  const resposta: Reembolsos = {
    totais: {
      pendenteCentavos: soma(pendentes),
      lojasComPendencia: new Set(pendentes.map((r) => r.lojaId)).size,
      pagoUltimos30DiasCentavos: soma(todos.filter((r) => r.status === 'PAGO' && (r.pagoEm ?? '') >= ha30Dias)),
    },
    lojas,
  }
  return ok(resposta)
}

export function pagarReembolso(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  if (objeto(pedido.corpo)?.status !== 'PAGO') return dadosInvalidos('O único status que dá para pedir é PAGO.')
  const reembolso = todosOsReembolsos().find((r) => r.id === pedido.params.id)
  if (!reembolso) return naoEncontrado('Esse reembolso não existe.')
  if (reembolso.status === 'PAGO') return erro(409, 'TRANSICAO_INVALIDA', 'Esse reembolso já foi pago.')
  return ok(paraApi(pagar(reembolso.id)!))
}
