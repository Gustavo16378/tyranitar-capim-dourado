// SQL de reembolso: o que o shopping deve às lojas pelos vouchers usados nelas (RN11). Quem
// grava é o caixa (loja/caixa.ts), quando a compra usa um voucher do shopping.
import { NUMERO_DA_UNIDADE } from './lojas'

export interface ReembolsoLinha {
  id: string
  loja_id: string
  loja_nome: string
  loja_numero: string
  loja_ativa: 0 | 1
  compra_id: string
  cupom_id: string
  cupom_titulo: string
  valor_centavos: number
  status: 'PENDENTE' | 'PAGO'
  criado_em: string
  pago_em: string | null
}

const SELECAO = `
  SELECT r.id, r.loja_id, l.nome AS loja_nome, ${NUMERO_DA_UNIDADE} AS loja_numero, l.ativa AS loja_ativa,
         r.compra_id, r.cupom_id, COALESCE(c.titulo, 'Voucher do shopping') AS cupom_titulo,
         r.valor_centavos, r.status, r.criado_em, r.pago_em
  FROM reembolso r JOIN loja l ON l.id = r.loja_id LEFT JOIN cupom c ON c.id = r.cupom_id`

/** Todos os reembolsos, do mais novo para o mais antigo (são poucos: um por voucher usado). */
export async function listarReembolsos(db: D1Database) {
  const { results } = await db.prepare(`${SELECAO} ORDER BY r.criado_em DESC, r.id`).all<ReembolsoLinha>()
  return results
}

export function buscarReembolso(db: D1Database, id: string) {
  return db.prepare(`${SELECAO} WHERE r.id = ?1`).bind(id).first<ReembolsoLinha>()
}

/** Marca como pago. Devolve false se ele já estava pago (ou não existe). */
export async function marcarReembolsoPago(db: D1Database, id: string, quando: string) {
  const { meta } = await db
    .prepare("UPDATE reembolso SET status = 'PAGO', pago_em = ?2 WHERE id = ?1 AND status = 'PENDENTE'")
    .bind(id, quando)
    .run()
  return meta.changes === 1
}
