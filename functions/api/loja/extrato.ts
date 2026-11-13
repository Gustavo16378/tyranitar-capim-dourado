// GET /api/loja/extrato (LOJISTA): as compras da loja no caixa pela plataforma no período, os
// descontos de cada lado e os reembolsos dos vouchers do shopping (RF25, RN11).
// ?periodo=7d|30d|90d (padrão 30d), ?pagina=, ?tamanho=.
import { lojaDoLojista, type Rota } from '../../_lib/contexto'
import { json, paginacao } from '../../_lib/http'
import { montarExtrato } from '../../_lib/loja/extrato'
import { lerPeriodo } from '../../_lib/regras/periodo'

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const url = new URL(request.url)
  return json(await montarExtrato(env.DB, lojaId, lerPeriodo(url), paginacao(url)))
}
