// GET /api/shopping/lojas/{id}/lojistas (ADMIN_SHOPPING): quem administra a loja no painel.
import type { Rota } from '../../../../_lib/contexto'
import { json } from '../../../../_lib/http'
import { lojistasDaUnidade } from '../../../../_lib/shopping/lojas'

export const onRequestGet: Rota<'id'> = async ({ params, env }) => json(await lojistasDaUnidade(env.DB, String(params.id)))
