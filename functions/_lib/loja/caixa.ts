// A compra no caixa (RF19), com itens: as reservas do cliente nesta loja que saem agora (só as
// confirmadas pela loja), produtos do catálogo da loja e valor avulso ("Outros", sem categoria).
// Aplica os cupons item por item (RN05, RN06, RN15), calcula os pontos (RN07) e o reembolso do
// voucher do shopping (RN11). A prévia usa o mesmo cálculo sem gravar.
import { ErroApi } from '../erros'
import { lerConfiguracao } from '../repo/configuracao'
import { cuponsPorIds, paraRegra, usosDoCliente } from '../repo/cupons'
import { nivelDoCliente } from '../repo/fidelidade'
import { interessesDoCliente } from '../repo/fichas'
import { buscarProdutoAtivo } from '../repo/produtos'
import { buscarReserva, expirarVencidas, type ReservaCompleta } from '../repo/reservas'
import type { UsuarioLinha } from '../repo/usuarios'
import { aplicarCuponsNosItens, type ItemDaCompra, type ResultadoDosItens } from '../regras/cupons'
import { paraSqlite } from '../regras/datas'
import { filtrarFicha } from '../regras/ficha'
import { pontosDaCompra } from '../regras/pontos'
import { PRONTAS_PARA_RETIRAR } from '../regras/reserva'
import { categoriasDaLoja, clienteDoQr } from './atendimento'

/** Um item pedido pelo caixa: uma reserva, um produto do catálogo ou um valor avulso. */
export type PedidoDeItem =
  | { reservaId: string }
  | { produtoId: string; quantidade: number }
  | { valorCentavos: number; descricao: string }

export interface PedidoDeCompra {
  qrToken: string
  itens: PedidoDeItem[]
  /** Os cupons escolhidos no caixa (os das reservas entram sozinhos). */
  cupons: string[]
}

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)
const inteiro = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

function lerItem(item: unknown): PedidoDeItem {
  if (!item || typeof item !== 'object') throw invalido('Um dos itens da compra veio em formato errado.')
  const i = item as Record<string, unknown>
  if (typeof i.reservaId === 'string' && i.reservaId) return { reservaId: i.reservaId }
  if (typeof i.produtoId === 'string' && i.produtoId) {
    const quantidade = i.quantidade ?? 1
    if (!inteiro(quantidade, 1, 99)) throw invalido('A quantidade de cada produto vai de 1 a 99.')
    return { produtoId: i.produtoId, quantidade: quantidade as number }
  }
  if (inteiro(i.valorCentavos, 1)) {
    const descricao = typeof i.descricao === 'string' && i.descricao.trim() ? i.descricao.trim().slice(0, 60) : 'Outros'
    return { valorCentavos: i.valorCentavos as number, descricao }
  }
  throw invalido('Cada item é uma reserva (reservaId), um produto da loja (produtoId) ou um valor avulso (valorCentavos).')
}

/**
 * Lê o corpo do caixa. O formato de antes (valorCentavos e reservaId, sem itens) ainda vale: a
 * reserva vira um item, e o valor, sem reserva, vira "Outros".
 */
export function lerPedidoDeCompra(corpo: Record<string, unknown>): PedidoDeCompra {
  const { qrToken } = corpo
  const cupons = corpo.cupons ?? []
  if (typeof qrToken !== 'string' || !qrToken.trim()) throw invalido('Leia o QR do cliente antes de registrar.')
  if (!Array.isArray(cupons) || cupons.some((c) => typeof c !== 'string')) throw invalido('A lista de cupons veio em formato errado.')
  let itens: PedidoDeItem[]
  if (corpo.itens !== undefined) {
    if (!Array.isArray(corpo.itens)) throw invalido('Os itens da compra vieram em formato errado.')
    itens = corpo.itens.map(lerItem)
  } else if (typeof corpo.reservaId === 'string' && corpo.reservaId) {
    itens = [{ reservaId: corpo.reservaId }]
  } else {
    if (!inteiro(corpo.valorCentavos, 1)) throw invalido('Informe o valor da compra.')
    itens = [{ valorCentavos: corpo.valorCentavos as number, descricao: 'Outros' }]
  }
  if (!itens.length) throw invalido('Ponha pelo menos um item na compra.')
  const reservas = itens.flatMap((i) => ('reservaId' in i ? [i.reservaId] : []))
  if (new Set(reservas).size !== reservas.length) throw invalido('A mesma reserva entrou duas vezes na compra.')
  return { qrToken: qrToken.trim(), itens, cupons: [...new Set(cupons as string[])] }
}

/** O item como a compra grava e a resposta mostra. */
export interface ItemDescrito {
  item: ItemDaCompra
  descricao: string
  produtoId: string | null
  reserva: ReservaCompleta | null
  detalhe: string | null
}

export interface CompraCalculada {
  lojaId: string
  cliente: UsuarioLinha
  itens: ItemDescrito[]
  resultado: ResultadoDosItens
  pontos: number
  comFicha: boolean
}

