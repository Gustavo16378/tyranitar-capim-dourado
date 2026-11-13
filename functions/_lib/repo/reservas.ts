// SQL de reserva. A criação baixa o estoque e grava a reserva numa transação só (RN03).
import { ErroApi } from '../erros'
import { deSqlite, paraSqlite } from '../regras/datas'
import { calcularExpiracao, type FormaPagamento } from '../regras/reserva'
import { lerPrazosReserva } from './configuracao'
import { buscarProdutoAtivo } from './produtos'

export interface ReservaCriada {
  id: string
  produtoId: string
  lojaId: string
  quantidade: number
  precoCentavos: number
  status: 'PENDENTE'
  formaPagamento: FormaPagamento
  pago: false
  expiraEm: string
}

/**
 * Cria a reserva descontando o estoque sem vender o que não tem: o UPDATE só baixa se houver
 * unidades, e o INSERT só acontece se o UPDATE mudou a linha (changes() = 1), no mesmo batch,
 * que o D1 roda numa transação. Duas pessoas nunca ficam com a última unidade.
 */
export async function criarReserva(
  db: D1Database,
  pedido: { clienteId: string; produtoId: string; quantidade: number; formaPagamento: FormaPagamento; agora?: Date },
): Promise<ReservaCriada> {
  if (!Number.isInteger(pedido.quantidade) || pedido.quantidade < 1 || pedido.quantidade > 5) {
    throw new ErroApi('DADOS_INVALIDOS', 'Dá para reservar de 1 a 5 unidades.')
  }
  const agora = pedido.agora ?? new Date()
  const expira = calcularExpiracao({ forma: pedido.formaPagamento, criadaEm: agora }, await lerPrazosReserva(db))
  const id = crypto.randomUUID()

  const [, insercao] = await db.batch([
    db
      .prepare(
        `UPDATE produto SET estoque = estoque - ?2, atualizado_em = datetime('now')
         WHERE id = ?1 AND ativo = 1 AND estoque >= ?2
           AND loja_id IN (SELECT id FROM loja WHERE ativa = 1)`,
      )
      .bind(pedido.produtoId, pedido.quantidade),
    db
      .prepare(
        `INSERT INTO reserva (id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status,
                              forma_pagamento, pago, expira_em, criado_em, atualizado_em)
         SELECT ?1, ?2, p.id, p.loja_id, ?3, p.preco_centavos, 'PENDENTE', ?4, 0, ?5, ?6, ?6
         FROM produto p WHERE p.id = ?7 AND changes() = 1`,
      )
      .bind(id, pedido.clienteId, pedido.quantidade, pedido.formaPagamento, paraSqlite(expira), paraSqlite(agora), pedido.produtoId),
  ])

  if (insercao.meta.changes !== 1) {
    const produto = await buscarProdutoAtivo(db, pedido.produtoId)
    if (!produto) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
    throw new ErroApi('SEM_ESTOQUE', 'Esse produto acabou de esgotar nesta loja.')
  }

  const reserva = await db
    .prepare('SELECT loja_id, preco_centavos, expira_em FROM reserva WHERE id = ?1')
    .bind(id)
    .first<{ loja_id: string; preco_centavos: number; expira_em: string }>()
  return {
    id,
    produtoId: pedido.produtoId,
    lojaId: reserva!.loja_id,
    quantidade: pedido.quantidade,
    precoCentavos: reserva!.preco_centavos,
    status: 'PENDENTE',
    formaPagamento: pedido.formaPagamento,
    pago: false,
    expiraEm: deSqlite(reserva!.expira_em).toISOString(),
  }
}
