// O catálogo da loja no painel (RF21, RF22): listar, criar, editar e importar por CSV.
// Toda consulta filtra pela loja do token; o id de um produto de outra loja responde 404.
import { ErroApi } from '../erros'
import { CATEGORIAS_DO_SHOPPING, ehCategoria } from '../regras/categorias'
import { lerJson, normalizar } from '../texto'

export interface ProdutoDaLoja {
  id: string
  nome: string
  descricao: string
  categoria: string
  precoCentavos: number
  estoque: number
  fotos: string[]
  atributos: Record<string, unknown>
  ativo: boolean
}

export type PedidoProduto = Omit<ProdutoDaLoja, 'id'>

interface ProdutoLinha {
  id: string
  nome: string
  descricao: string
  categoria: string
  preco_centavos: number
  estoque: number
  fotos: string
  atributos: string
  ativo: number
}

export const MAXIMO_DE_FOTOS = 8
const TAMANHO_MAXIMO_DA_FOTO = 500

function paraApi(p: ProdutoLinha): ProdutoDaLoja {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    precoCentavos: p.preco_centavos,
    estoque: p.estoque,
    fotos: lerJson<string[]>(p.fotos, []),
    atributos: lerJson<Record<string, unknown>>(p.atributos, {}),
    ativo: p.ativo === 1,
  }
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * Endereço de foto aceito: https:// de outro site ou um caminho do próprio site, como
 * /produtos/tenis-de-corrida.webp (as fotos da demonstração ficam em public/produtos).
 */
export function fotoValida(foto: string) {
  if (!foto || foto.length > TAMANHO_MAXIMO_DA_FOTO || /\s/.test(foto)) return false
  if (foto.startsWith('/')) return !foto.startsWith('//')
  try {
    const url = new URL(foto)
    return url.protocol === 'https:' && url.hostname !== ''
  } catch {
    return false
  }
}

/** O produto do corpo, limpo, ou a frase do primeiro problema (a importação junta as frases por linha). */
export function validarProduto(corpo: unknown): PedidoProduto | string {
  if (!ehObjeto(corpo)) return 'Envie o produto em JSON.'
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : ''
  if (nome.length < 2 || nome.length > 120) return 'O nome precisa ter de 2 a 120 caracteres.'
  const descricao = typeof corpo.descricao === 'string' ? corpo.descricao.trim() : ''
  if (descricao.length > 2000) return 'A descrição aceita até 2000 caracteres.'
  if (!ehCategoria(corpo.categoria)) {
    return `Categoria desconhecida. Use: ${CATEGORIAS_DO_SHOPPING.map((c) => c.id).join(', ')}.`
  }
  const { precoCentavos, estoque } = corpo
  if (typeof precoCentavos !== 'number' || !Number.isInteger(precoCentavos) || precoCentavos <= 0) {
    return 'O preço precisa ser maior que zero.'
  }
  if (typeof estoque !== 'number' || !Number.isInteger(estoque) || estoque < 0) {
    return 'O estoque precisa ser um número inteiro, zero ou mais.'
  }
  const fotos = corpo.fotos ?? []
  if (!Array.isArray(fotos) || fotos.some((f) => typeof f !== 'string')) return 'As fotos vão como uma lista de endereços.'
  const limpas = (fotos as string[]).map((f) => f.trim()).filter(Boolean)
  if (limpas.length > MAXIMO_DE_FOTOS) return `Cada produto aceita até ${MAXIMO_DE_FOTOS} fotos.`
  if (limpas.some((f) => !fotoValida(f))) {
    return 'Use fotos com endereço https:// ou um caminho do site, como /produtos/tenis.webp.'
  }
  const atributos = corpo.atributos ?? {}
  if (!ehObjeto(atributos)) return 'Os atributos vão como um objeto JSON.'
  if (JSON.stringify(atributos).length > 2000) return 'Os atributos aceitam até 2000 caracteres em JSON.'
  return {
    nome,
    descricao,
    categoria: corpo.categoria,
    precoCentavos,
    estoque,
    fotos: limpas,
    atributos,
    ativo: corpo.ativo !== false,
  }
}

/** Valida e devolve o produto, ou responde 400 com a frase do problema. */
export function exigirProduto(corpo: unknown): PedidoProduto {
  const produto = validarProduto(corpo)
  if (typeof produto === 'string') throw new ErroApi('DADOS_INVALIDOS', produto)
  return produto
}

const SELECAO = `SELECT id, nome, descricao, categoria, preco_centavos, estoque, fotos, atributos, ativo FROM produto`

async function produtosDaLoja(db: D1Database, lojaId: string) {
  const { results } = await db.prepare(`${SELECAO} WHERE loja_id = ?1`).bind(lojaId).all<ProdutoLinha>()
  return results.map(paraApi)
}

/** Ativos antes dos inativos, em ordem alfabética; q acha o nome sem diferenciar acento. */
export async function listarCatalogo(
  db: D1Database,
  lojaId: string,
  q: string,
  pagina: { tamanho: number; inicio: number },
) {
  const termo = normalizar(q.trim())
  const filtrados = (await produtosDaLoja(db, lojaId))
    .filter((p) => !termo || normalizar(p.nome).includes(termo))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { itens: filtrados.slice(pagina.inicio, pagina.inicio + pagina.tamanho), total: filtrados.length }
}

