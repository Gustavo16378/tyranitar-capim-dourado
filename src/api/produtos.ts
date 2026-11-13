import type { FiltroProdutos, Lista, ProdutoDetalhe, ProdutoResumo } from '../tipos'
import { query, requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/produtos'

/** GET /api/produtos */
export function listarProdutos(filtro: FiltroProdutos = {}) {
  if (usarMock('produtos')) return mock.listarProdutos(filtro)
  return requisitar<Lista<ProdutoResumo>>('GET', `/api/produtos${query(filtro)}`)
}

/** GET /api/produtos/{id} */
export function obterProduto(id: string) {
  if (usarMock('produtos')) return mock.obterProduto(id)
  return requisitar<ProdutoDetalhe>('GET', `/api/produtos/${encodeURIComponent(id)}`)
}
