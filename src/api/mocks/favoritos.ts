// Mock de GET /api/me/favoritos: os produtos que a Ana salvou. O api.md só tem PUT e DELETE em
// /api/me/favoritos/{produtoId}; esta é a rota de leitura que o Início precisa.
// Os salvos são os primeiros do catálogo da fonte atual (src/api/produtos), para os cards
// abrirem produtos que existem, venham eles do mock ou da API.
import type { Lista, ProdutoResumo } from '../../tipos'
import { listarProdutos } from '../produtos'
import { responder } from './atraso'

export async function listarFavoritos(): Promise<Lista<ProdutoResumo>> {
  const { itens } = await listarProdutos({ tamanho: 3 })
  return responder({ itens, total: itens.length }, 0)
}
