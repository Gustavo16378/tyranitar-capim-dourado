// GET /api/loja/atendimento/{qr} e POST /api/loja/compras, com as regras que a API real
// aplica (requisitos.md): ficha filtrada (RN04), cupons combináveis (RN05), limite de uso
// (RN06), 1 ponto por real pago (RN07) e reembolso do voucher do shopping (RN11).
import type { Atendimento, Compra, PedidoCompra } from '../../tipos/loja'
import { podeRetirar, STATUS_ATIVOS } from '../../loja/comum/reserva'
import { exigirLojista } from './auth'
import { banco, LOJA, type ClienteMock, type CupomMock } from './dados'
import {
  dadosInvalidos,
  erro,
  naoEncontrado,
  objeto,
  ok,
  type PedidoMock,
  type RespostaMock,
} from './resposta'

const QR_DESCONHECIDO = 'Não achamos esse QR. Peça para o cliente abrir a carteira de novo.'

function clienteDoQr(qr: string) {
  return banco.clientes.find((c) => c.qrToken === qr)
}

function usosDoCupom(cupom: CupomMock, cliente: ClienteMock) {
  return banco.usos.filter((u) => u.cupomId === cupom.id && u.clienteId === cliente.id).length
}

function cuponsDisponiveis(cliente: ClienteMock) {
  return banco.cupons.filter((c) => usosDoCupom(c, cliente) < c.limitePorCliente)
}

export function buscarAtendimento(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const cliente = clienteDoQr(pedido.params.qr)
  if (!cliente) return naoEncontrado(QR_DESCONHECIDO)

  const atendimento: Atendimento = {
    cliente: { nome: cliente.nome, nivel: cliente.nivel },
    ficha: cliente.consentimentoFicha
      ? cliente.interesses.filter((i) => LOJA.categorias.includes(i.categoria)).map((i) => i.detalhe)
      : [],
    reservas: banco.reservas
      .filter((r) => r.clienteId === cliente.id && STATUS_ATIVOS.includes(r.status))
      .map(({ id, produto, status, pago }) => ({ id, produto, status, pago })),
    cupons: cuponsDisponiveis(cliente).map(({ id, titulo, origem }) => ({ id, titulo, origem })),
  }
  return ok(atendimento)
}

/** Lê e valida o corpo; devolve o pedido ou a resposta de erro. */
function lerPedidoCompra(corpo: unknown): PedidoCompra | RespostaMock {
  const dados = objeto(corpo)
  const { qrToken, valorCentavos, reservaId } = dados ?? {}
  const cupons = dados?.cupons ?? []
  if (typeof qrToken !== 'string' || !qrToken) return dadosInvalidos('Leia o QR do cliente antes de registrar.')
  if (typeof valorCentavos !== 'number' || !Number.isInteger(valorCentavos) || valorCentavos < 0) {
    return dadosInvalidos('Informe o valor da compra em centavos.')
  }
  if (!Array.isArray(cupons) || cupons.some((c) => typeof c !== 'string')) {
    return dadosInvalidos('A lista de cupons veio em formato errado.')
  }
  if (reservaId !== undefined && typeof reservaId !== 'string') {
    return dadosInvalidos('A reserva veio em formato errado.')
  }
  return { qrToken, valorCentavos, cupons: [...new Set(cupons as string[])], reservaId }
}

export function registrarCompra(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const lido = lerPedidoCompra(pedido.corpo)
  if ('status' in lido) return lido
  const cliente = clienteDoQr(lido.qrToken)
  if (!cliente) return naoEncontrado(QR_DESCONHECIDO)

  // Retirada de reserva: só da própria loja e do próprio cliente, e só se já pode sair.
  const reserva = lido.reservaId ? banco.reservas.find((r) => r.id === lido.reservaId) : undefined
  if (lido.reservaId && (!reserva || reserva.clienteId !== cliente.id)) {
    return naoEncontrado('Essa reserva não é deste cliente nesta loja.')
  }
  if (reserva && !podeRetirar(reserva.status)) {
    const mensagem =
      reserva.status === 'RETIRADA'
        ? 'Essa reserva já foi retirada.'
        : reserva.status === 'PENDENTE'
          ? 'Separe a reserva antes de entregar.'
          : 'Essa reserva foi cancelada ou expirou.'
    return erro(409, 'TRANSICAO_INVALIDA', mensagem)
  }

  // Reserva paga com Pix: a compra entra com o valor da reserva e o caixa não cobra de novo.
  const pagaComPix = Boolean(reserva?.pago)
  if (pagaComPix && lido.cupons.length > 0) {
    return erro(422, 'CUPOM_INVALIDO', 'A reserva já foi paga com Pix. Os cupons ficam para a próxima compra.')
  }
  const bruto = pagaComPix && reserva ? reserva.precoCentavos * reserva.quantidade : lido.valorCentavos
  if (bruto <= 0) return dadosInvalidos('Informe o valor da compra.')

  const disponiveis = cuponsDisponiveis(cliente)
  const usados: CupomMock[] = []
  for (const id of lido.cupons) {
    const cupom = disponiveis.find((c) => c.id === id)
    if (!cupom) return erro(422, 'CUPOM_INVALIDO', 'Um dos cupons não vale mais para este cliente. Leia o QR de novo.')
    usados.push(cupom)
  }
  if (usados.filter((c) => c.origem === 'LOJA').length > 1) {
    return erro(422, 'CUPONS_INCOMPATIVEIS', 'Só um cupom da loja por compra. O voucher do shopping pode ir junto.')
  }

  // Percentuais sobre o valor bruto, depois os valores fixos, sem passar do que falta pagar.
  let falta = bruto
  const descontos = [...usados]
    .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'PERCENTUAL' ? -1 : 1))
    .map((cupom) => {
      const centavos = Math.min(
        falta,
        cupom.tipo === 'PERCENTUAL' ? Math.floor((bruto * cupom.valor) / 100) : cupom.valor,
      )
      falta -= centavos
      return { cupom: cupom.id, centavos }
    })
  const voucher = descontos.find((d) => usados.find((c) => c.id === d.cupom)?.origem === 'SHOPPING')

  banco.compras += 1
  const compra: Compra = {
    id: `co${banco.compras}`,
    valorBrutoCentavos: bruto,
    descontos,
    valorPagoCentavos: falta,
    pontosGerados: Math.floor(falta / 100),
    reembolsoGerado: voucher && voucher.centavos > 0 ? voucher : null,
  }

  cliente.pontos += compra.pontosGerados
  for (const cupom of usados) banco.usos.push({ cupomId: cupom.id, clienteId: cliente.id, compraId: compra.id })
  if (reserva) reserva.status = 'RETIRADA'

  return ok(compra, 201)
}
