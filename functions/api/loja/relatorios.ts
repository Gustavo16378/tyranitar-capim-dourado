// GET /api/loja/relatorios (LOJISTA): o desempenho da loja do token no período (RF24).
// ?periodo=7d|30d|90d (padrão 30d).
import { lojaDoLojista, type Rota } from '../../_lib/contexto'
import { json } from '../../_lib/http'
import { montarRelatorio } from '../../_lib/loja/relatorio'
import { lerPeriodo } from '../../_lib/regras/periodo'

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  return json(await montarRelatorio(env.DB, lojaId, lerPeriodo(new URL(request.url))))
}
