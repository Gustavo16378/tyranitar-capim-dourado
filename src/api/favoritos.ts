import type { Lista, ProdutoResumo } from '../tipos'
import { query, requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/favoritos'

/** GET /api/me/favoritos: os produtos salvos, no formato da busca, o mais recente primeiro. */
export function listarFavoritos(pagina: { pagina?: number; tamanho?: number } = {}) {
  if (usarMock('favoritos')) return mock.listarFavoritos()
  return requisitar<Lista<ProdutoResumo>>('GET', `/api/me/favoritos${query(pagina)}`)
}

/** PUT /api/me/favoritos/{produtoId}: o coração salva. Salvar de novo não dá erro. */
export async function salvarFavorito(produtoId: string) {
  if (usarMock('favoritos')) return mock.mudarFavorito()
  await requisitar<null>('PUT', `/api/me/favoritos/${encodeURIComponent(produtoId)}`)
}

/** DELETE /api/me/favoritos/{produtoId}: tira dos salvos. Tirar o que não estava salvo não dá erro. */
export async function tirarFavorito(produtoId: string) {
  if (usarMock('favoritos')) return mock.mudarFavorito()
  await requisitar<null>('DELETE', `/api/me/favoritos/${encodeURIComponent(produtoId)}`)
}
