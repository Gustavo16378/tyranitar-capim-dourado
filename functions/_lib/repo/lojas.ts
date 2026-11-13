// SQL da tabela loja.
import { lerJson } from '../texto'

export interface LojaLinha {
  id: string
  nome: string
  piso: 1 | 2
  tipo: 'loja' | 'alimentacao'
  categorias: string
  mapa_id: string
}

/** Loja no formato da API. */
export function lojaParaApi(l: LojaLinha) {
  return { id: l.id, nome: l.nome, piso: l.piso, tipo: l.tipo, categorias: lerJson<string[]>(l.categorias, []), mapaId: l.mapa_id }
}

/** Lojas ativas (as vagas ficam de fora), com filtro opcional por piso e categoria. */
export async function listarLojas(
  db: D1Database,
  filtros: { piso?: number; categoria?: string },
  pagina: { tamanho: number; inicio: number },
) {
  const condicoes = ['ativa = 1']
  const valores: (string | number)[] = []
  if (filtros.piso !== undefined) condicoes.push(`piso = ?${valores.push(filtros.piso)}`)
  if (filtros.categoria) {
    condicoes.push(`EXISTS (SELECT 1 FROM json_each(loja.categorias) c WHERE c.value = ?${valores.push(filtros.categoria)})`)
  }
  const onde = condicoes.join(' AND ')
  const [itens, contagem] = await db.batch([
    db
      .prepare(
        `SELECT id, nome, piso, tipo, categorias, mapa_id FROM loja WHERE ${onde}
         ORDER BY piso, nome LIMIT ?${valores.length + 1} OFFSET ?${valores.length + 2}`,
      )
      .bind(...valores, pagina.tamanho, pagina.inicio),
    db.prepare(`SELECT count(*) AS total FROM loja WHERE ${onde}`).bind(...valores),
  ])
  return {
    itens: (itens.results as LojaLinha[]).map(lojaParaApi),
    total: (contagem.results[0] as { total: number }).total,
  }
}
