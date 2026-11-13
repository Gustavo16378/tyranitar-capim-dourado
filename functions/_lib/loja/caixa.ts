// A compra no caixa (RF19): valida o pedido, aplica os cupons (RN05, RN06), calcula os pontos
// (RN07) e o reembolso do voucher do shopping (RN11). A prévia usa o mesmo cálculo sem gravar.
import { ErroApi } from '../erros'
import { lerConfiguracao } from '../repo/configuracao'
import { cuponsPorIds, paraRegra, usosDoCliente } from '../repo/cupons'
import { nivelDoCliente } from '../repo/fidelidade'
import { interessesDoCliente } from '../repo/fichas'
import { buscarReserva, expirarVencidas, type ReservaCompleta } from '../repo/reservas'
import type { UsuarioLinha } from '../repo/usuarios'
import { aplicarCupons, type ResultadoCupons } from '../regras/cupons'
import { paraSqlite } from '../regras/datas'
import { filtrarFicha } from '../regras/ficha'
import { pontosDaCompra } from '../regras/pontos'
import { podeMudar } from '../regras/reserva'
import { categoriasDaLoja, clienteDoQr } from './atendimento'

export interface PedidoDeCompra {
  qrToken: string
  valorCentavos: number
  cupons: string[]
  reservaId?: string
}

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)

export function lerPedidoDeCompra(corpo: Record<string, unknown>): PedidoDeCompra {
  const { qrToken, valorCentavos, reservaId } = corpo
  const cupons = corpo.cupons ?? []
  if (typeof qrToken !== 'string' || !qrToken.trim()) throw invalido('Leia o QR do cliente antes de registrar.')
  if (typeof valorCentavos !== 'number' || !Number.isInteger(valorCentavos) || valorCentavos < 0) {
    throw invalido('Informe o valor da compra em centavos.')
  }
  if (!Array.isArray(cupons) || cupons.some((c) => typeof c !== 'string')) throw invalido('A lista de cupons veio em formato errado.')
  if (reservaId !== undefined && reservaId !== null && typeof reservaId !== 'string') throw invalido('A reserva veio em formato errado.')
  return {
    qrToken: qrToken.trim(),
    valorCentavos,
    cupons: [...new Set(cupons as string[])],
    ...(typeof reservaId === 'string' && reservaId ? { reservaId } : {}),
  }
}

export interface CompraCalculada {
  lojaId: string
  cliente: UsuarioLinha
  reserva: ReservaCompleta | null
  resultado: ResultadoCupons
  pontos: number
  comFicha: boolean
}

/** A reserva que o cliente leva agora: do próprio cliente, desta loja e pronta para sair. */
async function reservaParaRetirar(db: D1Database, reservaId: string, cliente: UsuarioLinha, lojaId: string, agora: Date) {
  await expirarVencidas(db, { reservaId }, agora)
  const reserva = await buscarReserva(db, reservaId)
  if (!reserva || reserva.cliente_id !== cliente.id || reserva.loja_id !== lojaId) {
    throw new ErroApi('NAO_ENCONTRADO', 'Essa reserva não é deste cliente nesta loja.')
  }
  if (!podeMudar(reserva.status, 'RETIRADA')) {
    const mensagem =
      reserva.status === 'RETIRADA'
        ? 'Essa reserva já foi retirada.'
        : reserva.status === 'PENDENTE'
          ? 'Separe a reserva antes de entregar.'
          : 'Essa reserva foi cancelada ou expirou.'
    throw new ErroApi('TRANSICAO_INVALIDA', mensagem)
  }
  return reserva
}

