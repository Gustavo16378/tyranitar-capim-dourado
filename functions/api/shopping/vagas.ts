// GET /api/shopping/vagas (ADMIN_SHOPPING): as lojas vagas da planta cruzadas com as buscas sem
// resultado do período: que tipo de loja buscar para cada vaga (regras/vagas.ts). ?periodo=.
import type { Rota } from '../../_lib/contexto'
import { json } from '../../_lib/http'
import { lerPeriodo } from '../../_lib/regras/periodo'
import { montarVagas } from '../../_lib/shopping/demanda'

export const onRequestGet: Rota = async ({ request, env }) => json(await montarVagas(env.DB, lerPeriodo(new URL(request.url))))
