// Mock de GET /api/me/favoritos: os produtos que a Ana salvou, no formato da busca.
// Os salvos são os primeiros do catálogo da fonte atual (src/api/produtos), para os cards
// abrirem produtos que existem, venham eles do mock ou da API.
import type { Lista, ProdutoResumo } from '../../tipos'
import { listarProdutos } from '../produtos'
import { responder } from './atraso'

export async function listarFavoritos(): Promise<Lista<ProdutoResumo>> {
  const { itens } = await listarProdutos({ tamanho: 3 })
  return responder({ itens, total: itens.length }, 0)
}
