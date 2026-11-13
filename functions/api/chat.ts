// POST /api/chat (CLIENTE): uma mensagem para a Capi → { resposta, produtos, acoes }.
// GET /api/chat (CLIENTE): as últimas 50 mensagens, para reabrir a conversa.
import { conversar } from '../_lib/capi/conversa'
import { lerEntradaDoChat } from '../_lib/capi/entrada'
import { modeloClaude } from '../_lib/capi/modelo'
import { exigirPerfil, type Rota } from '../_lib/contexto'
import { json, lerCorpo } from '../_lib/http'
import { ultimasMensagens } from '../_lib/repo/mensagens'
import { deSqlite } from '../_lib/regras/datas'

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const entrada = lerEntradaDoChat(await lerCorpo(request))
  const resposta = await conversar(
    { clienteId: cliente.id, ...entrada },
    { db: env.DB, modelo: modeloClaude(env), nomeDoModelo: env.CAPI_MODELO || undefined },
  )
  return json(resposta)
}

export const onRequestGet: Rota = async ({ env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const mensagens = await ultimasMensagens(env.DB, cliente.id, 50)
  return json({
    itens: mensagens.map((m) => ({ id: m.id, papel: m.papel, conteudo: m.conteudo, criadoEm: deSqlite(m.criado_em).toISOString() })),
    total: mensagens.length,
  })
}
