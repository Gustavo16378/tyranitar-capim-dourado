import type { Lista, ProdutoResumo } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/favoritos'

/** GET /api/me/favoritos (rota de leitura que falta no api.md, ver mocks/favoritos.ts). */
export function listarFavoritos() {
  if (usarMock('favoritos')) return mock.listarFavoritos()
  return requisitar<Lista<ProdutoResumo>>('GET', '/api/me/favoritos')
}
