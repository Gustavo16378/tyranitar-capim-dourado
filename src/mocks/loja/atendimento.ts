// GET /api/loja/atendimento/{qr}, POST /api/loja/atendimento/previa e POST /api/loja/compras,
// com as regras da API real (functions/_lib/regras/cupons.ts): ficha filtrada (RN04), um
// cupom da loja e um voucher do shopping por compra (RN05), validade, nível e limite de uso
// (RN06), 1 ponto por real pago (RN07) e reembolso do voucher do shopping (RN11).
import type { Atendimento, Compra, PedidoCompra, PreviaCompra } from '../../tipos/loja'
import { podeRetirar, STATUS_ATIVOS } from '../../loja/comum/reserva'
import { exigirLojista } from './auth'
import { hojeEmPalmas } from '../../loja/comum/formatos'
import { banco, nivelAtende, novoId, type ClienteMock, type CupomMock, type ReservaMock } from './dados'
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

export function usosDoCupom(cupom: CupomMock, clienteId?: string) {
  return banco.usos.filter((u) => u.cupomId === cupom.id && (!clienteId || u.clienteId === clienteId))
}

/** Por que o cupom não vale para o cliente agora, ou null se vale. */
function motivoCupomInvalido(cupom: CupomMock, cliente: ClienteMock) {
  if (!cupom.ativo) return `O cupom "${cupom.titulo}" não está mais ativo.`
  if (hojeEmPalmas() > cupom.validade) return `O cupom "${cupom.titulo}" já venceu.`
  if (!nivelAtende(cliente.nivel, cupom.nivelMinimo)) {
    return `O cupom "${cupom.titulo}" é para clientes do nível ${cupom.nivelMinimo} ou acima.`
  }
  if (usosDoCupom(cupom, cliente.id).length >= cupom.limitePorCliente) {
    return `O cliente já usou o cupom "${cupom.titulo}" o número de vezes permitido.`
  }
  return null
}

export function buscarAtendimento(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado

  const cliente = clienteDoQr(pedido.params.qr)
  if (!cliente) return naoEncontrado(QR_DESCONHECIDO)

  const atendimento: Atendimento = {
    cliente: { nome: cliente.nome, nivel: cliente.nivel },
    ficha: cliente.consentimentoFicha
      ? cliente.interesses.filter((i) => banco.categorias.includes(i.categoria)).map((i) => i.detalhe)
      : [],
    reservas: banco.reservas
      .filter((r) => r.clienteId === cliente.id && STATUS_ATIVOS.includes(r.status))
      .map(({ id, produto, status, pago }) => ({ id, produto, status, pago })),
    cupons: banco.cupons
      .filter((c) => !motivoCupomInvalido(c, cliente))
      .map(({ id, titulo, origem }) => ({ id, titulo, origem })),
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
  return { qrToken, valorCentavos, cupons: cupons as string[], reservaId }
}

interface Calculo {
  cliente: ClienteMock
  reserva?: ReservaMock
  usados: CupomMock[]
  previa: PreviaCompra
}

/** O cálculo da compra, igual para a prévia e para o registro. Não grava nada. */
function calcular(pedido: PedidoMock): Calculo | RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const lido = lerPedidoCompra(pedido.corpo)
  if ('status' in lido) return lido
  const cliente = clienteDoQr(lido.qrToken)
  if (!cliente) return naoEncontrado(QR_DESCONHECIDO)

  // Retirada de reserva: só do próprio cliente nesta loja, e só se já pode sair.
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

  // Reserva paga com Pix: o valorCentavos (0) é ignorado; a compra entra com o valor da reserva.
  const pagaComPix = Boolean(reserva?.pago)
  if (pagaComPix && lido.cupons.length > 0) {
    return erro(422, 'CUPOM_INVALIDO', 'A reserva já foi paga com Pix. Os cupons ficam para a próxima compra.')
  }
  const bruto = pagaComPix && reserva ? reserva.precoCentavos * reserva.quantidade : lido.valorCentavos
  if (bruto <= 0) return dadosInvalidos('O valor da compra precisa ser maior que zero.')

  if (new Set(lido.cupons).size !== lido.cupons.length) {
    return erro(422, 'CUPONS_INCOMPATIVEIS', 'O mesmo cupom foi informado duas vezes.')
  }
  const usados: CupomMock[] = []
  for (const id of lido.cupons) {
    const cupom = banco.cupons.find((c) => c.id === id)
    if (!cupom) return erro(422, 'CUPOM_INVALIDO', 'Um dos cupons não existe mais. Leia o QR de novo.')
    const motivo = motivoCupomInvalido(cupom, cliente)
    if (motivo) return erro(422, 'CUPOM_INVALIDO', motivo)
    usados.push(cupom)
  }
  const daLoja = usados.filter((c) => c.origem === 'LOJA')
  const doShopping = usados.filter((c) => c.origem === 'SHOPPING')
  if (daLoja.length > 1) return erro(422, 'CUPONS_INCOMPATIVEIS', 'Só dá para usar um cupom da loja por compra.')
  if (doShopping.length > 1) {
    return erro(422, 'CUPONS_INCOMPATIVEIS', 'Só dá para usar um voucher do shopping por compra.')
  }

  // O cupom da loja calcula sobre o valor bruto; o voucher do shopping, sobre o que sobrou.
  let restante = bruto
  const descontos = [...daLoja, ...doShopping].map((cupom) => {
    const base = cupom.origem === 'SHOPPING' ? restante : bruto
    const cheio = cupom.tipo === 'PERCENTUAL' ? Math.floor((base * cupom.valor) / 100) : cupom.tipo === 'VALOR' ? cupom.valor : 0
    const centavos = Math.min(cheio, restante)
    restante -= centavos
    return { cupom: cupom.id, centavos }
  })
  const voucher = descontos.find((d) => d.centavos > 0 && doShopping.some((c) => c.id === d.cupom))

  return {
    cliente,
    reserva,
    usados,
    previa: {
      valorBrutoCentavos: bruto,
      descontos,
      valorPagoCentavos: restante,
      pontosGerados: Math.floor(restante / 100),
      reembolsoGerado: voucher ?? null,
    },
  }
}

export function calcularPrevia(pedido: PedidoMock): RespostaMock {
  const calculo = calcular(pedido)
  return 'status' in calculo ? calculo : ok(calculo.previa)
}

export function registrarCompra(pedido: PedidoMock): RespostaMock {
  const calculo = calcular(pedido)
  if ('status' in calculo) return calculo
  const { cliente, reserva, usados, previa } = calculo

  banco.compras += 1
  const compra: Compra = { id: novoId('co'), ...previa }
  cliente.pontos += compra.pontosGerados
  for (const cupom of usados) {
    const centavos = compra.descontos.find((d) => d.cupom === cupom.id)?.centavos ?? 0
    banco.usos.push({ cupomId: cupom.id, clienteId: cliente.id, compraId: compra.id, centavos })
  }
  if (reserva) reserva.status = 'RETIRADA'
  return ok(compra, 201)
}
