/**
 * RN07: o cliente ganha 1 ponto a cada R$ 1,00 pago, depois dos descontos, arredondando para
 * baixo. `pontosPorReal` vem da configuração do shopping (padrão 1).
 */
export function pontosDaCompra(valorPagoCentavos: number, pontosPorReal = 1): number {
  if (!Number.isInteger(valorPagoCentavos) || valorPagoCentavos < 0) {
    throw new RangeError('O valor pago precisa ser um inteiro de centavos, zero ou mais.')
  }
  return Math.floor((valorPagoCentavos * pontosPorReal) / 100)
}
