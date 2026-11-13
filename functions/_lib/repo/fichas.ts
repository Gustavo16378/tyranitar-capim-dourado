// SQL da ficha do cliente. Só é lida e gravada com consentimento (RN04, RNF06).
import { deSqlite } from '../regras/datas'
import { idDoInteresse, juntarInteresses, removerInteresse, type Interesse } from '../regras/ficha'
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

/** Os interesses da ficha; vazio sem consentimento. */
export async function interessesDoCliente(db: D1Database, clienteId: string): Promise<Interesse[]> {
  const linha = await db
    .prepare(
      `SELECT f.interesses FROM ficha f JOIN usuario u ON u.id = f.cliente_id
       WHERE f.cliente_id = ?1 AND u.consentimento_ficha = 1`,
    )
    .bind(clienteId)
    .first<{ interesses: string }>()
  return lerJson<Interesse[]>(linha?.interesses, [])
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

/**
 * A ficha como o cliente vê na Minha conta: cada interesse com o id para apagar e quando a Capi
 * anotou por último. Sem consentimento, vazia (a ficha foi apagada quando ele desligou).
 */
export async function fichaParaOCliente(db: D1Database, clienteId: string) {
  const linha = await db
    .prepare(
      `SELECT u.consentimento_ficha, f.interesses, f.atualizado_em
       FROM usuario u LEFT JOIN ficha f ON f.cliente_id = u.id AND u.consentimento_ficha = 1
       WHERE u.id = ?1`,
    )
    .bind(clienteId)
    .first<{ consentimento_ficha: 0 | 1; interesses: string | null; atualizado_em: string | null }>()
  const interesses = lerJson<Interesse[]>(linha?.interesses, [])
  return {
    compartilharFicha: linha?.consentimento_ficha === 1,
    interesses: interesses.map((i) => ({ id: idDoInteresse(i), categoria: i.categoria, detalhe: i.detalhe })),
    atualizadaEm: linha?.atualizado_em ? deSqlite(linha.atualizado_em).toISOString() : null,
  }
}

/**
 * Apaga um interesse da ficha (o cliente, na Minha conta). Devolve false se ele não estava lá.
 * A Capi pode anotar ao mesmo tempo: a gravação só vale se a ficha ainda é a que foi lida; se
 * mudou no meio, lê de novo e tenta outra vez.
 */
export async function apagarInteresse(db: D1Database, clienteId: string, id: string): Promise<boolean> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const atual = await db
      .prepare('SELECT interesses FROM ficha WHERE cliente_id = ?1')
      .bind(clienteId)
      .first<{ interesses: string }>()
    if (!atual) return false
    const { restantes, removido } = removerInteresse(lerJson<Interesse[]>(atual.interesses, []), id)
    if (!removido) return false
    const { meta } = await db
      .prepare(
        `UPDATE ficha SET interesses = ?3, atualizado_em = datetime('now')
         WHERE cliente_id = ?1 AND interesses = ?2`,
      )
      .bind(clienteId, atual.interesses, JSON.stringify(restantes))
      .run()
    if (meta.changes > 0) return true
  }
  throw new Error('A ficha mudou três vezes seguidas enquanto um interesse era apagado')
}
