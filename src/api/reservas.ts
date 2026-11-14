import type { NovaReserva, OpcoesDaReserva, Reserva, ReservaDetalhe } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/reservas'

/** POST /api/reservas */
export function criarReserva(nova: NovaReserva) {
  if (usarMock('reservas')) return mock.criarReserva(nova)
  return requisitar<Reserva>('POST', '/api/reservas', nova)
}

/** GET /api/reservas/{id}: a reserva do cliente, com o produto. */
export function obterReserva(id: string) {
  if (usarMock('reservas')) return mock.obterReserva(id)
  return requisitar<ReservaDetalhe>('GET', `/api/reservas/${encodeURIComponent(id)}`)
}

/** POST /api/reservas/{id}/pagamento: confirma o Pix simulado. A reserva segue PENDENTE, agora paga. */
export function pagarReserva(id: string) {
  if (usarMock('reservas')) return mock.pagarReserva(id)
  return requisitar<Reserva>('POST', `/api/reservas/${encodeURIComponent(id)}/pagamento`)
}

/**
 * PATCH /api/reservas/{id}/cancelar: o cliente desiste da reserva em aberto. O produto volta para a
 * loja e, se estava paga por Pix, o estorno (simulado) fica pedido.
 */
export function cancelarReserva(id: string) {
  if (usarMock('reservas')) return mock.cancelarReserva(id)
  return requisitar<Reserva>('PATCH', `/api/reservas/${encodeURIComponent(id)}/cancelar`)
}

/**
 * GET /api/produtos/{id}/cupons: as opções de tamanho e cor do produto e os cupons do cliente que
 * valem para ele, com o desconto que dariam na reserva. A folha de reservar mostra isto.
 */
export function opcoesDaReserva(produtoId: string, quantidade = 1) {
  if (usarMock('reservas')) return Promise.resolve<OpcoesDaReserva>({ tamanhos: [], cores: [], itens: [] })
  return requisitar<OpcoesDaReserva>('GET', `/api/produtos/${encodeURIComponent(produtoId)}/cupons?quantidade=${quantidade}`)
}
