// GET /api/lojas (público): lojas ativas, com ?piso=1|2, ?categoria= e paginação.
// O app usa o mapaId e o piso para desenhar a rota no mapa.
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { inteiro, json, paginacao } from '../../_lib/http'
import { listarLojas } from '../../_lib/repo/lojas'

export const onRequestGet: Rota = async ({ request, env }) => {
  const url = new URL(request.url)
  const piso = inteiro(url, 'piso')
  if (piso !== undefined && piso !== 1 && piso !== 2) {
    throw new ErroApi('DADOS_INVALIDOS', 'O piso é 1 (térreo) ou 2 (praça de alimentação).')
  }
  const categoria = url.searchParams.get('categoria')?.trim() || undefined
  return json(await listarLojas(env.DB, { piso, categoria }, paginacao(url, { maximo: 200 })))
}
