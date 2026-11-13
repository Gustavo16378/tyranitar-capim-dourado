// Mock de POST /api/reservas e POST /api/reservas/{id}/pagamento, com as regras da API:
// estoque desconta na reserva (RN03), pagar na loja vale 4 h (RN01) e pago por Pix vale 48 h (RN02).
import type { NovaReserva, Reserva } from '../../tipos'
import { falhar, responder } from './atraso'
import { acharProduto } from './produtos'

const HORA = 60 * 60 * 1000
export const PRAZO_NA_LOJA = 4 * HORA
export const PRAZO_PIX_PAGO = 48 * HORA

/** Reservas criadas nesta sessão, com o nome do produto para a carteira. */
export const RESERVAS: (Reserva & { produto: string })[] = []

let proximoId = 1

function pixSimulado(id: string, centavos: number) {
  const valor = (centavos / 100).toFixed(2)
  return `00020126360014BR.GOV.BCB.PIX0114SIMULADO-${id}520400005303986540${valor.length}${valor}5802BR5913CAPIM DOURADO6006PALMAS6304SIMU`
}

/** A reserva como a API devolve (sem o nome do produto, que só a carteira usa). */
function comoResposta({ id, status, formaPagamento, pago, precoCentavos, expiraEm, pix }: Reserva): Reserva {
  return { id, status, formaPagamento, pago, precoCentavos, expiraEm, ...(pix ? { pix } : {}) }
}

export function criarReserva({ produtoId, quantidade, formaPagamento }: NovaReserva, agora = Date.now()) {
  const produto = acharProduto(produtoId)
  if (!produto) return falhar(404, 'NAO_ENCONTRADO', 'Esse produto não está mais no catálogo.')
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 5) {
    return falhar(400, 'DADOS_INVALIDOS', 'A quantidade vai de 1 a 5.')
  }
  if (produto.estoque < quantidade) return falhar(409, 'SEM_ESTOQUE', 'Esse produto acabou de esgotar nesta loja.')

  produto.estoque -= quantidade
  const id = `r-${proximoId++}`
  const precoCentavos = produto.precoCentavos * quantidade
  const reserva: Reserva & { produto: string } = {
    id,
    status: 'PENDENTE',
    formaPagamento,
    pago: false,
    precoCentavos,
    expiraEm: new Date(agora + PRAZO_NA_LOJA).toISOString(),
    ...(formaPagamento === 'PIX' ? { pix: { copiaECola: pixSimulado(id, precoCentavos), simulado: true } } : {}),
    produto: produto.nome,
  }
  RESERVAS.push(reserva)
  return responder(comoResposta(reserva))
}

export function pagarReserva(id: string, agora = Date.now()) {
  const reserva = RESERVAS.find((r) => r.id === id)
  if (!reserva) return falhar(404, 'NAO_ENCONTRADO', 'Não achamos essa reserva.')
  const emAberto = ['PENDENTE', 'CONFIRMADA', 'SEPARADA'].includes(reserva.status)
  if (reserva.formaPagamento !== 'PIX' || reserva.pago || !emAberto) {
    return falhar(409, 'TRANSICAO_INVALIDA', 'Essa reserva não está esperando pagamento.')
  }
  reserva.pago = true
  reserva.expiraEm = new Date(agora + PRAZO_PIX_PAGO).toISOString()
  return responder(comoResposta(reserva))
}
