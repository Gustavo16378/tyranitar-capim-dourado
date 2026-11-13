import { Link, useNavigate } from 'react-router'
import { Badge, Button } from '../componentes'
import type { ReservaNaCarteira } from '../tipos'
import { Vazio } from './Estados'
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

/** As reservas em aberto na carteira: o status, o prazo e o caminho até a loja. */
export function MinhasReservas({ reservas }: { reservas: ReservaNaCarteira[] }) {
  const navigate = useNavigate()
  return (
    <section aria-labelledby="titulo-reservas" className="flex flex-col gap-3">
      <h2 id="titulo-reservas" className="text-title-sm text-marrom-ink">
        Minhas reservas
      </h2>
      {reservas.length === 0 ? (
        <Vazio>Nenhuma reserva em aberto. Peça à Capi para separar um produto para você.</Vazio>
      ) : (
        <ul className="flex flex-col gap-3">
          {reservas.map((reserva) => {
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
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="mapa"
                    onClick={() => navigate(`/mapa?loja=${encodeURIComponent(reserva.loja.mapaId)}`)}
                  >
                    Como chegar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
