// GET e PUT /api/shopping/configuracao (ADMIN_SHOPPING): as regras da fidelidade (RF28): pontos
// de cada nível (RN08), pontos por real (RN07) e prazos da reserva (RN01, RN02).
import type { Rota } from '../../_lib/contexto'
import { json, lerCorpo } from '../../_lib/http'
import { gravarRegrasDaFidelidade, lerPedidoConfiguracao, lerRegrasDaFidelidade } from '../../_lib/shopping/configuracao'

export const onRequestGet: Rota = async ({ env }) => json(await lerRegrasDaFidelidade(env.DB))

export const onRequestPut: Rota = async ({ request, env }) => {
  const regras = lerPedidoConfiguracao(await lerCorpo(request))
  await gravarRegrasDaFidelidade(env.DB, regras)
  return json(regras)
}
