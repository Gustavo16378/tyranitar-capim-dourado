// GET /api/produtos (público): busca em todas as lojas.
// ?q= (texto), ?categoria=, ?loja= (id), ?precoMin= e ?precoMax= (centavos), ?pagina=, ?tamanho=.
// Toda busca com texto fica registrada na tabela busca (RN12), com ou sem resultado.
import { buscarNoCatalogo, registrarResultado } from '../../_lib/catalogo'
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { inteiro, json, paginacao } from '../../_lib/http'
import { produtoParaApi } from '../../_lib/repo/produtos'

export const onRequestGet: Rota = async ({ request, env, data, waitUntil }) => {
  const url = new URL(request.url)
  const pagina = paginacao(url)
  const q = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ').slice(0, 200)
  const categoria = url.searchParams.get('categoria')?.trim() || undefined
  const lojaId = url.searchParams.get('loja')?.trim() || undefined
  const precoMin = inteiro(url, 'precoMin')
  const precoMax = inteiro(url, 'precoMax')
  if (precoMin !== undefined && precoMax !== undefined && precoMin > precoMax) {
    throw new ErroApi('DADOS_INVALIDOS', 'O preço mínimo está maior que o máximo.')
  }

  const encontrados = await buscarNoCatalogo(env.DB, { texto: q, categoria, lojaId, precoMin, precoMax })

  if (q && pagina.pagina === 1) {
    const usuario = data.usuario
    waitUntil(
      registrarResultado(env.DB, {
        clienteId: usuario?.perfil === 'CLIENTE' ? usuario.id : null,
        termo: q,
        categoria,
        encontrados,
      }),
    )
  }

  return json({
    itens: encontrados.slice(pagina.inicio, pagina.inicio + pagina.tamanho).map(produtoParaApi),
    total: encontrados.length,
  })
}
