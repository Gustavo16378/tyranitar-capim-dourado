// GET /api/lojas/{id} (público): uma loja ativa, no formato da lista de GET /api/lojas (nome,
// piso, tipo, categorias, a primeira é a principal, e o mapaId para o "Como chegar"). É a
// página da loja no app; os produtos dela vêm de GET /api/produtos?loja={id}. Unidade vaga ou
// id que não existe: 404.
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json } from '../../_lib/http'
import { buscarLojaAtiva, lojaParaApi } from '../../_lib/repo/lojas'

export const onRequestGet: Rota<'id'> = async ({ env, params }) => {
  const loja = await buscarLojaAtiva(env.DB, String(params.id))
  if (!loja) throw new ErroApi('NAO_ENCONTRADO', 'Essa loja não está no shopping.')
  return json(lojaParaApi(loja))
}
