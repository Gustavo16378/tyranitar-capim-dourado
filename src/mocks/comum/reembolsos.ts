// Os reembolsos dos vouchers do shopping (RN11), um armazém só para os mocks da loja e do
// shopping: o voucher usado numa compra no Atendimento vira reembolso a receber no Extrato
// da loja, e o painel do shopping vê e marca como pago o mesmo reembolso. Fica na memória
// (recarregar volta ao início); os dois painéis enxergam o mesmo enquanto estão na mesma aba.

export interface ReembolsoMock {
  id: string
  lojaId: string
  compraId: string
  cupomId: string
  centavos: number
  status: 'PENDENTE' | 'PAGO'
  /** ISO 8601 (UTC). */
  criadoEm: string
  pagoEm: string | null
}

const DIA = 24 * 60 * 60 * 1000

/** Data de tantos dias atrás, às `hora` de Palmas (UTC-3). */
export function diasAtras(dias: number, hora = 15) {
  const data = new Date(Date.now() - dias * DIA)
  data.setUTCHours(hora + 3, (dias * 7) % 60, 0, 0)
  return data.toISOString()
}

/** Reembolsos de outras lojas, para o painel do shopping ter o que mostrar. */
function deOutrasLojas(): ReembolsoMock[] {
  const lojas = ['loja-calcados', 'loja-perfumaria', 'loja-moda-masculina', 'loja-otica', 'loja-cafeteria']
  return Array.from({ length: 22 }, (_, i) => {
    const dias = 3 + ((i * 11) % 80)
    const pago = dias > 30
    return {
      id: `re-o${i + 1}`,
      lojaId: lojas[i % lojas.length],
      compraId: `co-o${i + 1}`,
      cupomId: 'cp2',
      centavos: i % 4 === 0 ? 1500 : 2000,
      status: pago ? 'PAGO' : 'PENDENTE',
      criadoEm: diasAtras(dias),
      pagoEm: pago ? diasAtras(dias - 15, 11) : null,
    }
  })
}

/**
 * As compras com voucher do shopping na Loja de esportes (o lojista dos mocks), antes de hoje.
 * O mock da loja cria o histórico de compras com estes ids; mais de 30 dias, já pago.
 */
export const VOUCHERS_DA_LOJA_DE_ESPORTES = [74, 61, 48, 35, 27, 19, 9, 4].map((dias, i) => ({
  compraId: `co-v${i + 1}`,
  dias,
  centavos: 2000,
}))

function iniciais(): ReembolsoMock[] {
  return [
    ...deOutrasLojas(),
    ...VOUCHERS_DA_LOJA_DE_ESPORTES.map(({ compraId, dias, centavos }) => ({
      id: `re-${compraId}`,
      lojaId: 'loja-esportes',
      compraId,
      cupomId: 'cp2',
      centavos,
      status: dias > 30 ? ('PAGO' as const) : ('PENDENTE' as const),
      criadoEm: diasAtras(dias),
      pagoEm: dias > 30 ? diasAtras(dias - 15, 11) : null,
    })),
  ]
}

let reembolsos: ReembolsoMock[] = iniciais()
let proximo = 1

export function todosOsReembolsos() {
  return reembolsos
}

/** Acrescenta um reembolso pendente; devolve o criado. */
export function registrarReembolso(dados: Omit<ReembolsoMock, 'id' | 'status' | 'pagoEm'> & Partial<Pick<ReembolsoMock, 'status' | 'pagoEm'>>) {
  const reembolso: ReembolsoMock = { id: `re${proximo++}`, status: 'PENDENTE', pagoEm: null, ...dados }
  reembolsos.push(reembolso)
  return reembolso
}

/** Volta os reembolsos ao início (os testes dos dois painéis chamam). */
export function reiniciarReembolsos() {
  reembolsos = iniciais()
  proximo = 1
}
