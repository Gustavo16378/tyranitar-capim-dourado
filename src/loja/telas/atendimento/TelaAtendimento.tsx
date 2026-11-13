// Atendimento (RF18, RF19). O molde das telas do painel: docs/como-fazer-uma-tela.md
// explica cada peça. O vendedor lê o QR da carteira, vê a ficha, as reservas e os cupons
// do cliente e registra a compra, que vira pontos na carteira dele.
//
//   TelaAtendimento      cabeçalho com o resumo das reservas e, embaixo, uma das duas fases:
//   ├─ LeitorQR          1. esperando o QR (câmera com html5-qrcode ou "Simular leitura")
//   └─ ClienteLido       2. QR lido: GET /api/loja/atendimento/{qr} e os quatro estados
//      ├─ FichaCliente, ReservaStatus
//      └─ RegistrarCompra → POST /api/loja/compras → Recibo (pontos somando)
import { useState } from 'react'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { ClienteLido } from './ClienteLido'
import { LeitorQR, type Leitura } from './LeitorQR'
import { ResumoReservas } from './ResumoReservas'

export function TelaAtendimento() {
  const ref = useEntrada<HTMLDivElement>()
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  // Conta as compras registradas: trocar a key do resumo faz ele buscar as reservas de novo.
  const [compras, setCompras] = useState(0)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Atendimento"
        descricao="Leia o QR da carteira do cliente para ver o que ele procura, as reservas e os cupons, e registrar a compra."
      >
        <ResumoReservas key={compras} />
      </CabecalhoTela>

      {leitura ? (
        <ClienteLido
          key={leitura.qr}
          leitura={leitura}
          aoRegistrar={() => setCompras((n) => n + 1)}
          aoTerminar={() => setLeitura(null)}
        />
      ) : (
        <div data-anim>
          <LeitorQR aoLer={setLeitura} />
        </div>
      )}
    </div>
  )
}
