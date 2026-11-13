// SQL de cupom e uso_cupom.
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
  loja_nome: string | null
  loja_mapa_id: string | null
  loja_categorias: string | null
}

/** Cupons ativos, ainda dentro da validade (hoje em Palmas), de lojas ativas ou do shopping. */
export async function listarCuponsVigentes(db: D1Database, hoje: string) {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.loja_id, c.titulo, c.tipo, c.valor, c.categoria_alvo, c.nivel_minimo,
              c.limite_por_cliente, c.validade,
              l.nome AS loja_nome, l.mapa_id AS loja_mapa_id, l.categorias AS loja_categorias
       FROM cupom c LEFT JOIN loja l ON l.id = c.loja_id
       WHERE c.ativo = 1 AND c.validade >= ?1 AND (c.loja_id IS NULL OR l.ativa = 1)
       ORDER BY c.validade, c.titulo`,
    )
    .bind(hoje)
    .all<CupomLinha>()
  return results
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
