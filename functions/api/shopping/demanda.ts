// GET /api/shopping/demanda (ADMIN_SHOPPING): os termos mais buscados e as buscas sem resultado
// em nenhuma loja, por categoria, sem identificar clientes (RF29, RN12). ?periodo=7d|30d|90d.
import type { Rota } from '../../_lib/contexto'
import { json } from '../../_lib/http'
import { lerPeriodo } from '../../_lib/regras/periodo'
import { montarDemanda } from '../../_lib/shopping/demanda'

export const onRequestGet: Rota = async ({ request, env }) => json(await montarDemanda(env.DB, lerPeriodo(new URL(request.url))))
