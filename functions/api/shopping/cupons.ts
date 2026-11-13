// GET e POST /api/shopping/cupons (ADMIN_SHOPPING): os vouchers do shopping (cupons sem loja),
// com o uso: descontoCentavos é o que o shopping devolve às lojas por eles (RF28, RN11). O
// voucher criado já vale no atendimento das lojas e na vitrine do app para os clientes do nível.
import type { Rota } from '../../_lib/contexto'
import { json, lerCorpo } from '../../_lib/http'
import { lerPedidoCupom } from '../../_lib/painel/cupons'
import { buscarCupomComUso, criarCupom, cupomComUsoParaApi, cuponsComUso } from '../../_lib/repo/cupons'
import { CATEGORIAS_DO_SHOPPING } from '../../_lib/regras/categorias'
import { dataEmPalmas } from '../../_lib/regras/datas'

export const onRequestGet: Rota = async ({ env }) => {
  const vouchers = (await cuponsComUso(env.DB, null, dataEmPalmas(new Date()))).map(cupomComUsoParaApi)
  return json({ itens: vouchers, total: vouchers.length })
}

export const onRequestPost: Rota = async ({ request, env }) => {
  const categorias = CATEGORIAS_DO_SHOPPING.map((c) => c.id)
  const voucher = lerPedidoCupom(await lerCorpo(request), categorias, dataEmPalmas(new Date()))
  const id = await criarCupom(env.DB, null, voucher)
  return json(cupomComUsoParaApi((await buscarCupomComUso(env.DB, id))!), 201)
}
