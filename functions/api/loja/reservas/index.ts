// GET /api/loja/reservas (LOJISTA): reservas da loja do token, as que vencem primeiro na frente (RF20).
// ?status=PENDENTE,SEPARADA (padrão: todos), ?pagina=, ?tamanho=.
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json, paginacao } from '../../../_lib/http'
import { expirarVencidas, listarReservasDaLoja } from '../../../_lib/repo/reservas'
import { TRANSICOES, type StatusReserva } from '../../../_lib/regras/reserva'

const TODOS = Object.keys(TRANSICOES) as StatusReserva[]

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const url = new URL(request.url)
  const pagina = paginacao(url)
  const texto = url.searchParams.get('status')?.trim()
  const status = texto ? (texto.split(',').map((s) => s.trim()) as StatusReserva[]) : TODOS
  if (status.some((s) => !TODOS.includes(s))) {
    throw new ErroApi('DADOS_INVALIDOS', `Status desconhecido. Use: ${TODOS.join(', ')}.`)
  }
  await expirarVencidas(env.DB, { lojaId })
  return json(await listarReservasDaLoja(env.DB, lojaId, status, pagina))
}
