// GET /api/shopping/reembolsos (ADMIN_SHOPPING): o que o shopping deve a cada loja pelos vouchers
// usados nela, a que mais tem a receber primeiro (RF31, RN11). ?status=PENDENTE|PAGO.
import type { Rota } from '../../../_lib/contexto'
import { json } from '../../../_lib/http'
import { lerStatusReembolso, montarReembolsos } from '../../../_lib/shopping/reembolsos'

export const onRequestGet: Rota = async ({ request, env }) =>
  json(await montarReembolsos(env.DB, lerStatusReembolso(new URL(request.url))))
