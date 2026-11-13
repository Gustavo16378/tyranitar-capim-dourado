// Cupons (RF23): criar cupons da loja e acompanhar o uso.
//
//   TelaCupons          cabeçalho e o modo da tela: lista ou novo cupom
//   ├─ ListaDeCupons    GET /api/loja/cupons: números do uso e os cupons (CupomTicket)
//   └─ FormularioCupom  POST /api/loja/cupons, com a prévia do cupom como o cliente vê
import { useState } from 'react'
import { Button } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { FormularioCupom } from './FormularioCupom'
import { ListaDeCupons } from './ListaDeCupons'

export function TelaCupons() {
  const ref = useEntrada<HTMLDivElement>()
  const [criando, setCriando] = useState(false)
  const [aviso, setAviso] = useState('')

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Cupons"
        descricao="Os cupons da loja, quantas vezes cada um foi usado e quanto deram de desconto."
      >
        {!criando && (
          <Button variant="primary" onClick={() => setCriando(true)}>
            Novo cupom
          </Button>
        )}
      </CabecalhoTela>

      <div data-anim>
        {criando ? (
          <FormularioCupom
            aoCriar={(cupom) => {
              setAviso(`Cupom criado: ${cupom.titulo}. Ele já aparece para os clientes no atendimento.`)
              setCriando(false)
            }}
            aoVoltar={() => setCriando(false)}
          />
        ) : (
          <ListaDeCupons aviso={aviso} />
        )}
      </div>
    </div>
  )
}
