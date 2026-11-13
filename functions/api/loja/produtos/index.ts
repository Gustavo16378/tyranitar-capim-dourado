// GET /api/loja/produtos (LOJISTA): o catálogo da loja do token, ativos e inativos (RF21).
// ?q= (texto no nome, sem diferenciar acento), ?pagina=, ?tamanho=.
// POST /api/loja/produtos (LOJISTA): cadastra um produto na loja do token (RF21).
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { json, lerCorpo, paginacao } from '../../../_lib/http'
import { criarProduto, exigirProduto, listarCatalogo } from '../../../_lib/loja/produtos'

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const url = new URL(request.url)
  return json(await listarCatalogo(env.DB, lojaId, url.searchParams.get('q') ?? '', paginacao(url)))
}

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const produto = exigirProduto(await lerCorpo(request))
  return json(await criarProduto(env.DB, lojaId, produto), 201)
}
