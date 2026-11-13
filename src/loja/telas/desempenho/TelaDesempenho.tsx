import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../comum/CabecalhoTela'
import { EmMontagem } from '../../comum/EmMontagem'

export function TelaDesempenho() {
  const ref = useEntrada<HTMLDivElement>()
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela titulo="Desempenho" />
      <EmMontagem />
    </div>
  )
}
