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
