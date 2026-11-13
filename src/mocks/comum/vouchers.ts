// Os vouchers do shopping (cupons sem loja, RN11), um armazém só para os mocks da loja e do
// shopping: o voucher criado no painel do shopping já vale no Atendimento da loja, e o uso
// dele no caixa vira reembolso (mocks/comum/reembolsos.ts). Fica na memória.
import type { NivelApi, TipoCupom } from '../../tipos/comum'
import { hojeEmPalmas } from '../../painel/comum/formatos'

/** Um cupom como o banco guarda (tabela cupom). Sem loja, é voucher do shopping. */
export interface CupomMock {
  id: string
  titulo: string
  /** LOJA: de uma loja. SHOPPING: voucher do shopping, vale em qualquer loja. */
  origem: 'LOJA' | 'SHOPPING'
  tipo: TipoCupom
  /** PERCENTUAL: 1 a 100. VALOR: centavos. BRINDE: 0. */
  valor: number
  categoriaAlvo: string | null
  nivelMinimo: NivelApi
  limitePorCliente: number
  /** Último dia de uso: "2026-12-31". */
  validade: string
  ativo: boolean
}

/** A data daqui a tantos dias (negativo: no passado), para as validades não vencerem com o tempo. */
export function emDias(dias: number) {
  return hojeEmPalmas(Date.now() + dias * 24 * 60 * 60 * 1000)
}

/** Cupom com os valores que quase todo cupom tem; passe só o que muda. */
export function cupomMock(c: Partial<CupomMock> & Pick<CupomMock, 'id' | 'titulo' | 'origem' | 'tipo' | 'valor'>): CupomMock {
  return {
    categoriaAlvo: null,
    nivelMinimo: 'SEMENTE',
    limitePorCliente: 1,
    validade: emDias(48),
    ativo: true,
    ...c,
  }
}

function iniciais(): CupomMock[] {
  return [
    cupomMock({ id: 'cp2', titulo: 'R$ 20 do shopping', origem: 'SHOPPING', tipo: 'VALOR', valor: 2000, validade: emDias(32) }),
    cupomMock({
      id: 'cp-estacionamento',
      titulo: 'Estacionamento grátis por 2 h',
      origem: 'SHOPPING',
      tipo: 'BRINDE',
      valor: 0,
      nivelMinimo: 'CAPIM',
      limitePorCliente: 2,
      validade: emDias(17),
    }),
    cupomMock({
      id: 'cp-dourado',
      titulo: 'R$ 50 para clientes Dourado',
      origem: 'SHOPPING',
      tipo: 'VALOR',
      valor: 5000,
      nivelMinimo: 'DOURADO',
      validade: emDias(60),
    }),
    cupomMock({
      id: 'cp-semana-do-cliente',
      titulo: '10% na Semana do Cliente',
      origem: 'SHOPPING',
      tipo: 'PERCENTUAL',
      valor: 10,
      validade: emDias(-20),
    }),
  ]
}

let vouchers = iniciais()

export function todosOsVouchers() {
  return vouchers
}

export function guardarVoucher(voucher: CupomMock) {
  vouchers.push(voucher)
}

export function reiniciarVouchers() {
  vouchers = iniciais()
}
