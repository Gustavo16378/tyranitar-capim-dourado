// GET /api/loja/reservas e PATCH /api/loja/reservas/{id}.
import type { Lista, ReservaDaLoja, StatusReserva } from '../../tipos/loja'
import { podeMudar, ROTULO_DO_STATUS, TRANSICOES_DA_LOJA } from '../../loja/comum/reserva'
import { exigirLojista } from './auth'
import { banco, type ReservaMock } from './dados'
import { dadosInvalidos, erro, naoEncontrado, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'

const TODOS_OS_STATUS = Object.keys(TRANSICOES_DA_LOJA) as StatusReserva[]

/** O que a loja vê: sem o id do cliente, só o primeiro nome. */
function paraLoja(r: ReservaMock): ReservaDaLoja {
  const { id, produto, cliente, quantidade, status, formaPagamento, pago, precoCentavos, expiraEm, criadoEm } = r
  return { id, produto, cliente, quantidade, status, formaPagamento, pago, precoCentavos, expiraEm, criadoEm }
}

export function listarReservas(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const textoStatus = pedido.busca.get('status')
  const status = textoStatus ? (textoStatus.split(',') as StatusReserva[]) : TODOS_OS_STATUS
  if (status.some((s) => !TODOS_OS_STATUS.includes(s))) {
    return dadosInvalidos(`Status desconhecido. Use: ${TODOS_OS_STATUS.join(', ')}.`)
  }
  const pagina = Number(pedido.busca.get('pagina') ?? 1)
  const tamanho = Number(pedido.busca.get('tamanho') ?? 20)
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(tamanho) || tamanho < 1 || tamanho > 100) {
    return dadosInvalidos('Use pagina a partir de 1 e tamanho de 1 a 100.')
  }

  // As que vencem primeiro vêm primeiro: são as que o balcão precisa olhar.
  const filtradas = banco.reservas
    .filter((r) => status.includes(r.status))
    .sort((a, b) => a.expiraEm.localeCompare(b.expiraEm))
  const resposta: Lista<ReservaDaLoja> = {
    itens: filtradas.slice((pagina - 1) * tamanho, pagina * tamanho).map(paraLoja),
    total: filtradas.length,
  }
  return ok(resposta)
}

export function mudarStatusReserva(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const reserva = banco.reservas.find((r) => r.id === pedido.params.id)
  if (!reserva) return naoEncontrado('Essa reserva não existe nesta loja.')

  const novo = objeto(pedido.corpo)?.status
  if (typeof novo !== 'string' || !TODOS_OS_STATUS.includes(novo as StatusReserva)) {
    return dadosInvalidos('Informe o novo status da reserva.')
  }
  if (!podeMudar(reserva.status, novo as StatusReserva)) {
    const de = ROTULO_DO_STATUS[reserva.status].toLowerCase()
    const para = ROTULO_DO_STATUS[novo as StatusReserva].toLowerCase()
    return erro(409, 'TRANSICAO_INVALIDA', `Uma reserva ${de} não pode virar ${para}.`)
  }

  reserva.status = novo as StatusReserva
  return ok(paraLoja(reserva))
}
