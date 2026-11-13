import { useState } from 'react'
import { cancelarReserva, comoErroApi, type ErroApi } from '../api'
import { Button } from '../componentes'
import type { Reserva } from '../tipos'
import { ErroTela } from './Estados'
import { Folha } from './Folha'

export interface FolhaCancelarReservaProps {
  /** A reserva a cancelar; null deixa a folha fechada. */
  reserva: { id: string; pago: boolean } | null
  onFechar: () => void
  /** A reserva já cancelada, como a API devolveu. */
  onCancelada: (reserva: Reserva) => void
}

/**
 * A confirmação antes de cancelar uma reserva, na carteira e na tela da reserva. Cancelada, o
 * produto volta para a loja; paga por Pix, o estorno (simulado, como o Pix) é pedido junto.
 */
export function FolhaCancelarReserva({ reserva, onFechar, onCancelada }: FolhaCancelarReservaProps) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)

  function fechar() {
    setErro(null)
    onFechar()
  }

  async function confirmar(id: string) {
    setEnviando(true)
    setErro(null)
    try {
      onCancelada(await cancelarReserva(id))
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha aberta={reserva !== null} onFechar={fechar} titulo="Cancelar reserva">
      {reserva && (
        <>
          <p className="text-body">O produto volta para a loja. Quer cancelar?</p>
          {reserva.pago && (
            <p className="text-body-sm text-ink-muted">
              Você já pagou com Pix: o estorno é pedido na hora. Na demonstração, ele é simulado, como o pagamento.
            </p>
          )}
          {erro && <ErroTela erro={erro} />}
          <div className="flex flex-col gap-2">
            <Button variant="danger" block disabled={enviando} onClick={() => confirmar(reserva.id)}>
              {enviando ? 'Cancelando…' : 'Sim, cancelar'}
            </Button>
            <Button block disabled={enviando} onClick={fechar}>
              Não, manter a reserva
            </Button>
          </div>
        </>
      )}
    </Folha>
  )
}
