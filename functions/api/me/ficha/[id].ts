// DELETE /api/me/ficha/{id} (CLIENTE): apaga um interesse da ficha. Responde a ficha atualizada,
// como GET /api/me/ficha. Interesse que não está na ficha: 404.
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json } from '../../../_lib/http'
import { apagarInteresse, fichaParaOCliente } from '../../../_lib/repo/fichas'

export const onRequestDelete: Rota<'id'> = async ({ env, data, params }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  if (!(await apagarInteresse(env.DB, id, String(params.id)))) {
    throw new ErroApi('NAO_ENCONTRADO', 'Esse interesse não está mais na sua ficha.')
  }
  return json(await fichaParaOCliente(env.DB, id))
}
