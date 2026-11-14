// PUT e DELETE /api/shopping/cupons/{id} (ADMIN_SHOPPING): editar, desativar, reativar e excluir
// um voucher do shopping, com as mesmas regras dos cupons da loja (_lib/painel/cupons.ts). Cupom
// de uma loja: 403, só a própria loja mexe nele.
import type { Rota } from '../../../_lib/contexto'
import { json, lerCorpo } from '../../../_lib/http'
import { editarCupom, excluirCupom } from '../../../_lib/painel/cupons'
import { cupomComUsoParaApi } from '../../../_lib/repo/cupons'
import { CATEGORIAS_DO_SHOPPING } from '../../../_lib/regras/categorias'
import { dataEmPalmas } from '../../../_lib/regras/datas'

export const onRequestPut: Rota<'id'> = async ({ request, params, env }) => {
  const categorias = CATEGORIAS_DO_SHOPPING.map((c) => c.id)
  const voucher = await editarCupom(env.DB, String(params.id), null, await lerCorpo(request), categorias, dataEmPalmas(new Date()))
  return json(cupomComUsoParaApi(voucher))
}

export const onRequestDelete: Rota<'id'> = async ({ params, env }) => {
  await excluirCupom(env.DB, String(params.id), null)
  return new Response(null, { status: 204 })
}
