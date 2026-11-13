// GET /api/produtos/{id} (público): o produto com atributos, fotos, avaliações e as outras
// lojas que têm o mesmo item ou parecidos.
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json } from '../../_lib/http'
import { avaliacoesDoProduto, buscarProdutoAtivo, emOutrasLojas, produtoParaApi } from '../../_lib/repo/produtos'
import { lerJson } from '../../_lib/texto'

export const onRequestGet: Rota<'id'> = async ({ params, env }) => {
  const id = String(params.id)
  const produto = await buscarProdutoAtivo(env.DB, id)
  if (!produto) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')

  const [avaliacoes, outras] = await Promise.all([avaliacoesDoProduto(env.DB, id), emOutrasLojas(env.DB, produto)])
  return json({
    ...produtoParaApi(produto),
    descricao: produto.descricao,
    fotos: lerJson<string[]>(produto.fotos, []),
    atributos: lerJson<Record<string, unknown>>(produto.atributos, {}),
    avaliacao: { media: avaliacoes.media, total: avaliacoes.total },
    avaliacoes: avaliacoes.itens,
    outrasLojas: outras.map(produtoParaApi),
  })
}
