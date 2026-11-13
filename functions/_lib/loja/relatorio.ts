// O relatório de desempenho da loja (RF24), no formato de GET /api/loja/relatorios. Tudo sai do
// banco, do período pedido. A compra não guarda os itens: "mais vendidos" e "parados" contam as
// retiradas de reserva (a compra ligada a uma reserva diz o produto e a quantidade).
// As buscas nunca dizem quem buscou (RN12); o comparativo só aparece com 3 lojas ou mais na
// categoria (RN13).
import { lerJson } from '../texto'
import { deSqlite, paraSqlite } from '../regras/datas'
import { inicioDoPeriodo, type Periodo } from '../regras/periodo'

const LIMITE = 5
/** Lojas mínimas na categoria para comparar o ticket médio (RN13). */
const LOJAS_PARA_COMPARAR = 3
const DIA_MS = 24 * 60 * 60 * 1000

/** Termos das buscas nas categorias da loja, com ou sem resultado. */
async function buscasNasCategorias(db: D1Database, categorias: string[], desde: string, soSemResultado: boolean) {
  if (!categorias.length) return []
  const { results } = await db
    .prepare(
      `SELECT lower(trim(termo)) AS termo, count(*) AS buscas FROM busca
       WHERE criado_em >= ?1 AND categoria IN (SELECT value FROM json_each(?2)) ${soSemResultado ? 'AND encontrou = 0' : ''}
       GROUP BY lower(trim(termo)) ORDER BY buscas DESC, termo LIMIT ?3`,
    )
    .bind(desde, JSON.stringify(categorias), LIMITE)
    .all<{ termo: string; buscas: number }>()
  return results
}

/** Ticket médio das compras de um conjunto de lojas no período; null sem compras. */
const media = (soma: number | null, n: number) => (n > 0 && soma !== null ? Math.round(soma / n) : null)

export async function montarRelatorio(db: D1Database, lojaId: string, periodo: Periodo, agora = new Date()) {
  const desde = paraSqlite(inicioDoPeriodo(periodo, agora))
  const loja = await db.prepare('SELECT categorias FROM loja WHERE id = ?1').bind(lojaId).first<{ categorias: string }>()
  const categorias = lerJson<string[]>(loja?.categorias, [])

  const [vendidos, parados, picos, cupons, ticket, reservas] = await db.batch([
    db
      .prepare(
        `SELECT p.id AS produto_id, p.nome, sum(r.quantidade) AS quantidade, sum(r.quantidade * r.preco_centavos) AS valor
         FROM compra c JOIN reserva r ON r.id = c.reserva_id JOIN produto p ON p.id = r.produto_id
         WHERE c.loja_id = ?1 AND c.criado_em >= ?2
         GROUP BY p.id ORDER BY quantidade DESC, valor DESC, p.nome LIMIT ?3`,
      )
      .bind(lojaId, desde, LIMITE),
    // Ativos com estoque e sem venda no período; a referência é a última venda ou o cadastro.
    db
      .prepare(
        `SELECT p.id AS produto_id, p.nome, p.estoque,
                COALESCE((SELECT max(c.criado_em) FROM compra c JOIN reserva r ON r.id = c.reserva_id
                          WHERE r.produto_id = p.id), p.atualizado_em) AS desde
         FROM produto p WHERE p.loja_id = ?1 AND p.ativo = 1 AND p.estoque > 0
           AND NOT EXISTS (SELECT 1 FROM compra c JOIN reserva r ON r.id = c.reserva_id
                           WHERE r.produto_id = p.id AND c.criado_em >= ?2)
         ORDER BY desde, p.nome LIMIT ?3`,
      )
      .bind(lojaId, desde, LIMITE),
    // Dia da semana (0 é domingo) e hora em Palmas (UTC-3, sem horário de verão).
    db
      .prepare(
        `SELECT CAST(strftime('%w', criado_em, '-3 hours') AS INTEGER) AS dia,
                CAST(strftime('%H', criado_em, '-3 hours') AS INTEGER) AS hora, count(*) AS compras
         FROM compra WHERE loja_id = ?1 AND criado_em >= ?2
         GROUP BY dia, hora ORDER BY dia, hora`,
      )
      .bind(lojaId, desde),
    db
      .prepare(
        `SELECT k.id AS cupom_id, k.titulo, count(*) AS usos, sum(u.desconto_centavos) AS desconto
         FROM uso_cupom u JOIN cupom k ON k.id = u.cupom_id JOIN compra c ON c.id = u.compra_id
         WHERE k.loja_id = ?1 AND c.criado_em >= ?2
         GROUP BY k.id ORDER BY usos DESC, desconto DESC, k.titulo`,
      )
      .bind(lojaId, desde),
    db
      .prepare(
        `SELECT sum(CASE WHEN com_ficha = 1 THEN valor_centavos END) AS soma_com, sum(com_ficha = 1) AS n_com,
                sum(CASE WHEN com_ficha = 0 THEN valor_centavos END) AS soma_sem, sum(com_ficha = 0) AS n_sem,
                sum(valor_centavos) AS soma, count(*) AS n
         FROM compra WHERE loja_id = ?1 AND criado_em >= ?2 AND valor_centavos > 0`,
      )
      .bind(lojaId, desde),
    db
      .prepare(
        `SELECT sum(status = 'RETIRADA') AS retiradas, sum(status IN ('PENDENTE', 'CONFIRMADA', 'SEPARADA')) AS em_aberto,
                sum(status = 'CANCELADA') AS canceladas, sum(status = 'EXPIRADA') AS expiradas
         FROM reserva WHERE loja_id = ?1 AND criado_em >= ?2`,
      )
      .bind(lojaId, desde),
  ])

  const t = (ticket.results[0] ?? {}) as Record<string, number | null>
  const r = (reservas.results[0] ?? {}) as Record<string, number | null>
  const contagem = {
    retiradas: r.retiradas ?? 0,
    emAberto: r.em_aberto ?? 0,
    canceladas: r.canceladas ?? 0,
    expiradas: r.expiradas ?? 0,
  }
  const [maisBuscados, naoEncontrados] = await Promise.all([
    buscasNasCategorias(db, categorias, desde, false),
    buscasNasCategorias(db, categorias, desde, true),
  ])

  return {
    periodo,
    maisVendidos: (vendidos.results as { produto_id: string; nome: string; quantidade: number; valor: number }[]).map((v) => ({
      produtoId: v.produto_id,
      nome: v.nome,
      quantidade: v.quantidade,
      valorCentavos: v.valor,
    })),
    maisBuscados,
    naoEncontrados,
    parados: (parados.results as { produto_id: string; nome: string; estoque: number; desde: string }[]).map((p) => ({
      produtoId: p.produto_id,
      nome: p.nome,
      estoque: p.estoque,
      diasSemVenda: Math.max(0, Math.floor((agora.getTime() - deSqlite(p.desde).getTime()) / DIA_MS)),
    })),
    picos: (picos.results as { dia: number; hora: number; compras: number }[]).map((p) => ({
      diaDaSemana: p.dia,
      hora: p.hora,
      compras: p.compras,
    })),
    cupons: (cupons.results as { cupom_id: string; titulo: string; usos: number; desconto: number }[]).map((c) => ({
      cupomId: c.cupom_id,
      titulo: c.titulo,
      usos: c.usos,
      descontoCentavos: c.desconto,
    })),
    ticketMedio: {
      comFichaCentavos: media(t.soma_com, t.n_com ?? 0),
      semFichaCentavos: media(t.soma_sem, t.n_sem ?? 0),
    },
    comparativoCategoria: await comparativo(db, categorias, desde, media(t.soma, t.n ?? 0)),
    reservas: { feitas: contagem.retiradas + contagem.emAberto + contagem.canceladas + contagem.expiradas, ...contagem },
  }
}

