// O extrato da loja (RF25): as compras registradas no caixa pela plataforma no período, o
// desconto que a loja deu nos cupons dela, o dos vouchers do shopping (que o shopping devolve,
// RN11) e os reembolsos a receber. As compras por nota fiscal (o cliente cadastra) ficam fora.
// O valor da compra no banco é o que o cliente pagou; o bruto é ele mais os descontos. Cada
// lançamento traz a cliente e os itens da compra (compra_item), com o desconto de cada um.
import { deSqlite, paraSqlite } from '../regras/datas'
import { inicioDoPeriodo, type Periodo } from '../regras/periodo'

const DESCONTO = (lado: 'NOT NULL' | 'NULL') => `(
  SELECT COALESCE(sum(u.desconto_centavos), 0) FROM uso_cupom u JOIN cupom k ON k.id = u.cupom_id
  WHERE u.compra_id = c.id AND k.loja_id IS ${lado})`

const DO_PERIODO = `
  SELECT c.id, c.criado_em, c.valor_centavos, c.reserva_id, c.cliente_id,
         ${DESCONTO('NOT NULL')} AS desconto_loja, ${DESCONTO('NULL')} AS desconto_shopping
  FROM compra c WHERE c.loja_id = ?1 AND c.origem = 'CAIXA' AND c.criado_em >= ?2`

interface ItemLinha {
  compra_id: string
  descricao: string
  categoria: string | null
  quantidade: number
  preco_centavos: number
  desconto_centavos: number
  ja_pago: 0 | 1
  reserva_id: string | null
}

interface LancamentoLinha {
  id: string
  criado_em: string
  valor_centavos: number
  reserva_id: string | null
  cliente_nome: string
  desconto_loja: number
  desconto_shopping: number
  reembolso_status: 'PENDENTE' | 'PAGO' | null
  reembolso_pago_em: string | null
}

export async function montarExtrato(
  db: D1Database,
  lojaId: string,
  periodo: Periodo,
  pagina: { tamanho: number; inicio: number },
  agora = new Date(),
) {
  const desde = paraSqlite(inicioDoPeriodo(periodo, agora))
  const [resumo, lancamentos, itens, reembolsos] = await db.batch([
    db
      .prepare(
        `SELECT count(*) AS compras, COALESCE(sum(valor_centavos), 0) AS pago,
                COALESCE(sum(desconto_loja), 0) AS desconto_loja, COALESCE(sum(desconto_shopping), 0) AS desconto_shopping
         FROM (${DO_PERIODO})`,
      )
      .bind(lojaId, desde),
    db
      .prepare(
        // Uma compra pode ter mais de um voucher: o reembolso dela está pendente se algum estiver.
        `SELECT p.id, p.criado_em, p.valor_centavos, p.reserva_id, p.desconto_loja, p.desconto_shopping,
                cl.nome AS cliente_nome,
                (SELECT CASE WHEN count(*) = 0 THEN NULL WHEN sum(r.status = 'PENDENTE') > 0 THEN 'PENDENTE' ELSE 'PAGO' END
                 FROM reembolso r WHERE r.compra_id = p.id) AS reembolso_status,
                (SELECT max(r.pago_em) FROM reembolso r WHERE r.compra_id = p.id) AS reembolso_pago_em
         FROM (${DO_PERIODO}) p JOIN usuario cl ON cl.id = p.cliente_id
         ORDER BY p.criado_em DESC, p.id LIMIT ?3 OFFSET ?4`,
      )
      .bind(lojaId, desde, pagina.tamanho, pagina.inicio),
    // Os itens das compras da página (as mesmas do ORDER BY e do LIMIT dos lançamentos).
    db
      .prepare(
        `SELECT i.compra_id, i.descricao, i.categoria, i.quantidade, i.preco_centavos, i.desconto_centavos, i.ja_pago, i.reserva_id
         FROM compra_item i
         WHERE i.compra_id IN (SELECT p.id FROM (${DO_PERIODO}) p ORDER BY p.criado_em DESC, p.id LIMIT ?3 OFFSET ?4)
         ORDER BY i.rowid`,
      )
      .bind(lojaId, desde, pagina.tamanho, pagina.inicio),
    db
      .prepare(
        `SELECT COALESCE(sum(CASE WHEN status = 'PENDENTE' THEN valor_centavos END), 0) AS pendente,
                COALESCE(sum(CASE WHEN status = 'PAGO' AND pago_em >= ?2 THEN valor_centavos END), 0) AS pago_no_periodo
         FROM reembolso WHERE loja_id = ?1`,
      )
      .bind(lojaId, desde),
  ])
  const r = resumo.results[0] as { compras: number; pago: number; desconto_loja: number; desconto_shopping: number }
  const re = reembolsos.results[0] as { pendente: number; pago_no_periodo: number }
  const itensDa = (compraId: string) =>
    (itens.results as ItemLinha[])
      .filter((i) => i.compra_id === compraId)
      .map((i) => ({
        descricao: i.descricao,
        categoria: i.categoria,
        quantidade: i.quantidade,
        brutoCentavos: i.preco_centavos * i.quantidade,
        descontoCentavos: i.desconto_centavos,
        jaPago: i.ja_pago === 1,
        retirada: i.reserva_id !== null,
      }))
  return {
    periodo,
    resumo: {
      compras: r.compras,
      brutoCentavos: r.pago + r.desconto_loja + r.desconto_shopping,
      descontoLojaCentavos: r.desconto_loja,
      descontoShoppingCentavos: r.desconto_shopping,
      pagoCentavos: r.pago,
    },
    reembolsos: { pendenteCentavos: re.pendente, pagoNoPeriodoCentavos: re.pago_no_periodo },
    lancamentos: {
      itens: (lancamentos.results as LancamentoLinha[]).map((l) => ({
        id: l.id,
        criadoEm: deSqlite(l.criado_em).toISOString(),
        cliente: l.cliente_nome.split(' ')[0],
        brutoCentavos: l.valor_centavos + l.desconto_loja + l.desconto_shopping,
        descontoLojaCentavos: l.desconto_loja,
        descontoShoppingCentavos: l.desconto_shopping,
        pagoCentavos: l.valor_centavos,
        itens: itensDa(l.id),
        retirada: l.reserva_id !== null || itensDa(l.id).some((i) => i.retirada),
        reembolso: l.reembolso_status
          ? {
              status: l.reembolso_status,
              pagoEm: l.reembolso_status === 'PAGO' && l.reembolso_pago_em ? deSqlite(l.reembolso_pago_em).toISOString() : null,
            }
          : null,
      })),
      total: r.compras,
    },
  }
}
