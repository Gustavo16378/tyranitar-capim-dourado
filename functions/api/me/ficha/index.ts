// GET /api/me/ficha (CLIENTE): o que a Capi anotou sobre o cliente (a ficha de interesses que as
// lojas veem, RN04), para ele conferir na Minha conta. Cada interesse traz o id para apagar
// (DELETE /api/me/ficha/{id}). Sem consentimento, a lista vem vazia.
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { json } from '../../../_lib/http'
import { fichaParaOCliente } from '../../../_lib/repo/fichas'

export const onRequestGet: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  return json(await fichaParaOCliente(env.DB, id))
}
