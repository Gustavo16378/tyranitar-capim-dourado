// Mock de GET /api/me/favoritos: os produtos que a Ana salvou. O api.md só tem PUT e DELETE em
// /api/me/favoritos/{produtoId}; esta é a rota de leitura que o Início precisa.
import type { Lista, ProdutoResumo } from '../../tipos'
import { responder } from './atraso'
import { acharProduto, resumo } from './produtos'

const SALVOS = ['p-pulse', 'p-run', 'p-perfume']

export function listarFavoritos(): Promise<Lista<ProdutoResumo>> {
  const itens = SALVOS.flatMap((id) => {
    const p = acharProduto(id)
    return p ? [resumo(p)] : []
  })
  return responder({ itens, total: itens.length })
}