/** A reserva que o cliente leva agora: dele, desta loja e confirmada pela loja. */
async function reservaParaRetirar(db: D1Database, reservaId: string, cliente: UsuarioLinha, lojaId: string, agora: Date) {
  await expirarVencidas(db, { reservaId }, agora)
  const reserva = await buscarReserva(db, reservaId)
  if (!reserva || reserva.cliente_id !== cliente.id || reserva.loja_id !== lojaId) {
    throw new ErroApi('NAO_ENCONTRADO', 'Essa reserva não é deste cliente nesta loja.')
  }
  if (!PRONTAS_PARA_RETIRAR.includes(reserva.status)) {
    const mensagem =
      reserva.status === 'RETIRADA'
        ? 'Essa reserva já foi retirada.'
        : reserva.status === 'PENDENTE'
          ? 'Confirme a reserva antes de entregar.'
          : 'Essa reserva foi cancelada, recusada ou expirou.'
    throw new ErroApi('TRANSICAO_INVALIDA', mensagem)
  }
  return reserva
}

const detalheDaReserva = (r: ReservaCompleta) => [r.tamanho && `tamanho ${r.tamanho}`, r.cor].filter(Boolean).join(', ') || null

async function montarItem(db: D1Database, pedido: PedidoDeItem, n: number, cliente: UsuarioLinha, lojaId: string, agora: Date): Promise<ItemDescrito> {
  if ('reservaId' in pedido) {
    const r = await reservaParaRetirar(db, pedido.reservaId, cliente, lojaId, agora)
    return {
      item: {
        chave: `reserva:${r.id}`,
        categoria: r.produto_categoria,
        quantidade: r.quantidade,
        precoCentavos: r.preco_centavos,
        jaPago: r.pago === 1,
        ...(r.cupom_id ? { descontoDaReserva: { cupomId: r.cupom_id, centavos: r.desconto_centavos } } : {}),
      },
      descricao: r.produto_nome,
      produtoId: r.produto_id,
      reserva: r,
      detalhe: detalheDaReserva(r),
    }
  }
  if ('produtoId' in pedido) {
    const p = await buscarProdutoAtivo(db, pedido.produtoId)
    if (!p || p.loja_id !== lojaId) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está no catálogo desta loja.')
    return {
      item: { chave: `produto:${p.id}:${n}`, categoria: p.categoria, quantidade: pedido.quantidade, precoCentavos: p.preco_centavos },
      descricao: p.nome,
      produtoId: p.id,
      reserva: null,
      detalhe: null,
    }
  }
  return {
    item: { chave: `outros:${n}`, categoria: null, quantidade: 1, precoCentavos: pedido.valorCentavos },
    descricao: pedido.descricao,
    produtoId: null,
    reserva: null,
    detalhe: null,
  }
}

export async function calcularCompra(db: D1Database, lojaId: string, pedido: PedidoDeCompra, agora = new Date()): Promise<CompraCalculada> {
  const cliente = await clienteDoQr(db, pedido.qrToken)
  const itens: ItemDescrito[] = []
  for (const [n, item] of pedido.itens.entries()) itens.push(await montarItem(db, item, n + 1, cliente, lojaId, agora))
  const reservas = itens.flatMap((i) => (i.reserva ? [i.reserva] : []))
  // Os cupons das reservas entram sozinhos, com o desconto prometido nelas.
  const daReserva = reservas.flatMap((r) => (r.cupom_id ? [r.cupom_id] : []))
  const doCaixa = pedido.cupons.filter((id) => !daReserva.includes(id))
  const ids = [...doCaixa, ...daReserva]

  const [linhas, usos, { nivel }, interesses, categorias, pontosPorReal] = await Promise.all([
    cuponsPorIds(db, ids),
    usosDoCliente(db, cliente.id, { exceto: reservas.map((r) => r.id) }),
    nivelDoCliente(db, cliente.id, agora),
    interessesDoCliente(db, cliente.id),
    categoriasDaLoja(db, lojaId),
    lerConfiguracao(db, 'pontos_por_real'),
  ])
  if (linhas.length !== ids.length) {
    throw new ErroApi('CUPOM_INVALIDO', 'Um dos cupons não vale mais para este cliente. Leia o QR de novo.')
  }
  const resultado = aplicarCuponsNosItens(
    itens.map((i) => i.item),
    linhas.map(paraRegra),
    { lojaId, nivelCliente: nivel, usosDoCliente: usos, agora },
  )
  return {
    lojaId,
    cliente,
    itens,
    resultado,
    pontos: pontosDaCompra(resultado.valorPagoCentavos, typeof pontosPorReal === 'number' && pontosPorReal > 0 ? pontosPorReal : 1),
    comFicha: filtrarFicha(interesses, categorias, cliente.consentimento_ficha === 1).length > 0,
  }
}

