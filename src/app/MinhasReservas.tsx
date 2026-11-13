import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge, Button } from '../componentes'
import type { Reserva, ReservaNaCarteira } from '../tipos'
import { Vazio } from './Estados'
import { FolhaCancelarReserva } from './FolhaCancelarReserva'
import { nomeDoPiso, prazoDaReserva } from './formatos'

/** O passo da reserva, com as mesmas palavras do ReservaStatus da tela da reserva. */
function passo(status: ReservaNaCarteira['status']) {
  return status === 'SEPARADA'
    ? { rotulo: 'Separada pela loja', tom: 'cerrado' as const, icone: 'check' as const }
    : { rotulo: 'Reserva feita', tom: 'ouro' as const, icone: 'relogio' as const }
}

/** "Paga · expira em 47 h", "Pagar na loja · expira em 3 h". */
function pagamento(reserva: ReservaNaCarteira) {
  const prazo = prazoDaReserva(reserva.expiraEm)
  return `${reserva.pago ? 'Paga' : 'Pagar na loja'} · ${prazo.charAt(0).toLowerCase()}${prazo.slice(1)}`
}

/** O aviso depois de cancelar, com o estorno quando a reserva estava paga por Pix. */
function avisoDoCancelamento(produto: string, cancelada: Reserva) {
  const estorno = cancelada.estornoSolicitado ? ' O estorno do Pix foi pedido.' : ''
  return `Reserva de ${produto} cancelada. O produto voltou para a loja.${estorno}`
}

/**
 * As reservas em aberto na carteira: o status, o prazo, o caminho até a loja e o cancelar, com
 * confirmação. A cancelada sai da lista na hora, sem carregar a carteira de novo.
 */
export function MinhasReservas({ reservas }: { reservas: ReservaNaCarteira[] }) {
  const navigate = useNavigate()
  const titulo = useRef<HTMLHeadingElement>(null)
  const [canceladas, setCanceladas] = useState<string[]>([])
  const [aviso, setAviso] = useState('')
  const [cancelando, setCancelando] = useState<ReservaNaCarteira | null>(null)
  const emAberto = reservas.filter((r) => !canceladas.includes(r.id))

  function aoCancelar(cancelada: Reserva) {
    setCanceladas((atuais) => [...atuais, cancelada.id])
    setAviso(avisoDoCancelamento(cancelando?.produto ?? 'produto', cancelada))
    setCancelando(null)
    // O botão tocado sumiu com a reserva: o foco volta para o título da seção.
    requestAnimationFrame(() => titulo.current?.focus())
  }

  return (
    <section aria-labelledby="titulo-reservas" className="flex flex-col gap-3">
      <h2 ref={titulo} id="titulo-reservas" tabIndex={-1} className="text-title-sm text-marrom-ink outline-none">
        Minhas reservas
      </h2>
      {/* Sempre na tela, para o leitor de tela anunciar o aviso; vazia, não soma espaço. */}
      <div role="status" className="empty:-mt-3">
        {aviso && <p className="rounded-md bg-cerrado-soft px-4 py-3 text-body-sm text-cerrado-ink">{aviso}</p>}
      </div>
      {emAberto.length === 0 ? (
        <Vazio>Nenhuma reserva em aberto. Peça à Capi para separar um produto para você.</Vazio>
      ) : (
        <ul className="flex flex-col gap-3">
          {emAberto.map((reserva) => {
            const { rotulo, tom, icone } = passo(reserva.status)
            return (
              <li key={reserva.id} className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4">
                {/* O cartão abre a reserva, com o passo a passo e o Pix. */}
                <Link
                  to={`/reserva/${encodeURIComponent(reserva.id)}`}
                  className="flex items-start justify-between gap-3 rounded-sm text-ink no-underline"
                >
                  <span className="min-w-0">
                    <span className="block text-label">{reserva.produto}</span>
                    <span className="block text-body-sm text-ink-muted">
                      {reserva.loja.nome} · {nomeDoPiso(reserva.loja.piso)}
                    </span>
                  </span>
                  <span className="flex-none">
                    <Badge tone={tom} icon={icone}>
                      {rotulo}
                    </Badge>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-caption text-ink-muted">{pagamento(reserva)}</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Cancelar reserva de ${reserva.produto}`}
                      onClick={() => setCancelando(reserva)}
                    >
                      Cancelar reserva
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="mapa"
                      onClick={() => navigate(`/mapa?loja=${encodeURIComponent(reserva.loja.mapaId)}`)}
                    >
                      Como chegar
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <FolhaCancelarReserva reserva={cancelando} onFechar={() => setCancelando(null)} onCancelada={aoCancelar} />
    </section>
  )
}
