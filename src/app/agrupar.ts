import type { LojaDoProduto, ProdutoResumo } from '../tipos'

export interface GrupoDaLoja {
  loja: LojaDoProduto
  produtos: ProdutoResumo[]
}

/**
 * Os salvos por loja (Salvos para provar): as lojas na ordem do salvo mais recente de cada uma
 * (a API manda o mais recente primeiro) e, em cada loja, os produtos na ordem em que vieram.
 */
export function agruparPorLoja(produtos: ProdutoResumo[]): GrupoDaLoja[] {
  const grupos = new Map<string, GrupoDaLoja>()
  for (const produto of produtos) {
    const grupo = grupos.get(produto.loja.id)
    if (grupo) grupo.produtos.push(produto)
    else grupos.set(produto.loja.id, { loja: produto.loja, produtos: [produto] })
  }
  return [...grupos.values()]
}
