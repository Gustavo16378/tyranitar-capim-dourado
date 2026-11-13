// SQL da ficha do cliente. Só é lida com consentimento (RN04, RNF06).

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
