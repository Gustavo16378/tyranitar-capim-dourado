// GET /api/loja/cupons (LOJISTA): os cupons da loja do token (sem os vouchers do shopping), com
// quantas compras usaram cada um e o desconto que deram. Os que valem hoje primeiro (RF23).
// POST /api/loja/cupons (LOJISTA): cria um cupom da loja, que já vale no atendimento (RN06).
import { lojaDoLojista, type Rota } from '../../_lib/contexto'
import { json, lerCorpo } from '../../_lib/http'
import { lerPedidoCupom } from '../../_lib/painel/cupons'
import { buscarCupomComUso, criarCupom, cupomComUsoParaApi, cuponsComUso } from '../../_lib/repo/cupons'
import { CATEGORIAS_DO_SHOPPING } from '../../_lib/regras/categorias'
import { dataEmPalmas } from '../../_lib/regras/datas'

export const onRequestGet: Rota = async ({ env, data }) => {
  const lojaId = lojaDoLojista(data)
  const cupons = (await cuponsComUso(env.DB, lojaId, dataEmPalmas(new Date()))).map(cupomComUsoParaApi)
  return json({ itens: cupons, total: cupons.length })
}

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const categorias = CATEGORIAS_DO_SHOPPING.map((c) => c.id)
  const cupom = lerPedidoCupom(await lerCorpo(request), categorias, dataEmPalmas(new Date()))
  const id = await criarCupom(env.DB, lojaId, cupom)
  return json(cupomComUsoParaApi((await buscarCupomComUso(env.DB, id))!), 201)
}
