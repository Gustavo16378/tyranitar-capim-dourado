// POST /api/chat (CLIENTE): uma mensagem para a Capi → { resposta, produtos, acoes }.
// GET /api/chat (CLIENTE): as últimas 50 mensagens, para reabrir a conversa: o texto, se a
// mensagem do cliente tinha foto (a imagem não é guardada) e os cartões de cada resposta.
// DELETE /api/chat (CLIENTE): "Nova conversa", apaga a conversa → { apagadas }.
import { conversar, idsCitados, lerMensagemDoCliente, semMarcasDeProduto } from '../_lib/capi/conversa'
import { lerEntradaDoChat } from '../_lib/capi/entrada'
import { modeloClaude } from '../_lib/capi/modelo'
import { lerPaginaDeProduto } from '../_lib/capi/pagina'
import { exigirPerfil, type Rota } from '../_lib/contexto'
import { json, lerCorpo } from '../_lib/http'
import { apagarConversa, ultimasMensagens } from '../_lib/repo/mensagens'
import { produtoParaApi, produtosAtivosPorIds } from '../_lib/repo/produtos'
import { deSqlite } from '../_lib/regras/datas'

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const entrada = lerEntradaDoChat(await lerCorpo(request))
  const resposta = await conversar(
    { clienteId: cliente.id, ...entrada },
    {
      db: env.DB,
      modelo: modeloClaude(env),
      nomeDoModelo: env.CAPI_MODELO || undefined,
      lerPagina: lerPaginaDeProduto,
      modoDemo: env.CAPI_MODO_DEMO === '1',
    },
  )
  return json(resposta)
}

export const onRequestGet: Rota = async ({ env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const mensagens = await ultimasMensagens(env.DB, cliente.id, 50)
  // Os cartões que cada resposta mostrou, dos produtos que ainda estão ativos.
  const ids = [...new Set(mensagens.flatMap((m) => (m.papel === 'CAPI' ? idsCitados(m.conteudo) : [])))]
  const produtos = new Map((await produtosAtivosPorIds(env.DB, ids)).map((p) => [p.id, produtoParaApi(p)]))
  return json({
    itens: mensagens.map((m) => {
      const base = { id: m.id, papel: m.papel, criadoEm: deSqlite(m.criado_em).toISOString() }
      if (m.papel === 'CLIENTE') {
        const { texto, foto } = lerMensagemDoCliente(m.conteudo)
        return { ...base, conteudo: texto, foto }
      }
      return {
        ...base,
        // O histórico guarda as marcas [produto:ID] para o Claude; o app recebe o texto limpo e os cartões.
        conteudo: semMarcasDeProduto(m.conteudo),
        produtos: idsCitados(m.conteudo).flatMap((id) => (produtos.has(id) ? [produtos.get(id)!] : [])),
      }
    }),
    total: mensagens.length,
  })
}

export const onRequestDelete: Rota = async ({ env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  return json({ apagadas: await apagarConversa(env.DB, cliente.id) })
}
