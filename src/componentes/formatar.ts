const MILHAR = /\B(?=(\d{3})+(?!\d))/g

/** 39990 → "R$ 399,90" */
export function formatarPreco(centavos: number) {
  return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',').replace(MILHAR, '.')
}

/** 2140 → "2.140" */
export function formatarNumero(n: number) {
  return String(n).replace(MILHAR, '.')
}
