// PUT /api/shopping/lojas/{id} (ADMIN_SHOPPING): ocupa a vaga, edita a loja ou libera a unidade
// (ativa: false). Liberar apaga o acesso dos lojistas da loja. CNPJ de outra loja: 409.
import type { Rota } from '../../../../_lib/contexto'
import { json, lerCorpo } from '../../../../_lib/http'
import { salvarLoja } from '../../../../_lib/shopping/lojas'

export const onRequestPut: Rota<'id'> = async ({ request, params, env }) =>
  json(await salvarLoja(env.DB, String(params.id), await lerCorpo(request)))
