// PUT /api/loja/produtos/{id} (LOJISTA): edita um produto da loja do token (RF21).
// Produto de outra loja responde 404, como se não existisse.
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { json, lerCorpo } from '../../../_lib/http'
import { editarProduto, exigirProduto } from '../../../_lib/loja/produtos'

export const onRequestPut: Rota<'id'> = async ({ request, env, params, data }) => {
  const lojaId = lojaDoLojista(data)
  const produto = exigirProduto(await lerCorpo(request))
  return json(await editarProduto(env.DB, lojaId, String(params.id), produto))
}
