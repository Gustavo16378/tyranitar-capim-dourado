import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, formatarPreco, ReservaStatus, type BadgeProps } from '../../../componentes'
import type { ReservaDaLoja, StatusPedidoPelaLoja } from '../../../tipos/loja'
import { mudarStatusReserva, useAcao } from '../../api'
import { Erro } from '../../comum/Estados'
import { formatarDataHora, prazoRestante } from '../../comum/formatos'
import { ROTULO_DO_STATUS, TRANSICOES_DA_LOJA } from '../../comum/reserva'
import { urlDaTela } from '../../enderecos'

interface CartaoReservaProps {
  reserva: ReservaDaLoja
  /** Date.now() da lista, para todos os prazos andarem juntos. */
  agora: number
  aoMudar: (reserva: ReservaDaLoja, mensagem: string) => void
}

/** O prazo só vira selo de aviso quando aperta: 4 horas ou menos. */
const PRAZO_CURTO = 4 * 60 * 60 * 1000

/** Uma reserva: o andamento (ReservaStatus) e o que a loja pode fazer com ela agora. */
export function CartaoReserva({ reserva, agora, aoMudar }: CartaoReservaProps) {
  const { produto, cliente, status, pago, expiraEm } = reserva
  const resumo = `${cliente} · ${formatarPreco(reserva.precoCentavos * reserva.quantidade)}`
  const ativa = status === 'PENDENTE' || status === 'CONFIRMADA' || status === 'SEPARADA'

  if (status === 'CANCELADA' || status === 'EXPIRADA') {
    return <ReservaEncerrada reserva={reserva} resumo={resumo} />
  }

  const apertado = ativa && new Date(expiraEm).getTime() - agora <= PRAZO_CURTO
  return (
    <div className="flex flex-col gap-2">
      <ReservaStatus
        produto={produto}
        loja={ativa ? `${resumo} · até ${formatarDataHora(expiraEm)}` : resumo}
        status={status}
        pago={pago}
        prazo={apertado ? prazoRestante(expiraEm, agora) : undefined}
      />
      {ativa && <AcoesDaReserva reserva={reserva} aoMudar={aoMudar} />}
    </div>
  )
}

const TOM_ENCERRADA: Record<'CANCELADA' | 'EXPIRADA', BadgeProps['tone']> = {
  CANCELADA: 'neutral',
  EXPIRADA: 'aviso',
}

function ReservaEncerrada({ reserva, resumo }: { reserva: ReservaDaLoja; resumo: string }) {
  const status = reserva.status as 'CANCELADA' | 'EXPIRADA'
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-raised px-5 py-4">
      <div>
        <div className="text-label">{reserva.produto}</div>
        <div className="text-body-sm text-ink-muted">{resumo}</div>
      </div>
      <Badge tone={TOM_ENCERRADA[status]} icon={status === 'EXPIRADA' ? 'relogio' : undefined}>
        {ROTULO_DO_STATUS[status]}
      </Badge>
    </article>
  )
}

// O que cada botão diz e a frase depois que deu certo.
const ACAO: Record<Exclude<StatusPedidoPelaLoja, 'RETIRADA'>, { botao: string; feito: string }> = {
  CONFIRMADA: { botao: 'Confirmar', feito: 'Reserva confirmada' },
  SEPARADA: { botao: 'Separar', feito: 'Reserva separada' },
  CANCELADA: { botao: 'Cancelar', feito: 'Reserva cancelada; o produto voltou ao estoque' },
}

function AcoesDaReserva({ reserva, aoMudar }: Omit<CartaoReservaProps, 'agora'>) {
  const navegar = useNavigate()
  const mudar = useAcao(mudarStatusReserva)
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)
  const proximos = TRANSICOES_DA_LOJA[reserva.status]

  async function aplicar(status: Exclude<StatusPedidoPelaLoja, 'RETIRADA'>) {
    const atualizada = await mudar.executar(reserva.id, status)
    if (atualizada) aoMudar(atualizada, ACAO[status].feito)
  }

  if (confirmandoCancelamento) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-perigo-soft p-3">
        <p className="text-body-sm text-perigo-ink">
          Cancelar a reserva de {reserva.cliente}? O produto volta ao estoque e o cliente é avisado.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="danger" disabled={mudar.enviando} onClick={() => aplicar('CANCELADA')}>
            {mudar.enviando ? 'Cancelando…' : 'Cancelar reserva'}
          </Button>
          <Button size="sm" variant="ghost" disabled={mudar.enviando} onClick={() => setConfirmandoCancelamento(false)}>
            Voltar
          </Button>
        </div>
        {mudar.erro && <Erro erro={mudar.erro} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {proximos.includes('CONFIRMADA') && (
          <Button size="sm" disabled={mudar.enviando} onClick={() => aplicar('CONFIRMADA')}>
            {ACAO.CONFIRMADA.botao}
          </Button>
        )}
        {proximos.includes('SEPARADA') && (
          <Button size="sm" disabled={mudar.enviando} onClick={() => aplicar('SEPARADA')}>
            {ACAO.SEPARADA.botao}
          </Button>
        )}
        {proximos.includes('RETIRADA') && (
          // A retirada soma pontos: ela é registrada no Atendimento, lendo o QR do cliente.
          <Button size="sm" variant="ghost" icon="seta" onClick={() => navegar(urlDaTela('atendimento'))}>
            Entregar no Atendimento
          </Button>
        )}
        {proximos.includes('CANCELADA') && (
          <Button size="sm" variant="ghost" disabled={mudar.enviando} onClick={() => setConfirmandoCancelamento(true)}>
            {ACAO.CANCELADA.botao}
          </Button>
        )}
      </div>
      {mudar.erro && <Erro erro={mudar.erro} />}
    </div>
  )
}
