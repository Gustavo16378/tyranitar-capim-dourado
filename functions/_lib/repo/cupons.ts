// SQL de cupom e uso_cupom.
import type { Cupom } from '../regras/cupons'
import type { NivelFidelidade } from '../regras/niveis'

export interface CupomLinha {
  id: string
  loja_id: string | null
  titulo: string
  tipo: 'PERCENTUAL' | 'VALOR' | 'BRINDE'
  valor: number
  categoria_alvo: string | null
  nivel_minimo: NivelFidelidade
  limite_por_cliente: number
  validade: string
  ativo: 0 | 1
  loja_nome: string | null
  loja_mapa_id: string | null
  loja_categorias: string | null
}

const SELECAO = `
  SELECT c.id, c.loja_id, c.titulo, c.tipo, c.valor, c.categoria_alvo, c.nivel_minimo,
         c.limite_por_cliente, c.validade, c.ativo,
         l.nome AS loja_nome, l.mapa_id AS loja_mapa_id, l.categorias AS loja_categorias
  FROM cupom c LEFT JOIN loja l ON l.id = c.loja_id`

/** Os campos que clienteVeCupom (regras/cupons.ts) usa. */
export function paraVisibilidade(c: CupomLinha) {
  return { id: c.id, nivelMinimo: c.nivel_minimo, limitePorCliente: c.limite_por_cliente, categoriaAlvo: c.categoria_alvo }
}

/** Cupom do banco no formato das regras (regras/cupons.ts). */
export function paraRegra(c: CupomLinha): Cupom {
  return {
    id: c.id,
    titulo: c.titulo,
    lojaId: c.loja_id,
    tipo: c.tipo,
    valor: c.valor,
    nivelMinimo: c.nivel_minimo,
    limitePorCliente: c.limite_por_cliente,
    validade: c.validade,
    ativo: c.ativo === 1,
  }
}

/** Cupons ativos, ainda dentro da validade (hoje em Palmas), de lojas ativas ou do shopping. */
export async function listarCuponsVigentes(db: D1Database, hoje: string) {
  const { results } = await db
    .prepare(
      `${SELECAO}
       WHERE c.ativo = 1 AND c.validade >= ?1 AND (c.loja_id IS NULL OR l.ativa = 1)
       ORDER BY c.validade, c.titulo`,
    )
    .bind(hoje)
    .all<CupomLinha>()
  return results
}

/** Cupons vigentes que valem nesta loja: os dela primeiro, depois os vouchers do shopping. */
export async function cuponsVigentesNaLoja(db: D1Database, lojaId: string, hoje: string) {
  const { results } = await db
    .prepare(
      `${SELECAO}
       WHERE c.ativo = 1 AND c.validade >= ?2 AND (c.loja_id = ?1 OR c.loja_id IS NULL)
       ORDER BY (c.loja_id IS NULL), c.validade, c.titulo`,
    )
    .bind(lojaId, hoje)
    .all<CupomLinha>()
  return results
}

/** Os cupons pedidos, na ordem em que vieram (ids que não existem ficam de fora). */
export async function cuponsPorIds(db: D1Database, ids: string[]) {
  if (!ids.length) return []
  const { results } = await db
    .prepare(`${SELECAO} WHERE c.id IN (SELECT value FROM json_each(?1))`)
    .bind(JSON.stringify(ids))
    .all<CupomLinha>()
  return ids.flatMap((id) => results.filter((c) => c.id === id))
}

/** Quantas vezes o cliente já usou cada cupom (RN06). */
export async function usosDoCliente(db: D1Database, clienteId: string): Promise<Record<string, number>> {
  const { results } = await db
    .prepare(
      `SELECT u.cupom_id, count(*) AS usos FROM uso_cupom u JOIN compra c ON c.id = u.compra_id
       WHERE c.cliente_id = ?1 GROUP BY u.cupom_id`,
    )
    .bind(clienteId)
    .all<{ cupom_id: string; usos: number }>()
  return Object.fromEntries(results.map((r) => [r.cupom_id, r.usos]))
}

// ---------- painéis: os cupons de uma loja ou os vouchers do shopping, com o uso ----------

export interface CupomComUsoLinha {
  id: string
  titulo: string
  tipo: 'PERCENTUAL' | 'VALOR' | 'BRINDE'
  valor: number
  categoria_alvo: string | null
  nivel_minimo: NivelFidelidade
  limite_por_cliente: number
  validade: string
  ativo: 0 | 1
  usos: number
  desconto_centavos: number
}

const SELECAO_COM_USO = `
  SELECT c.id, c.titulo, c.tipo, c.valor, c.categoria_alvo, c.nivel_minimo, c.limite_por_cliente, c.validade, c.ativo,
         (SELECT count(*) FROM uso_cupom u WHERE u.cupom_id = c.id) AS usos,
         (SELECT COALESCE(sum(u.desconto_centavos), 0) FROM uso_cupom u WHERE u.cupom_id = c.id) AS desconto_centavos
  FROM cupom c`

/** Cupom no formato dos painéis (GET /api/loja/cupons e GET /api/shopping/cupons). */
export function cupomComUsoParaApi(c: CupomComUsoLinha) {
  return {
    id: c.id,
    titulo: c.titulo,
    tipo: c.tipo,
    valor: c.valor,
    categoriaAlvo: c.categoria_alvo,
    nivelMinimo: c.nivel_minimo,
    limitePorCliente: c.limite_por_cliente,
    validade: c.validade,
    ativo: c.ativo === 1,
    usos: c.usos,
    descontoCentavos: c.desconto_centavos,
  }
}

/**
 * Os cupons de uma loja (lojaId) ou os vouchers do shopping (null), com quantas compras usaram
 * cada um e o desconto que deram. Os que valem hoje primeiro; os que vencem antes no topo.
 */
export async function cuponsComUso(db: D1Database, lojaId: string | null, hoje: string) {
  const { results } = await db
    .prepare(
      `${SELECAO_COM_USO} WHERE c.loja_id IS ?1
       ORDER BY (c.ativo = 1 AND c.validade >= ?2) DESC, c.validade, c.titulo`,
    )
    .bind(lojaId, hoje)
    .all<CupomComUsoLinha>()
  return results
}

export function buscarCupomComUso(db: D1Database, id: string) {
  return db.prepare(`${SELECAO_COM_USO} WHERE c.id = ?1`).bind(id).first<CupomComUsoLinha>()
}

export interface NovoCupom {
  titulo: string
  tipo: 'PERCENTUAL' | 'VALOR' | 'BRINDE'
  valor: number
  categoriaAlvo: string | null
  nivelMinimo: NivelFidelidade
  limitePorCliente: number
  validade: string
}

/** Grava um cupom da loja (lojaId) ou um voucher do shopping (null). Devolve o id. */
export async function criarCupom(db: D1Database, lojaId: string | null, c: NovoCupom) {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO cupom (id, loja_id, titulo, tipo, valor, categoria_alvo, nivel_minimo, limite_por_cliente, validade)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(id, lojaId, c.titulo, c.tipo, c.valor, c.categoriaAlvo, c.nivelMinimo, c.limitePorCliente, c.validade)
    .run()
  return id
}
