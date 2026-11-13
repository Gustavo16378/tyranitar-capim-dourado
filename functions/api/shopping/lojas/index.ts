// GET /api/shopping/lojas (ADMIN_SHOPPING): as unidades da planta, ativas e vagas (RF27).
// ?q= (nome ou número da unidade), ?situacao=ATIVA|VAGA, ?pagina=, ?tamanho= (até 200).
// POST /api/shopping/lojas: uma unidade nova na planta, vaga ou já com a loja.
import type { Rota } from '../../../_lib/contexto'
import { json, lerCorpo, paginacao } from '../../../_lib/http'
import { lerSituacao, listarLojasDoShopping, novaUnidade } from '../../../_lib/shopping/lojas'

export const onRequestGet: Rota = async ({ request, env }) => {
  const url = new URL(request.url)
  const { inicio, tamanho } = paginacao(url, { maximo: 200 })
  const q = url.searchParams.get('q') ?? undefined
  return json(await listarLojasDoShopping(env.DB, { q, situacao: lerSituacao(url), inicio, tamanho }))
}

export const onRequestPost: Rota = async ({ request, env }) => json(await novaUnidade(env.DB, await lerCorpo(request)), 201)
