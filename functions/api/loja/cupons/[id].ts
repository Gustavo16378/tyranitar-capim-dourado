// PUT /api/loja/cupons/{id} (LOJISTA): edita, desativa ou reativa um cupom da loja do token (RF23).
// Os campos que não vierem ficam como estão. Nunca usado e sem reserva, tudo muda; já usado (ou
// preso numa reserva), só o título, a validade, o limite por cliente e o ativo (409 CUPOM_EM_USO).
// DELETE /api/loja/cupons/{id}: exclui o cupom nunca usado e sem reserva; senão, 409, sugerindo
// desativar. Cupom de outra loja ou voucher do shopping: 403. As regras: _lib/painel/cupons.ts.
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { json, lerCorpo } from '../../../_lib/http'
import { editarCupom, excluirCupom } from '../../../_lib/painel/cupons'
import { cupomComUsoParaApi } from '../../../_lib/repo/cupons'
import { CATEGORIAS_DO_SHOPPING } from '../../../_lib/regras/categorias'
import { dataEmPalmas } from '../../../_lib/regras/datas'

export const onRequestPut: Rota<'id'> = async ({ request, params, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const categorias = CATEGORIAS_DO_SHOPPING.map((c) => c.id)
  const cupom = await editarCupom(env.DB, String(params.id), lojaId, await lerCorpo(request), categorias, dataEmPalmas(new Date()))
  return json(cupomComUsoParaApi(cupom))
}

export const onRequestDelete: Rota<'id'> = async ({ params, env, data }) => {
  const lojaId = lojaDoLojista(data)
  await excluirCupom(env.DB, String(params.id), lojaId)
  return new Response(null, { status: 204 })
}
