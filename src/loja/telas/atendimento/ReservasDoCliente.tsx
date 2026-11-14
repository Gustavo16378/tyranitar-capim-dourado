import { useId } from 'react'
import { Badge, Button, formatarPreco, MiniaturaProduto, type BadgeProps } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import type { Atendimento, ReservaDoCliente, StatusReserva } from '../../../tipos/loja'
import { mudarStatusReserva, useAcao } from '../../api'
import { useAvisoDeReservas } from '../../avisos/contexto'
import { Erro, Vazio } from '../../../painel/comum/Estados'
import { detalheDaReserva, ROTULO_DO_STATUS } from '../../comum/reserva'
import { temReserva, type ItemNoCarrinho } from './carrinho'

interface ReservasDoClienteProps {
  atendimento: Atendimento
  /** O atendimento está sendo buscado de novo: a lista fica mais clara. */
  atualizando: boolean
  carrinho: ItemNoCarrinho[]
  /** A compra já foi registrada: nada mais entra nela. */
  registrada: boolean
  aoRetirar: (reservaId: string) => void
  /** Uma reserva pendente foi confirmada aqui: o atendimento busca de novo. */
  aoConfirmar: () => void
}

/**
 * As reservas da cliente nesta loja, em aberto: o produto, o tamanho, o valor (com o cupom da
 * reserva) e se já foi paga. "Retirar" põe a reserva na compra do caixa; a pendente precisa ser
 * confirmada antes, e dá para confirmar aqui mesmo, com a cliente no balcão.
 */
export function ReservasDoCliente({ atendimento, atualizando, carrinho, registrada, aoRetirar, aoConfirmar }: ReservasDoClienteProps) {
  const idTitulo = useId()
  const { cliente, reservas } = atendimento

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3">
      <h2 id={idTitulo} className="text-title-sm">
        Reservas nesta loja
      </h2>
      {reservas.length === 0 ? (
        <Vazio ilustracao="sacola" compacto>
          {cliente.nome} não tem reservas em aberto nesta loja.
        </Vazio>
      ) : (
        <ul
          aria-busy={atualizando}
          className={cx('flex flex-col gap-3 transition-opacity duration-rapida', atualizando && 'opacity-60')}
        >
          {reservas.map((reserva) => (
            <li key={reserva.id}>
              <ReservaNoBalcao
                reserva={reserva}
                naCompra={temReserva(carrinho, reserva.id)}
                registrada={registrada}
                aoRetirar={() => aoRetirar(reserva.id)}
                aoConfirmar={aoConfirmar}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const SELO: Partial<Record<StatusReserva, Pick<BadgeProps, 'tone' | 'icon'>>> = {
  PENDENTE: { tone: 'ouro' },
  CONFIRMADA: { tone: 'neutral', icon: 'check' },
  SEPARADA: { tone: 'cerrado', icon: 'check' },
}

interface ReservaNoBalcaoProps {
  reserva: ReservaDoCliente
  naCompra: boolean
  registrada: boolean
  aoRetirar: () => void
  aoConfirmar: () => void
}

function ReservaNoBalcao({ reserva, naCompra, registrada, aoRetirar, aoConfirmar }: ReservaNoBalcaoProps) {
  const idTitulo = useId()
  const confirmar = useAcao(mudarStatusReserva)
  const { recarregar: recontarPendentes } = useAvisoDeReservas()
  const detalhe = detalheDaReserva(reserva)

  async function confirmarAgora() {
    // Sem a hora: a cliente está no balcão, então a reserva fica pronta agora.
    if (!(await confirmar.executar(reserva.id, { status: 'CONFIRMADA' }))) return
    aoConfirmar()
    recontarPendentes()
  }

  return (
    <article aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised px-4 py-3">
      <div className="flex items-start gap-3">
        <MiniaturaProduto foto={reserva.foto} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 id={idTitulo} className="text-label">
            {reserva.produto}
          </h3>
          {detalhe && <p className="text-body-sm text-ink-muted">{detalhe}</p>}
          <p className="text-body-sm">
            <span className="font-semibold tabular-nums">{formatarPreco(reserva.precoCentavos)}</span>
            {reserva.descontoCentavos > 0 && (
              <span className="text-ink-muted"> · era {formatarPreco(reserva.brutoCentavos)}</span>
            )}
          </p>
          {reserva.cupom && <p className="text-body-sm text-ink-muted">Cupom da reserva: {reserva.cupom.titulo}</p>}
        </div>
        <Badge {...SELO[reserva.status]}>{ROTULO_DO_STATUS[reserva.status]}</Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {reserva.pago ? (
          <Badge tone="cerrado" icon="check">
            Já pago com Pix
          </Badge>
        ) : (
          <Badge>Pagar no caixa</Badge>
        )}
        {!registrada && reserva.podeRetirar && naCompra && (
          <Badge tone="cerrado" icon="check">
            Na compra
          </Badge>
        )}
        {!registrada && reserva.podeRetirar && !naCompra && (
          <Button size="sm" icon="mais" aria-label={`Retirar ${reserva.produto}`} onClick={aoRetirar}>
            Retirar
          </Button>
        )}
      </div>

      {!registrada && reserva.status === 'PENDENTE' && (
        <div className="flex flex-col gap-2 rounded-sm bg-surface-sunken p-3">
          <p className="text-body-sm text-ink-muted">Confirme a reserva antes de entregar.</p>
          <div>
            <Button size="sm" disabled={confirmar.enviando} onClick={confirmarAgora}>
              {confirmar.enviando ? 'Confirmando…' : 'Confirmar agora'}
            </Button>
          </div>
          {confirmar.erro && <Erro erro={confirmar.erro} />}
        </div>
      )}
    </article>
  )
}
