// POST /api/loja/produtos/importar (LOJISTA): a planilha CSV inteira, em text/csv (RF22).
// As linhas boas são salvas; as com erro voltam com o número da linha.
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json } from '../../../_lib/http'
import { importarCsv } from '../../../_lib/loja/produtos'

const TAMANHO_MAXIMO = 1024 * 1024

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const csv = await request.text()
  if (!csv.trim()) throw new ErroApi('DADOS_INVALIDOS', 'Envie a planilha em CSV.')
  if (csv.length > TAMANHO_MAXIMO) throw new ErroApi('DADOS_INVALIDOS', 'A planilha aceita até 1 MB.')
  return json(await importarCsv(env.DB, lojaId, csv))
}