export async function calcularCompra(db: D1Database, lojaId: string, pedido: PedidoDeCompra, agora = new Date()): Promise<CompraCalculada> {
  const cliente = await clienteDoQr(db, pedido.qrToken)
  const reserva = pedido.reservaId ? await reservaParaRetirar(db, pedido.reservaId, cliente, lojaId, agora) : null

  // Reserva paga com Pix: a compra entra com o valor da reserva e o caixa não cobra de novo.
  const pagaComPix = reserva?.pago === 1
  if (pagaComPix && pedido.cupons.length) {
    throw new ErroApi('CUPOM_INVALIDO', 'A reserva já foi paga com Pix. Os cupons ficam para a próxima compra.')
  }
  const bruto = pagaComPix ? reserva.preco_centavos * reserva.quantidade : pedido.valorCentavos
  if (bruto <= 0) throw invalido('Informe o valor da compra.')

  const [linhas, usos, { nivel }, interesses, categorias, pontosPorReal] = await Promise.all([
    cuponsPorIds(db, pedido.cupons),
    usosDoCliente(db, cliente.id),
    nivelDoCliente(db, cliente.id, agora),
    interessesDoCliente(db, cliente.id),
    categoriasDaLoja(db, lojaId),
    lerConfiguracao(db, 'pontos_por_real'),
  ])
  if (linhas.length !== pedido.cupons.length) {
    throw new ErroApi('CUPOM_INVALIDO', 'Um dos cupons não vale mais para este cliente. Leia o QR de novo.')
  }
  const resultado = aplicarCupons(bruto, linhas.map(paraRegra), { lojaId, nivelCliente: nivel, usosDoCliente: usos, agora })
  return {
    lojaId,
    cliente,
    reserva,
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
    valorBrutoCentavos: c.resultado.valorBrutoCentavos,
    descontos: c.resultado.descontos.map((d) => ({ cupom: d.cupomId, centavos: d.centavos })),
    valorPagoCentavos: c.resultado.valorPagoCentavos,
    pontosGerados: c.pontos,
    reembolsoGerado: reembolso ? { cupom: reembolso.cupomId, centavos: reembolso.centavos } : null,
  }
}

/**
 * Grava a compra numa transação: a compra, os cupons usados, o reembolso do voucher, os pontos
 * do cliente, a retirada da reserva e o aviso dos pontos. Reserva já retirada: 409.
 */
export async function registrarCompra(db: D1Database, c: CompraCalculada, agora = new Date()) {
  const id = crypto.randomUUID()
  const quando = paraSqlite(agora)
  const comandos = [
    db
      .prepare(
        `INSERT INTO compra (id, cliente_id, loja_id, reserva_id, valor_centavos, origem, pontos_gerados, com_ficha, criado_em)
         VALUES (?1, ?2, ?3, ?4, ?5, 'CAIXA', ?6, ?7, ?8)`,
      )
      .bind(id, c.cliente.id, c.lojaId, c.reserva?.id ?? null, c.resultado.valorPagoCentavos, c.pontos, c.comFicha ? 1 : 0, quando),
    ...c.resultado.descontos.map((d) =>
      db.prepare('INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES (?1, ?2, ?3)').bind(id, d.cupomId, d.centavos),
    ),
    ...c.resultado.reembolsos.map((r) =>
      db
        .prepare('INSERT INTO reembolso (id, loja_id, compra_id, cupom_id, valor_centavos, criado_em) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(crypto.randomUUID(), c.lojaId, id, r.cupomId, r.centavos, quando),
    ),
    db.prepare('UPDATE usuario SET pontos = pontos + ?2 WHERE id = ?1').bind(c.cliente.id, c.pontos),
  ]
  if (c.reserva) {
    comandos.push(
      db
        .prepare(`UPDATE reserva SET status = 'RETIRADA', atualizado_em = ?2 WHERE id = ?1 AND status IN ('CONFIRMADA', 'SEPARADA')`)
        .bind(c.reserva.id, quando),
    )
  }
  if (c.pontos > 0) {
    comandos.push(
      db
        .prepare("INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo) VALUES (?1, ?2, 'PONTOS', ?3, ?4)")
        .bind(crypto.randomUUID(), c.cliente.id, `Você ganhou ${c.pontos} pontos`, 'Compra registrada no balcão.'),
    )
  }
  try {
    await db.batch(comandos)
  } catch (erro) {
    // A mesma reserva em duas compras: o UNIQUE de compra.reserva_id segura a segunda.
    if (c.reserva && String(erro).includes('UNIQUE')) throw new ErroApi('TRANSICAO_INVALIDA', 'Essa reserva já foi retirada.')
    throw erro
  }
  return id
}