/** A resposta no formato do contrato (docs/api.md). Na prévia, sem id. */
export function compraParaApi(c: CompraCalculada, id?: string) {
  const reembolso = c.resultado.reembolsos[0]
  return {
    ...(id ? { id } : {}),
    itens: c.resultado.itens.map((calculado, i) => {
      const { item, descricao, produtoId, reserva, detalhe } = c.itens[i]
      return {
        descricao,
        detalhe,
        categoria: item.categoria,
        produtoId,
        reservaId: reserva?.id ?? null,
        quantidade: item.quantidade,
        precoCentavos: item.precoCentavos,
        brutoCentavos: calculado.brutoCentavos,
        descontos: calculado.descontos.map((d) => ({ cupom: d.cupomId, centavos: d.centavos })),
        pagoCentavos: calculado.pagoCentavos,
        jaPago: calculado.jaPago,
      }
    }),
    valorBrutoCentavos: c.resultado.valorBrutoCentavos,
    descontos: c.resultado.descontos.map((d) => ({ cupom: d.cupomId, centavos: d.centavos })),
    valorPagoCentavos: c.resultado.valorPagoCentavos,
    aPagarNoCaixaCentavos: c.resultado.aPagarNoCaixaCentavos,
    pontosGerados: c.pontos,
    reembolsoGerado: reembolso ? { cupom: reembolso.cupomId, centavos: reembolso.centavos } : null,
  }
}

/**
 * Grava a compra numa transação: a compra e os itens, os cupons usados, o reembolso do voucher, os
 * pontos do cliente, a retirada das reservas (com o aviso de cada uma), a baixa do estoque dos
 * produtos do catálogo e o aviso dos pontos. Reserva já retirada (o UNIQUE de compra_item.reserva_id
 * segura a segunda compra): 409.
 */
export async function registrarCompra(db: D1Database, c: CompraCalculada, agora = new Date()) {
  const id = crypto.randomUUID()
  const quando = paraSqlite(agora)
  const reservas = c.itens.flatMap((i) => (i.reserva ? [i.reserva] : []))
  const comandos = [
    db
      .prepare(
        `INSERT INTO compra (id, cliente_id, loja_id, reserva_id, valor_centavos, origem, pontos_gerados, com_ficha, criado_em)
         VALUES (?1, ?2, ?3, ?4, ?5, 'CAIXA', ?6, ?7, ?8)`,
      )
      .bind(id, c.cliente.id, c.lojaId, reservas[0]?.id ?? null, c.resultado.valorPagoCentavos, c.pontos, c.comFicha ? 1 : 0, quando),
    ...c.resultado.itens.map((calculado, i) => {
      const { item, descricao, produtoId, reserva } = c.itens[i]
      return db
        .prepare(
          `INSERT INTO compra_item (id, compra_id, produto_id, reserva_id, descricao, categoria, quantidade, preco_centavos, desconto_centavos, ja_pago)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          produtoId,
          reserva?.id ?? null,
          descricao,
          item.categoria,
          item.quantidade,
          item.precoCentavos,
          calculado.brutoCentavos - calculado.pagoCentavos,
          calculado.jaPago ? 1 : 0,
        )
    }),
    ...c.resultado.descontos.map((d) =>
      db.prepare('INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES (?1, ?2, ?3)').bind(id, d.cupomId, d.centavos),
    ),
    ...c.resultado.reembolsos.map((r) =>
      db
        .prepare('INSERT INTO reembolso (id, loja_id, compra_id, cupom_id, valor_centavos, criado_em) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(crypto.randomUUID(), c.lojaId, id, r.cupomId, r.centavos, quando),
    ),
    db.prepare('UPDATE usuario SET pontos = pontos + ?2 WHERE id = ?1').bind(c.cliente.id, c.pontos),
    ...reservas.flatMap((r) => [
      db
        .prepare(`UPDATE reserva SET status = 'RETIRADA', atualizado_em = ?2 WHERE id = ?1 AND status IN ('CONFIRMADA', 'SEPARADA')`)
        .bind(r.id, quando),
      db
        .prepare(
          `INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo, destino)
           SELECT ?1, ?2, 'RESERVA', 'Reserva retirada', ?3, ?4 WHERE changes() = 1`,
        )
        .bind(crypto.randomUUID(), c.cliente.id, `${r.produto_nome} saiu da ${r.loja_nome}. Bom proveito.`, `/reserva/${r.id}`),
    ]),
    ...c.itens
      .filter((i) => !i.reserva && i.produtoId)
      .map((i) =>
        db
          .prepare("UPDATE produto SET estoque = max(0, estoque - ?2), atualizado_em = datetime('now') WHERE id = ?1")
          .bind(i.produtoId, i.item.quantidade),
      ),
  ]
  if (c.pontos > 0) {
    comandos.push(
      db
        .prepare("INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo, destino) VALUES (?1, ?2, 'PONTOS', ?3, ?4, '/carteira')")
        .bind(crypto.randomUUID(), c.cliente.id, `Você ganhou ${c.pontos} pontos`, 'Compra registrada no balcão.'),
    )
  }
  try {
    await db.batch(comandos)
  } catch (erro) {
    if (reservas.length && String(erro).includes('UNIQUE')) throw new ErroApi('TRANSICAO_INVALIDA', 'Essa reserva já foi retirada.')
    throw erro
  }
  return id
}
