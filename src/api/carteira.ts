import type { Carteira } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/carteira'

/** GET /api/me/carteira */
export function obterCarteira() {
  if (usarMock('carteira')) return mock.obterCarteira()
  return requisitar<Carteira>('GET', '/api/me/carteira')
}
