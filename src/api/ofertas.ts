import type { Lista, Oferta } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/ofertas'

/** GET /api/ofertas. Com token de cliente, já vem filtrado pelo nível dele. */
export function listarOfertas() {
  if (usarMock('ofertas')) return mock.listarOfertas()
  return requisitar<Lista<Oferta>>('GET', '/api/ofertas')
}