/**
 * O ticket médio da loja ao lado do das lojas ativas da mesma categoria, só nas categorias com
 * 3 lojas ou mais (RN13). null quando nenhuma categoria da loja dá para comparar.
 */
async function comparativo(db: D1Database, categorias: string[], desde: string, ticketDaLoja: number | null) {
  if (!categorias.length || ticketDaLoja === null) return null
  const { results } = await db
    .prepare(
      `SELECT cat.value AS categoria, count(DISTINCT l.id) AS lojas,
              (SELECT sum(c.valor_centavos) FROM compra c
               WHERE c.criado_em >= ?2 AND c.valor_centavos > 0 AND c.loja_id IN (
                 SELECT l2.id FROM loja l2, json_each(l2.categorias) c2 WHERE l2.ativa = 1 AND c2.value = cat.value)) AS soma,
              (SELECT count(*) FROM compra c
               WHERE c.criado_em >= ?2 AND c.valor_centavos > 0 AND c.loja_id IN (
                 SELECT l2.id FROM loja l2, json_each(l2.categorias) c2 WHERE l2.ativa = 1 AND c2.value = cat.value)) AS n
       FROM json_each(?1) cat JOIN loja l ON l.ativa = 1 AND EXISTS (SELECT 1 FROM json_each(l.categorias) lc WHERE lc.value = cat.value)
       GROUP BY cat.value HAVING lojas >= ?3 ORDER BY cat.value`,
    )
    .bind(JSON.stringify(categorias), desde, LOJAS_PARA_COMPARAR)
    .all<{ categoria: string; lojas: number; soma: number | null; n: number }>()
  const linhas = results
    .map((c) => ({ categoria: c.categoria, ticketMedioLojaCentavos: ticketDaLoja, ticketMedioCategoriaCentavos: media(c.soma, c.n) }))
    .filter((c): c is { categoria: string; ticketMedioLojaCentavos: number; ticketMedioCategoriaCentavos: number } => c.ticketMedioCategoriaCentavos !== null)
  return linhas.length ? linhas : null
}
