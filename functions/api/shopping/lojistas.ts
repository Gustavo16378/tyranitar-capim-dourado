// POST /api/shopping/lojistas (ADMIN_SHOPPING): { lojaId, nome, email }. Cria o acesso do
// lojista ao painel da loja e devolve a senha provisória, que só aparece nesta resposta (RF27).
import type { Rota } from '../../_lib/contexto'
import { json, lerCorpo } from '../../_lib/http'
import { novoLojista } from '../../_lib/shopping/lojas'

export const onRequestPost: Rota = async ({ request, env }) => json(await novoLojista(env.DB, await lerCorpo(request)), 201)
