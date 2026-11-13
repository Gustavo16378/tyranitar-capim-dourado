import type { NovaReserva, Reserva } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/reservas'

/** POST /api/reservas */
export function criarReserva(nova: NovaReserva) {
  if (usarMock('reservas')) return mock.criarReserva(nova)
  return requisitar<Reserva>('POST', '/api/reservas', nova)
}

/** POST /api/reservas/{id}/pagamento: confirma o Pix simulado. */
export function pagarReserva(id: string) {
  if (usarMock('reservas')) return mock.pagarReserva(id)
  return requisitar<Reserva>('POST', `/api/reservas/${encodeURIComponent(id)}/pagamento`)
}
