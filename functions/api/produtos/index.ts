// GET /api/produtos (público): busca em todas as lojas.
// ?q= (texto), ?categoria=, ?loja= (id), ?precoMin= e ?precoMax= (centavos), ?pagina=, ?tamanho=.
// Toda busca com texto fica registrada na tabela busca (RN12), com ou sem resultado.
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { inteiro, json, paginacao } from '../../_lib/http'
import { registrarBusca } from '../../_lib/repo/buscas'
import { listarProdutosAtivos, produtoParaApi, type ProdutoLinha } from '../../_lib/repo/produtos'
import { lerJson, normalizar, termosDaBusca, textosDoJson } from '../../_lib/texto'

/** Relevância do produto para os termos: 0 se algum termo não aparece; nome vale mais. */
function relevancia(p: ProdutoLinha, termos: string[]) {
  const nome = normalizar(p.nome)
  const resto = normalizar([p.descricao, p.categoria, p.loja_nome, ...textosDoJson(lerJson(p.atributos, {}))].join(' '))
  let pontos = 0
  for (const termo of termos) {
    if (nome.includes(termo)) pontos += 2
    else if (resto.includes(termo)) pontos += 1
    else return 0
  }
  return pontos
}

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

  const produtos = await listarProdutosAtivos(env.DB, { categoria, lojaId, precoMin, precoMax })
  const termos = termosDaBusca(q)
  const encontrados = termos.length
    ? produtos
        .map((p) => ({ p, nota: relevancia(p, termos) }))
        .filter(({ nota }) => nota > 0)
        .sort((a, b) => b.nota - a.nota || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
        .map(({ p }) => p)
    : produtos

  if (q && pagina.pagina === 1) {
    const usuario = data.usuario
    const registro = registrarBusca(env.DB, {
      clienteId: usuario?.perfil === 'CLIENTE' ? usuario.id : null,
      termo: q.toLowerCase(),
      categoria: categoria ?? encontrados[0]?.categoria ?? null,
      encontrou: encontrados.length > 0,
    }).catch((erro) => console.error('Não deu para registrar a busca:', erro))
    waitUntil(registro)
  }

  return json({
    itens: encontrados.slice(pagina.inicio, pagina.inicio + pagina.tamanho).map(produtoParaApi),
    total: encontrados.length,
  })
}
