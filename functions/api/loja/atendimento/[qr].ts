// GET /api/loja/atendimento/{qr} (LOJISTA): ficha, reservas e cupons do cliente do QR (RF18).
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { json } from '../../../_lib/http'
import { montarAtendimento } from '../../../_lib/loja/atendimento'

export const onRequestGet: Rota<'qr'> = async ({ params, env, data }) => {
  return json(await montarAtendimento(env.DB, lojaDoLojista(data), String(params.qr)))
}
