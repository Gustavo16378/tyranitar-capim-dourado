// RN12: toda busca fica registrada para os relatórios de demanda (que nunca mostram quem buscou).

export function registrarBusca(
  db: D1Database,
  busca: { clienteId: string | null; termo: string; categoria: string | null; encontrou: boolean },
) {
  return db
    .prepare('INSERT INTO busca (id, cliente_id, termo, categoria, encontrou) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(crypto.randomUUID(), busca.clienteId, busca.termo, busca.categoria, busca.encontrou ? 1 : 0)
    .run()
}

// ---------- demanda (painel do shopping): contagens, nunca quem buscou ----------
// O termo é contado sem diferença de maiúsculas e espaços nas pontas.

/** Quantas buscas foram feitas desde a data (UTC, formato do SQLite), com e sem resultado. */
export async function contarBuscasDesde(db: D1Database, desde: string) {
  const linha = await db.prepare('SELECT count(*) AS buscas FROM busca WHERE criado_em >= ?1').bind(desde).first<{ buscas: number }>()
  return linha?.buscas ?? 0
}

/** Os termos mais buscados desde a data, com ou sem resultado. */
export async function termosMaisBuscados(db: D1Database, desde: string, limite: number) {
  const { results } = await db
    .prepare(
      `SELECT lower(trim(termo)) AS termo, count(*) AS buscas FROM busca WHERE criado_em >= ?1
       GROUP BY lower(trim(termo)) ORDER BY buscas DESC, termo LIMIT ?2`,
    )
    .bind(desde, limite)
    .all<{ termo: string; buscas: number }>()
  return results
}

/** As buscas sem resultado em nenhuma loja desde a data, por categoria e termo (RN12). */
export async function buscasSemResultado(db: D1Database, desde: string) {
  const { results } = await db
    .prepare(
      `SELECT categoria, lower(trim(termo)) AS termo, count(*) AS buscas FROM busca
       WHERE encontrou = 0 AND categoria IS NOT NULL AND criado_em >= ?1
       GROUP BY categoria, lower(trim(termo)) ORDER BY buscas DESC, termo`,
    )
    .bind(desde)
    .all<{ categoria: string; termo: string; buscas: number }>()
  return results
}
