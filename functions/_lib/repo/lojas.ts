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

export function buscarLojaAtiva(db: D1Database, id: string) {
  return db
    .prepare('SELECT id, nome, piso, tipo, categorias, mapa_id FROM loja WHERE id = ?1 AND ativa = 1')
    .bind(id)
    .first<LojaLinha>()
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

// ---------- painel do shopping: as unidades da planta, vagas incluídas ----------

/** Número da unidade: o da coluna ou, numa unidade gravada sem ele, o do mapa_id ("loja-47" → "47"). */
export const NUMERO_DA_UNIDADE = `COALESCE(l.numero, upper(CASE WHEN l.mapa_id LIKE 'loja-%' THEN substr(l.mapa_id, 6) ELSE l.mapa_id END))`

export interface UnidadeLinha extends LojaLinha {
  numero: string
  area_m2: number | null
  cnpj: string | null
  ativa: 0 | 1
  lojistas: number
}

const SELECAO_UNIDADE = `
  SELECT l.id, l.nome, ${NUMERO_DA_UNIDADE} AS numero, l.area_m2, l.cnpj, l.piso, l.tipo, l.categorias, l.mapa_id, l.ativa,
         (SELECT count(*) FROM usuario u WHERE u.loja_id = l.id AND u.perfil = 'LOJISTA') AS lojistas
  FROM loja l`

/** "LOJA 47", como na planta e nas telas. */
export const nomeDaUnidade = (numero: string) => `LOJA ${numero}`

/** Unidade no formato do painel do shopping (GET /api/shopping/lojas). Vaga: nome "Vaga", sem CNPJ. */
export function unidadeParaApi(l: UnidadeLinha) {
  const ativa = l.ativa === 1
  return {
    id: l.id,
    nome: ativa ? l.nome : 'Vaga',
    unidade: nomeDaUnidade(l.numero),
    piso: l.piso,
    areaM2: l.area_m2,
    tipo: l.tipo,
    categorias: lerJson<string[]>(l.categorias, []),
    mapaId: l.mapa_id,
    cnpj: ativa ? l.cnpj : null,
    ativa,
    lojistas: l.lojistas,
  }
}

/** Todas as unidades da planta, ativas e vagas (umas centenas: o filtro e a ordem ficam no código). */
export async function listarUnidades(db: D1Database) {
  const { results } = await db.prepare(SELECAO_UNIDADE).all<UnidadeLinha>()
  return results
}

export function buscarUnidade(db: D1Database, id: string) {
  return db.prepare(`${SELECAO_UNIDADE} WHERE l.id = ?1`).bind(id).first<UnidadeLinha>()
}

/** Outra unidade já tem este CNPJ? */
export async function cnpjEmUso(db: D1Database, cnpj: string, foraDe?: string) {
  const linha = await db
    .prepare('SELECT 1 AS sim FROM loja WHERE cnpj = ?1 AND id IS NOT ?2')
    .bind(cnpj, foraDe ?? null)
    .first<{ sim: number }>()
  return linha !== null
}

export interface DadosDaLoja {
  nome: string
  cnpj: string
  tipo: 'loja' | 'alimentacao'
  categorias: string[]
}

/** Ocupa a unidade (ou edita a loja que está nela). */
export function ocuparUnidade(db: D1Database, id: string, loja: DadosDaLoja) {
  return db
    .prepare('UPDATE loja SET nome = ?2, cnpj = ?3, tipo = ?4, categorias = ?5, ativa = 1 WHERE id = ?1')
    .bind(id, loja.nome, loja.cnpj, loja.tipo, JSON.stringify(loja.categorias))
    .run()
}

/**
 * A loja sai e a unidade volta a ser vaga: sem nome, CNPJ nem categorias, e os lojistas dela
 * perdem o acesso (as contas são apagadas, com os avisos; as buscas ficam, sem o autor). Os
 * produtos e cupons ficam no banco, mas somem do app porque a loja não está ativa.
 */
export async function liberarUnidade(db: D1Database, id: string) {
  const lojistas = "SELECT id FROM usuario WHERE loja_id = ?1 AND perfil = 'LOJISTA'"
  await db.batch([
    db.prepare(`DELETE FROM notificacao WHERE usuario_id IN (${lojistas})`).bind(id),
    db.prepare(`UPDATE busca SET cliente_id = NULL WHERE cliente_id IN (${lojistas})`).bind(id),
    db.prepare("DELETE FROM usuario WHERE loja_id = ?1 AND perfil = 'LOJISTA'").bind(id),
    db.prepare("UPDATE loja SET nome = 'Vaga', cnpj = NULL, categorias = '[]', ativa = 0 WHERE id = ?1").bind(id),
  ])
}

export interface NovaUnidade {
  numero: string
  piso: 1 | 2
  areaM2: number | null
  mapaId: string
  tipo: 'loja' | 'alimentacao'
  /** null: a unidade nasce vaga. */
  loja: DadosDaLoja | null
}

/** Uma unidade nova na planta. Devolve o id. */
export async function criarUnidade(db: D1Database, u: NovaUnidade) {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO loja (id, nome, numero, area_m2, cnpj, piso, tipo, categorias, mapa_id, ativa)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(
      id,
      u.loja?.nome ?? 'Vaga',
      u.numero,
      u.areaM2,
      u.loja?.cnpj ?? null,
      u.piso,
      u.loja?.tipo ?? u.tipo,
      JSON.stringify(u.loja?.categorias ?? []),
      u.mapaId,
      u.loja ? 1 : 0,
    )
    .run()
  return id
}

/** A unidade já existe na planta (pelo número ou pelo id do polígono)? */
export async function unidadeExiste(db: D1Database, numero: string, mapaId: string) {
  const linha = await db
    .prepare(`SELECT 1 AS sim FROM loja l WHERE ${NUMERO_DA_UNIDADE} = ?1 OR l.mapa_id = ?2`)
    .bind(numero, mapaId)
    .first<{ sim: number }>()
  return linha !== null
}
