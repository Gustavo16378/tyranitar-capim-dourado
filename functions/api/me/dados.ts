// GET /api/me/dados (CLIENTE): tudo o que o app guarda sobre o cliente, num JSON para baixar
// (LGPD, art. 18: acesso e portabilidade): conta, ficha, reservas, compras com os cupons,
// favoritos, a conversa com a Capi, buscas, notificações e avaliações. Sem o hash da senha nem o
// código do QR. O app salva como arquivo; quem abre o endereço direto também baixa o arquivo.
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { dadosDoCliente } from '../../_lib/repo/conta'

export const onRequestGet: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const dados = await dadosDoCliente(env.DB, id)
  if (!dados) throw new ErroApi('NAO_AUTENTICADO', 'Essa conta não existe mais. Entre com outra conta.')
  const dia = dados.geradoEm.slice(0, 10)
  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="meus-dados-${dia}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
