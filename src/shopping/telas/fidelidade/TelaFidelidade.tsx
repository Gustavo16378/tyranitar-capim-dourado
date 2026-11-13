// Fidelidade e campanhas (RF28): as regras dos níveis e dos pontos, e os vouchers do
// shopping, que valem em qualquer loja e aparecem na vitrine do app.
//
//   TelaFidelidade        cabeçalho e as duas partes, uma de cada vez (um botão primário por vez)
//   ├─ RegrasDaFidelidade GET e PUT /api/shopping/configuracao
//   └─ Vouchers           GET /api/shopping/cupons e o FormularioCupom (POST /api/shopping/cupons)
import { useState } from 'react'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { RegrasDaFidelidade } from './RegrasDaFidelidade'
import { Vouchers } from './Vouchers'

type Parte = 'regras' | 'vouchers'

const PARTES: readonly { valor: Parte; rotulo: string }[] = [
  { valor: 'regras', rotulo: 'Níveis e pontos' },
  { valor: 'vouchers', rotulo: 'Vouchers e campanhas' },
]

export function TelaFidelidade() {
  const ref = useEntrada<HTMLDivElement>()
  const [parte, setParte] = useState<Parte>('regras')

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Fidelidade e campanhas"
        descricao="As regras dos níveis e dos pontos, e os vouchers do shopping: valem em qualquer loja e aparecem na vitrine do app."
      />
      <div data-anim>
        <Segmentos rotulo="Parte da fidelidade" opcoes={PARTES} valor={parte} aoMudar={setParte} />
      </div>
      <div data-anim>{parte === 'regras' ? <RegrasDaFidelidade /> : <Vouchers />}</div>
    </div>
  )
}