function inserir(db: D1Database, lojaId: string, id: string, p: PedidoProduto) {
  return db
    .prepare(
      `INSERT INTO produto (id, loja_id, nome, descricao, categoria, preco_centavos, estoque, fotos, atributos, ativo)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(id, lojaId, p.nome, p.descricao, p.categoria, p.precoCentavos, p.estoque, JSON.stringify(p.fotos), JSON.stringify(p.atributos), p.ativo ? 1 : 0)
}

function atualizar(db: D1Database, lojaId: string, id: string, p: PedidoProduto) {
  return db
    .prepare(
      `UPDATE produto SET nome = ?3, descricao = ?4, categoria = ?5, preco_centavos = ?6, estoque = ?7,
              fotos = ?8, atributos = ?9, ativo = ?10, atualizado_em = datetime('now')
       WHERE id = ?1 AND loja_id = ?2`,
    )
    .bind(id, lojaId, p.nome, p.descricao, p.categoria, p.precoCentavos, p.estoque, JSON.stringify(p.fotos), JSON.stringify(p.atributos), p.ativo ? 1 : 0)
}

/** Categoria nova no catálogo passa a valer para o filtro da ficha no balcão (RN04). */
function lembrarCategoria(db: D1Database, lojaId: string, categoria: string) {
  return db
    .prepare(
      `UPDATE loja SET categorias = json_insert(categorias, '$[#]', ?2)
       WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM json_each(loja.categorias) WHERE value = ?2)`,
    )
    .bind(lojaId, categoria)
}

async function buscarDaLoja(db: D1Database, lojaId: string, id: string) {
  const linha = await db.prepare(`${SELECAO} WHERE id = ?1 AND loja_id = ?2`).bind(id, lojaId).first<ProdutoLinha>()
  return linha ? paraApi(linha) : null
}

export async function criarProduto(db: D1Database, lojaId: string, produto: PedidoProduto) {
  const id = crypto.randomUUID()
  await db.batch([inserir(db, lojaId, id, produto), lembrarCategoria(db, lojaId, produto.categoria)])
  return (await buscarDaLoja(db, lojaId, id))!
}

export async function editarProduto(db: D1Database, lojaId: string, id: string, produto: PedidoProduto) {
  if (!(await buscarDaLoja(db, lojaId, id))) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não existe nesta loja.')
  await db.batch([atualizar(db, lojaId, id, produto), lembrarCategoria(db, lojaId, produto.categoria)])
  return (await buscarDaLoja(db, lojaId, id))!
}

// ---------- importação por CSV (RF22) ----------

const COLUNAS = ['nome', 'descricao', 'categoria', 'preco', 'estoque', 'fotos', 'atributos'] as const
export const LINHAS_MAXIMAS = 1000

/** Lê um CSV com vírgula, aspas e "" dentro das aspas. Linhas em branco ficam de fora. */
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

/** "399,90", "R$ 1.299,90" ou "399.90" em centavos; null se não der para ler. */
export function lerPreco(texto: string): number | null {
  let limpo = texto.replace(/R\$/i, '').replace(/\s/g, '')
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  return Math.round(Number(limpo) * 100)
}

export interface ResultadoImportacao {
  importados: number
  erros: { linha: number; mensagem: string }[]
}

/**
 * Salva as linhas boas da planilha; as com erro voltam com o número da linha (o cabeçalho é a 1).
 * Um nome que já está no catálogo atualiza o produto, para dar para reimportar a planilha corrigida.
 */
export async function importarCsv(db: D1Database, lojaId: string, csv: string): Promise<ResultadoImportacao> {
  const [cabecalho = [], ...linhas] = lerCsv(csv)
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [normalizar(nome.trim()), i]))
  const faltando = COLUNAS.filter((coluna) => indice[coluna] === undefined)
  if (faltando.length) {
    throw new ErroApi('DADOS_INVALIDOS', `A planilha precisa das colunas: ${COLUNAS.join(',')}. Faltou: ${faltando.join(', ')}.`)
  }
  if (linhas.length > LINHAS_MAXIMAS) {
    throw new ErroApi('DADOS_INVALIDOS', `A planilha aceita até ${LINHAS_MAXIMAS} produtos por vez.`)
  }

  const porNome = new Map((await produtosDaLoja(db, lojaId)).map((p) => [normalizar(p.nome), p.id]))
  const resultado: ResultadoImportacao = { importados: 0, erros: [] }
  const comandos: D1PreparedStatement[] = []
  const categorias = new Set<string>()

  linhas.forEach((celulas, i) => {
    const linha = i + 2
    const valor = (coluna: (typeof COLUNAS)[number]) => (celulas[indice[coluna]] ?? '').trim()
    const precoCentavos = lerPreco(valor('preco'))
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
    if (textoFotos.startsWith('[')) fotos = lerJson<unknown>(textoFotos, null)
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
    const chave = normalizar(produto.nome)
    const existente = porNome.get(chave)
    if (existente) comandos.push(atualizar(db, lojaId, existente, produto))
    else {
      const id = crypto.randomUUID()
      porNome.set(chave, id)
      comandos.push(inserir(db, lojaId, id, produto))
    }
    categorias.add(produto.categoria)
    resultado.importados += 1
  })

  for (const categoria of categorias) comandos.push(lembrarCategoria(db, lojaId, categoria))
  if (comandos.length) await db.batch(comandos)
  return resultado
}
