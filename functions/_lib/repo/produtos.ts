// SQL de produto (sempre com a loja). Só produtos ativos de lojas ativas aparecem.
import { lerJson } from '../texto'

export interface ProdutoLinha {
  id: string
  nome: string
  descricao: string
  categoria: string
  preco_centavos: number
  estoque: number
  fotos: string
  atributos: string
  loja_id: string
  loja_nome: string
  loja_piso: 1 | 2
  loja_mapa_id: string
}

const SELECAO = `
  SELECT p.id, p.nome, p.descricao, p.categoria, p.preco_centavos, p.estoque, p.fotos, p.atributos,
         l.id AS loja_id, l.nome AS loja_nome, l.piso AS loja_piso, l.mapa_id AS loja_mapa_id
  FROM produto p JOIN loja l ON l.id = p.loja_id
  WHERE p.ativo = 1 AND l.ativa = 1`

/** Produto resumido, como nas listas da API. */
export function produtoParaApi(p: ProdutoLinha) {
  return {
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    precoCentavos: p.preco_centavos,
    estoque: p.estoque,
    foto: lerJson<string[]>(p.fotos, [])[0] ?? null,
    loja: { id: p.loja_id, nome: p.loja_nome, piso: p.loja_piso, mapaId: p.loja_mapa_id },
  }
}

/** Produtos ativos com os filtros que o SQL resolve; o texto (q) é filtrado depois, no código. */
export async function listarProdutosAtivos(
  db: D1Database,
  filtros: { categoria?: string; lojaId?: string; precoMin?: number; precoMax?: number },
) {
  const condicoes: string[] = []
  const valores: (string | number)[] = []
  if (filtros.categoria) condicoes.push(`p.categoria = ?${valores.push(filtros.categoria)}`)
  if (filtros.lojaId) condicoes.push(`p.loja_id = ?${valores.push(filtros.lojaId)}`)
  if (filtros.precoMin !== undefined) condicoes.push(`p.preco_centavos >= ?${valores.push(filtros.precoMin)}`)
  if (filtros.precoMax !== undefined) condicoes.push(`p.preco_centavos <= ?${valores.push(filtros.precoMax)}`)
  const filtro = condicoes.map((c) => ` AND ${c}`).join('')
  const { results } = await db.prepare(`${SELECAO}${filtro} ORDER BY p.nome`).bind(...valores).all<ProdutoLinha>()
  return results
}

/** Categorias com produto ativo hoje, para a Capi corrigir uma categoria que não existe. */
export async function categoriasComProduto(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT p.categoria FROM produto p JOIN loja l ON l.id = p.loja_id
       WHERE p.ativo = 1 AND l.ativa = 1 ORDER BY p.categoria`,
    )
    .all<{ categoria: string }>()
  return results.map((r) => r.categoria)
}

/** Produtos salvos pelo cliente (ativos), do mais recente para o mais antigo. */
export async function listarFavoritos(db: D1Database, clienteId: string, pagina: { tamanho: number; inicio: number }) {
  const favoritos = `FROM favorito f WHERE f.cliente_id = ?1 AND f.produto_id = p.id`
  const [itens, contagem] = await db.batch([
    db
      .prepare(
        `${SELECAO} AND EXISTS (SELECT 1 ${favoritos})
         ORDER BY (SELECT f.criado_em ${favoritos}) DESC, p.nome LIMIT ?2 OFFSET ?3`,
      )
      .bind(clienteId, pagina.tamanho, pagina.inicio),
    db
      .prepare(
        `SELECT count(*) AS total FROM favorito f JOIN produto p ON p.id = f.produto_id JOIN loja l ON l.id = p.loja_id
         WHERE f.cliente_id = ?1 AND p.ativo = 1 AND l.ativa = 1`,
      )
      .bind(clienteId),
  ])
  return {
    itens: (itens.results as ProdutoLinha[]).map(produtoParaApi),
    total: (contagem.results[0] as { total: number }).total,
  }
}

/** O produto mesmo que tenha saído de linha (para mostrar numa reserva antiga). */
export function buscarProdutoQualquer(db: D1Database, id: string) {
  return db
    .prepare(SELECAO.replace('WHERE p.ativo = 1 AND l.ativa = 1', 'WHERE p.id = ?1'))
    .bind(id)
    .first<ProdutoLinha>()
}

export function buscarProdutoAtivo(db: D1Database, id: string) {
  return db.prepare(`${SELECAO} AND p.id = ?1`).bind(id).first<ProdutoLinha>()
}

/** O mesmo item ou parecidos (mesma categoria) em outras lojas: primeiro o mesmo nome, depois o preço mais perto. */
export async function emOutrasLojas(db: D1Database, produto: ProdutoLinha, limite = 3) {
  const { results } = await db
    .prepare(
      `${SELECAO} AND p.categoria = ?1 AND p.loja_id <> ?2
       ORDER BY (lower(p.nome) = lower(?3)) DESC, abs(p.preco_centavos - ?4) LIMIT ?5`,
    )
    .bind(produto.categoria, produto.loja_id, produto.nome, produto.preco_centavos, limite)
    .all<ProdutoLinha>()
  return results
}

/** Média, total e as avaliações mais recentes, só com o primeiro nome de quem avaliou. */
export async function avaliacoesDoProduto(db: D1Database, produtoId: string, limite = 10) {
  const [resumo, lista] = await db.batch([
    db.prepare('SELECT avg(nota) AS media, count(*) AS total FROM avaliacao WHERE produto_id = ?1').bind(produtoId),
    db
      .prepare(
        `SELECT a.nota, a.comentario, a.criado_em, u.nome FROM avaliacao a JOIN usuario u ON u.id = a.cliente_id
         WHERE a.produto_id = ?1 ORDER BY a.criado_em DESC LIMIT ?2`,
      )
      .bind(produtoId, limite),
  ])
  const { media, total } = resumo.results[0] as { media: number | null; total: number }
  return {
    media: media === null ? null : Math.round(media * 10) / 10,
    total,
    itens: (lista.results as { nota: number; comentario: string; criado_em: string; nome: string }[]).map((a) => ({
      nota: a.nota,
      comentario: a.comentario,
      criadoEm: a.criado_em,
      autor: a.nome.split(' ')[0],
    })),
  }
}
