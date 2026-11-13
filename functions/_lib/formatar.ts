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
