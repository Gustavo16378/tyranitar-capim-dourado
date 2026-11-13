// GET, POST e PUT /api/loja/produtos e POST /api/loja/produtos/importar (RF21, RF22).
import type { Pagina, PedidoProduto, ProdutoDaLoja, ResultadoImportacao } from '../../tipos/loja'
import { lerValorEmCentavos } from '../../painel/comum/formatos'
import { categoria, CATEGORIAS } from '../../loja/telas/produtos/categorias'
import { exigirLojista } from './auth'
import { banco, novoId } from './dados'
import { dadosInvalidos, naoEncontrado, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'

const sem = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function listarProdutos(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const q = sem(pedido.busca.get('q')?.trim() ?? '')
  const pagina = Number(pedido.busca.get('pagina') ?? 1)
  const tamanho = Number(pedido.busca.get('tamanho') ?? 20)
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(tamanho) || tamanho < 1 || tamanho > 100) {
    return dadosInvalidos('Use pagina a partir de 1 e tamanho de 1 a 100.')
  }
  // Ativos antes dos inativos, em ordem alfabética.
  const filtrados = banco.produtos
    .filter((p) => !q || sem(p.nome).includes(q))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'))
  const resposta: Pagina<ProdutoDaLoja> = {
    itens: filtrados.slice((pagina - 1) * tamanho, pagina * tamanho),
    total: filtrados.length,
  }
  return ok(resposta)
}

/** Valida o produto como a API: devolve o pedido limpo ou a mensagem do primeiro problema. */
export function validarProduto(corpo: unknown): PedidoProduto | string {
  const p = objeto(corpo)
  if (!p) return 'Envie o produto em JSON.'
  const nome = typeof p.nome === 'string' ? p.nome.trim() : ''
  if (nome.length < 2 || nome.length > 120) return 'O nome precisa ter de 2 a 120 caracteres.'
  if (typeof p.categoria !== 'string' || !categoria(p.categoria)) {
    return `Categoria desconhecida. Use: ${CATEGORIAS.map((c) => c.id).join(', ')}.`
  }
  if (typeof p.precoCentavos !== 'number' || !Number.isInteger(p.precoCentavos) || p.precoCentavos <= 0) {
    return 'O preço precisa ser maior que zero.'
  }
  if (typeof p.estoque !== 'number' || !Number.isInteger(p.estoque) || p.estoque < 0) {
    return 'O estoque precisa ser um número inteiro, zero ou mais.'
  }
  const fotos = p.fotos ?? []
  if (!Array.isArray(fotos) || fotos.some((f) => typeof f !== 'string')) return 'As fotos vão como uma lista de endereços.'
  const atributos = p.atributos ?? {}
  if (!objeto(atributos)) return 'Os atributos vão como um objeto JSON.'
  return {
    nome,
    descricao: typeof p.descricao === 'string' ? p.descricao.trim() : '',
    categoria: p.categoria,
    precoCentavos: p.precoCentavos,
    estoque: p.estoque,
    fotos: fotos as string[],
    atributos: atributos as Record<string, unknown>,
    ativo: p.ativo !== false,
  }
}

/** Categoria nova no catálogo passa a valer para o filtro da ficha (RN04). */
function lembrarCategoria(id: string) {
  if (!banco.categorias.includes(id)) banco.categorias.push(id)
}

export function criarProduto(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const produto = validarProduto(pedido.corpo)
  if (typeof produto === 'string') return dadosInvalidos(produto)
  const criado: ProdutoDaLoja = { id: novoId('p'), ...produto }
  banco.produtos.push(criado)
  lembrarCategoria(criado.categoria)
  return ok(criado, 201)
}

export function editarProduto(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const existente = banco.produtos.find((p) => p.id === pedido.params.id)
  if (!existente) return naoEncontrado('Esse produto não existe nesta loja.')
  const produto = validarProduto(pedido.corpo)
  if (typeof produto === 'string') return dadosInvalidos(produto)
  Object.assign(existente, produto)
  lembrarCategoria(existente.categoria)
  return ok(existente)
}

// ---------- importação por CSV ----------

const COLUNAS = ['nome', 'descricao', 'categoria', 'preco', 'estoque', 'fotos', 'atributos'] as const

/** Lê um CSV com vírgula, aspas e "" dentro das aspas. Devolve as linhas com as células. */
export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = []
  let linha: string[] = []
  let celula = ''
  let entreAspas = false
  const conteudo = texto.replace(/^\uFEFF/, '')
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i]
    if (entreAspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        celula += '"'
        i++
      } else if (c === '"') entreAspas = false
      else celula += c
    } else if (c === '"') entreAspas = true
    else if (c === ',') {
      linha.push(celula)
      celula = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && conteudo[i + 1] === '\n') i++
      linha.push(celula)
      linhas.push(linha)
      linha = []
      celula = ''
    } else celula += c
  }
  if (celula || linha.length) {
    linha.push(celula)
    linhas.push(linha)
  }
  return linhas.filter((l) => l.some((c) => c.trim()))
}

export function importarProdutos(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  if (typeof pedido.corpo !== 'string' || !pedido.corpo.trim()) return dadosInvalidos('Envie a planilha em CSV.')

  const [cabecalho = [], ...linhas] = lerCsv(pedido.corpo)
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [sem(nome.trim()), i]))
  const faltando = COLUNAS.filter((coluna) => indice[coluna] === undefined)
  if (faltando.length) return dadosInvalidos(`A planilha precisa das colunas: ${COLUNAS.join(',')}. Faltou: ${faltando.join(', ')}.`)

  const resultado: ResultadoImportacao = { importados: 0, erros: [] }
  linhas.forEach((celulas, i) => {
    const linha = i + 2 // o cabeçalho é a linha 1
    const valor = (coluna: (typeof COLUNAS)[number]) => (celulas[indice[coluna]] ?? '').trim()
    const precoCentavos = lerValorEmCentavos(valor('preco'))
    if (precoCentavos === null) {
      resultado.erros.push({ linha, mensagem: 'O preço precisa estar em reais, como 399,90.' })
      return
    }
    let atributos: unknown = {}
    if (valor('atributos')) {
      try {
        atributos = JSON.parse(valor('atributos'))
      } catch {
        resultado.erros.push({ linha, mensagem: 'Os atributos precisam estar em JSON, como {"cor":"preto"}.' })
        return
      }
    }
    const textoFotos = valor('fotos')
    let fotos: unknown = textoFotos.split('|').map((f) => f.trim()).filter(Boolean)
    if (textoFotos.startsWith('[')) {
      try {
        fotos = JSON.parse(textoFotos)
      } catch {
        fotos = null
      }
    }
    const estoque = valor('estoque') === '' ? 0 : Number(valor('estoque'))
    const produto = validarProduto({
      nome: valor('nome'),
      descricao: valor('descricao'),
      categoria: valor('categoria'),
      precoCentavos,
      estoque,
      fotos,
      atributos,
    })
    if (typeof produto === 'string') {
      resultado.erros.push({ linha, mensagem: produto })
      return
    }
    // Um produto com o mesmo nome é atualizado, para reimportar a planilha corrigida.
    const existente = banco.produtos.find((p) => sem(p.nome) === sem(produto.nome))
    if (existente) Object.assign(existente, produto)
    else banco.produtos.push({ id: novoId('p'), ...produto })
    lembrarCategoria(produto.categoria)
    resultado.importados += 1
  })
  return ok(resultado)
}
