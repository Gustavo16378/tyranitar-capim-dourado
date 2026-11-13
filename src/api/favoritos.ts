import type { Lista, ProdutoResumo } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/favoritos'

/** GET /api/me/favoritos: os produtos salvos, no formato da busca. */
export function listarFavoritos() {
  if (usarMock('favoritos')) return mock.listarFavoritos()
  return requisitar<Lista<ProdutoResumo>>('GET', '/api/me/favoritos')
}
