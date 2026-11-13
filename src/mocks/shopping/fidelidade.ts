// GET e PUT /api/shopping/configuracao e GET e POST /api/shopping/cupons (RF28).
import type { ConfiguracaoDoShopping, NivelApi, Lista, VoucherDoShopping } from '../../tipos/shopping'
import { CATEGORIAS_DO_SHOPPING } from '../../painel/comum/categorias'
import { hojeEmPalmas } from '../../painel/comum/formatos'
import { validarCupom } from '../comum/cupons'
import { todosOsReembolsos } from '../comum/reembolsos'
import { dadosInvalidos, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { guardarVoucher, todosOsVouchers, type CupomMock } from '../comum/vouchers'
import { exigirAdmin } from './auth'
import { banco, novoId } from './dados'

const NIVEIS: readonly NivelApi[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']

export function buscarConfiguracao(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  return negado ?? ok(banco.configuracao)
}

const inteiroEntre = (valor: unknown, min: number, max: number) =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= min && valor <= max

/** Valida como a API: devolve a configuração limpa ou a mensagem do primeiro problema. */
export function validarConfiguracao(corpo: unknown): ConfiguracaoDoShopping | string {
  const c = objeto(corpo)
  const niveis = objeto(c?.niveis)
  const prazos = objeto(c?.prazoReservaHoras)
  if (!c || !niveis || !prazos) return 'Envie os níveis, os pontos por real e os prazos.'
  if (niveis.SEMENTE !== 0) return 'O nível Semente começa em 0 ponto.'
  for (const nivel of NIVEIS) {
    if (!inteiroEntre(niveis[nivel], 0, 1_000_000)) return `Os pontos do nível ${nivel} precisam ser um número inteiro.`
  }
  for (let i = 1; i < NIVEIS.length; i++) {
    if ((niveis[NIVEIS[i]] as number) <= (niveis[NIVEIS[i - 1]] as number)) {
      return 'Cada nível precisa de mais pontos que o anterior.'
    }
  }
  if (!inteiroEntre(c.pontosPorReal, 1, 10)) return 'Os pontos por real vão de 1 a 10.'
  if (!inteiroEntre(prazos.NA_LOJA, 1, 24)) return 'A reserva para pagar na loja fica separada de 1 a 24 horas.'
  if (!inteiroEntre(prazos.PIX, 1, 168)) return 'A reserva paga com Pix fica separada de 1 a 168 horas.'
  return {
    niveis: Object.fromEntries(NIVEIS.map((n) => [n, niveis[n]])) as ConfiguracaoDoShopping['niveis'],
    pontosPorReal: c.pontosPorReal as number,
    prazoReservaHoras: { NA_LOJA: prazos.NA_LOJA as number, PIX: prazos.PIX as number },
  }
}

export function salvarConfiguracao(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const configuracao = validarConfiguracao(pedido.corpo)
  if (typeof configuracao === 'string') return dadosInvalidos(configuracao)
  banco.configuracao = configuracao
  return ok(configuracao)
}

/** O uso de um voucher: cada uso com desconto numa loja gerou um reembolso (RN11). */
function paraApi(voucher: CupomMock): VoucherDoShopping {
  const reembolsos = todosOsReembolsos().filter((r) => r.cupomId === voucher.id)
  const { id, titulo, tipo, valor, categoriaAlvo, nivelMinimo, limitePorCliente, validade, ativo } = voucher
  return {
    id,
    titulo,
    tipo,
    valor,
    categoriaAlvo,
    nivelMinimo,
    limitePorCliente,
    validade,
    ativo,
    usos: reembolsos.length,
    descontoCentavos: reembolsos.reduce((soma, r) => soma + r.centavos, 0),
  }
}

export function listarVouchers(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const hoje = hojeEmPalmas()
  const valendo = (v: CupomMock) => v.ativo && v.validade >= hoje
  const vouchers = [...todosOsVouchers()].sort(
    (a, b) => Number(valendo(b)) - Number(valendo(a)) || a.validade.localeCompare(b.validade),
  )
  const resposta: Lista<VoucherDoShopping> = { itens: vouchers.map(paraApi), total: vouchers.length }
  return ok(resposta)
}

export function criarVoucher(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const voucher = validarCupom(
    pedido.corpo,
    CATEGORIAS_DO_SHOPPING.map((c) => c.id),
  )
  if (typeof voucher === 'string') return dadosInvalidos(voucher)
  // Já vale no Atendimento das lojas e aparece na vitrine do app para os clientes do nível.
  const criado: CupomMock = { id: novoId('cp-shopping-'), origem: 'SHOPPING', ativo: true, ...voucher }
  guardarVoucher(criado)
  return ok(paraApi(criado), 201)
}
