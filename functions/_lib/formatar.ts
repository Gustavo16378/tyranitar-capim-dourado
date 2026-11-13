// Textos para o cliente, no mesmo formato do app (src/componentes/formatar.ts).

const MILHAR = /\B(?=(\d{3})+(?!\d))/g

/** 39990 → "R$ 399,90" */
export function formatarPreco(centavos: number) {
  return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',').replace(MILHAR, '.')
}

/** 1 → "Térreo"; 2 → "2º piso" (praça de alimentação). */
export function nomeDoPiso(piso: number) {
  return piso === 2 ? '2º piso' : 'Térreo'
}

/** 116.1 → "116,1 m²"; 1117.22 → "1.117,2 m²" (uma casa, como o painel do shopping). */
export function formatarArea(m2: number) {
  const [inteiro, decimal] = (Math.round(m2 * 10) / 10).toFixed(1).split('.')
  return `${inteiro.replace(MILHAR, '.')}${decimal === '0' ? '' : `,${decimal}`} m²`
}
