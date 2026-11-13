// PATCH /api/shopping/reembolsos/{id} (ADMIN_SHOPPING): { "status": "PAGO" }. Preenche pago_em;
// o extrato da loja passa a mostrar o reembolso como pago. Já pago: 409.
import type { Rota } from '../../../_lib/contexto'
import { json, lerCorpo } from '../../../_lib/http'
import { pagarReembolso } from '../../../_lib/shopping/reembolsos'

export const onRequestPatch: Rota<'id'> = async ({ request, params, env }) =>
  json(await pagarReembolso(env.DB, String(params.id), await lerCorpo(request)))
