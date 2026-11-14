// PUT /api/me/favoritos/{produtoId} (CLIENTE): salva o produto (o coração do app). Só produto
// ativo de loja ativa; o resto é 404. Salvar de novo não muda nada e responde 204 do mesmo jeito.
// DELETE /api/me/favoritos/{produtoId} (CLIENTE): tira dos salvos. Tirar o que não estava salvo
// também é 204: o app pode repetir o pedido sem erro. Sem corpo nas duas.
// A área /api/me/ do _middleware já exige o perfil CLIENTE.
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { salvarFavorito, tirarFavorito } from '../../../_lib/repo/favoritos'
import { buscarProdutoAtivo } from '../../../_lib/repo/produtos'

const semConteudo = () => new Response(null, { status: 204 })

export const onRequestPut: Rota<'produtoId'> = async ({ env, data, params }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const produtoId = String(params.produtoId)
  if (!(await buscarProdutoAtivo(env.DB, produtoId))) {
    throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
  }
  await salvarFavorito(env.DB, id, produtoId)
  return semConteudo()
}

export const onRequestDelete: Rota<'produtoId'> = async ({ env, data, params }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  await tirarFavorito(env.DB, id, String(params.produtoId))
  return semConteudo()
}
