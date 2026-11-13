// SQL da ficha do cliente. Só é lida e gravada com consentimento (RN04, RNF06).
import { juntarInteresses, type Interesse } from '../regras/ficha'
import { lerJson } from '../texto'

/** Categorias de interesse do cliente; vazio se ele não deu consentimento. */
export async function categoriasDaFicha(db: D1Database, clienteId: string): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT json_extract(i.value, '$.categoria') AS categoria
       FROM ficha f JOIN usuario u ON u.id = f.cliente_id, json_each(f.interesses) i
       WHERE f.cliente_id = ?1 AND u.consentimento_ficha = 1`,
    )
    .bind(clienteId)
    .all<{ categoria: string | null }>()
  return results.flatMap((r) => (r.categoria ? [r.categoria] : []))
}

/**
 * Acrescenta interesses à ficha (a Capi chama isto pela ferramenta gerar_ficha). Sem
 * consentimento nada é gravado e a função devolve false.
 */
export async function acrescentarInteresses(db: D1Database, clienteId: string, novos: Interesse[]): Promise<boolean> {
  const atual = await db
    .prepare(
      `SELECT f.interesses FROM usuario u LEFT JOIN ficha f ON f.cliente_id = u.id
       WHERE u.id = ?1 AND u.consentimento_ficha = 1`,
    )
    .bind(clienteId)
    .first<{ interesses: string | null }>()
  if (!atual) return false
  const interesses = juntarInteresses(lerJson<Interesse[]>(atual.interesses, []), novos)
  // O consentimento é conferido de novo no próprio INSERT, para valer mesmo se mudou no meio.
  const { meta } = await db
    .prepare(
      `INSERT INTO ficha (cliente_id, interesses, atualizado_em)
       SELECT id, ?2, datetime('now') FROM usuario WHERE id = ?1 AND consentimento_ficha = 1
       ON CONFLICT (cliente_id) DO UPDATE SET interesses = excluded.interesses, atualizado_em = excluded.atualizado_em`,
    )
    .bind(clienteId, JSON.stringify(interesses))
    .run()
  return meta.changes > 0
}
