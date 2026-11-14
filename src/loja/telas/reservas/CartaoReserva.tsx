import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, formatarPreco, type BadgeProps } from '../../../componentes'
import type { PedidoMudarStatus, ReservaDaLoja, StatusReserva } from '../../../tipos/loja'
import { mudarStatusReserva, useAcao, type ErroApi } from '../../api'
import { Campo } from '../../../painel/comum/Campo'
import { Erro } from '../../../painel/comum/Estados'
import { formatarDataHora, prazoRestante } from '../../../painel/comum/formatos'
import { fraseDaHoraPronta, horaEmPalmas, proximaMeiaHora, quandoFicaPronta } from '../../comum/horario'
import { detalheDaReserva, ROTULO_DO_STATUS, STATUS_ATIVOS, TRANSICOES_DA_LOJA } from '../../comum/reserva'
import { urlDaTela } from '../../enderecos'

interface CartaoReservaProps {
  reserva: ReservaDaLoja
  /** Date.now() da lista, para todos os prazos andarem juntos. */
  agora: number
  aoMudar: (reserva: ReservaDaLoja, mensagem: string) => void
}

/** O prazo só vira selo de aviso quando aperta: 4 horas ou menos. */
const PRAZO_CURTO = 4 * 60 * 60 * 1000

// O selo de cada status, sempre com a palavra. Separada e retirada em cerrado (pronto, deu certo);
// nova em ouro (pede resposta); expirada em aviso; recusada e cancelada sem cor de alerta.
const SELO: Record<StatusReserva, Pick<BadgeProps, 'tone' | 'icon'>> = {
  PENDENTE: { tone: 'ouro' },
  CONFIRMADA: { tone: 'neutral', icon: 'check' },
  SEPARADA: { tone: 'cerrado', icon: 'check' },
  RETIRADA: { tone: 'cerrado', icon: 'check' },
  CANCELADA: { tone: 'neutral' },
  RECUSADA: { tone: 'neutral' },
  EXPIRADA: { tone: 'aviso', icon: 'relogio' },
}

/**
 * Uma reserva: quem, o quê (tamanho e cor), o valor com o cupom, se já foi paga e o prazo. Em
 * aberto, o que a loja pode fazer agora: confirmar (com a hora em que fica pronta), separar ou
 * recusar (com o motivo). Encerrada, o que aconteceu.
 */
export function CartaoReserva({ reserva, agora, aoMudar }: CartaoReservaProps) {
  const idTitulo = useId()
  const { produto, cliente, status } = reserva
  const ativa = STATUS_ATIVOS.includes(status)
  const detalhe = detalheDaReserva(reserva)

  return (
    <article
      aria-labelledby={idTitulo}
      className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised px-5 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-label">
            {produto}
          </h2>
          <p className="text-body-sm text-ink-muted">
            {cliente}
            {detalhe && ` · ${detalhe}`}
          </p>
        </div>
        <Badge {...SELO[status]}>{ROTULO_DO_STATUS[status]}</Badge>
      </div>

      <DetalhesDaReserva reserva={reserva} agora={agora} />

      {ativa && <AcoesDaReserva reserva={reserva} aoMudar={aoMudar} />}
    </article>
  )
}

/** Valor, cupom, pagamento e prazo, em linhas de rótulo e valor. */
function DetalhesDaReserva({ reserva, agora }: Omit<CartaoReservaProps, 'aoMudar'>) {
  const { status, cupom, expiraEm, prontaEm } = reserva
  const apertado = STATUS_ATIVOS.includes(status) && new Date(expiraEm).getTime() - agora <= PRAZO_CURTO

  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-body-sm">
        <Linha rotulo="Valor">
          <span className="font-semibold tabular-nums">{formatarPreco(reserva.precoCentavos)}</span>
          {reserva.descontoCentavos > 0 && (
            <span className="text-ink-muted"> · era {formatarPreco(reserva.brutoCentavos)}</span>
          )}
        </Linha>
        {cupom && (
          <Linha rotulo="Cupom">
            {cupom.titulo} <span className="text-ink-muted">({cupom.origem === 'LOJA' ? 'da loja' : 'do shopping'})</span>
            {reserva.descontoCentavos > 0 && (
              <span className="tabular-nums text-ink-muted"> · − {formatarPreco(reserva.descontoCentavos)}</span>
            )}
          </Linha>
        )}
        <Linha rotulo="Pagamento">{textoDoPagamento(reserva)}</Linha>
  
        {status === 'PENDENTE' && <Linha rotulo="Responder até">{formatarDataHora(expiraEm)}</Linha>}
        {(status === 'CONFIRMADA' || status === 'SEPARADA') && (
          <>
            {prontaEm && <Linha rotulo="Pronta a partir de">{formatarDataHora(prontaEm)}</Linha>}
            <Linha rotulo="Retirar até">{formatarDataHora(expiraEm)}</Linha>
          </>
        )}
        {status === 'RECUSADA' && reserva.motivoRecusa && <Linha rotulo="Motivo">{reserva.motivoRecusa}</Linha>}
        {!STATUS_ATIVOS.includes(status) && <Linha rotulo="Reservada em">{formatarDataHora(reserva.criadoEm)}</Linha>}
      </dl>
      {apertado && (
        <div>
          <Badge tone="aviso" icon="relogio">
            {prazoRestante(expiraEm, agora)}
          </Badge>
        </div>
      )}
      {/* Saiu depois de paga por Pix: o dinheiro volta para o cliente (simulado). */}
      {reserva.estornoSolicitado && <p className="text-caption text-ink-muted">Estorno do Pix solicitado</p>}
    </div>
  )
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

/** Se e como foi paga. Retirada sem Pix foi paga no caixa; encerrada de outro jeito, não foi paga. */
function textoDoPagamento({ pago, formaPagamento, estornoSolicitado, status }: ReservaDaLoja) {
  if (pago || estornoSolicitado) return 'Pago com Pix'
  if (status === 'RETIRADA') return 'Pago no caixa'
  if (!STATUS_ATIVOS.includes(status)) return 'Sem pagamento'
  return formaPagamento === 'PIX' ? 'Pix ainda não pago' : 'Pagar na loja'
}

type Modo = 'parado' | 'confirmando' | 'recusando'

/**
 * Os botões da reserva em aberto. Confirmar abre a hora em que fica pronta (já com a próxima meia
 * hora); recusar não volta atrás, então pede o motivo e a confirmação no mesmo passo. Separar só
 * depois de confirmar. A retirada é a compra no Atendimento, lendo o QR do cliente.
 */
function AcoesDaReserva({ reserva, aoMudar }: Omit<CartaoReservaProps, 'agora'>) {
  const navegar = useNavigate()
  const mudar = useAcao(mudarStatusReserva)
  const [modo, setModo] = useState<Modo>('parado')
  const proximos = TRANSICOES_DA_LOJA[reserva.status]
  const botaoConfirmar = useRef<HTMLButtonElement>(null)
  const botaoRecusar = useRef<HTMLButtonElement>(null)
  // Ao voltar de um formulário, o foco volta para o botão que o abriu.
  const voltarPara = useRef<'confirmar' | 'recusar' | null>(null)

  useEffect(() => {
    if (modo !== 'parado' || !voltarPara.current) return
    const botao = voltarPara.current === 'confirmar' ? botaoConfirmar.current : botaoRecusar.current
    botao?.focus()
    voltarPara.current = null
  }, [modo])

  function abrir(novo: Modo) {
    mudar.limpar()
    setModo(novo)
  }

  function voltar(de: 'confirmar' | 'recusar') {
    voltarPara.current = de
    mudar.limpar()
    setModo('parado')
  }

  async function enviar(pedido: PedidoMudarStatus) {
    const atualizada = await mudar.executar(reserva.id, pedido)
    if (!atualizada) return
    setModo('parado')
    aoMudar(atualizada, fraseDoResultado(atualizada))
  }

  if (modo === 'confirmando') {
    return <ConfirmarComHora reserva={reserva} enviando={mudar.enviando} erro={mudar.erro} aoEnviar={enviar} aoVoltar={() => voltar('confirmar')} />
  }
  if (modo === 'recusando') {
    return <RecusarComMotivo reserva={reserva} enviando={mudar.enviando} erro={mudar.erro} aoEnviar={enviar} aoVoltar={() => voltar('recusar')} />
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {proximos.includes('CONFIRMADA') && (
          <Button ref={botaoConfirmar} size="sm" icon="check" onClick={() => abrir('confirmando')}>
            Confirmar
          </Button>
        )}
        {proximos.includes('SEPARADA') && (
          <Button size="sm" disabled={mudar.enviando} onClick={() => enviar({ status: 'SEPARADA' })}>
            {mudar.enviando ? 'Separando…' : 'Separar'}
          </Button>
        )}
        {proximos.includes('RETIRADA') && (
          // A retirada soma pontos: ela é registrada no Atendimento, lendo o QR do cliente.
          <Button size="sm" variant="ghost" icon="seta" onClick={() => navegar(urlDaTela('atendimento'))}>
            Entregar no Atendimento
          </Button>
        )}
        {proximos.includes('RECUSADA') && (
          <Button ref={botaoRecusar} size="sm" variant="ghost" disabled={mudar.enviando} onClick={() => abrir('recusando')}>
            Recusar
          </Button>
        )}
      </div>
      {mudar.erro && <Erro erro={mudar.erro} />}
    </div>
  )
}

/** A linha que a lista anuncia depois da ação (ela junta o produto e o cliente). */
function fraseDoResultado(reserva: ReservaDaLoja) {
  if (reserva.status === 'CONFIRMADA') {
    return `Reserva confirmada: pronta a partir das ${horaEmPalmas(reserva.prontaEm ?? Date.now())}`
  }
  if (reserva.status === 'SEPARADA') return 'Reserva separada'
  return reserva.estornoSolicitado
    ? 'Reserva recusada; o produto voltou ao estoque e o estorno do Pix foi pedido'
    : 'Reserva recusada; o produto voltou ao estoque'
}

interface FormularioDaAcaoProps {
  reserva: ReservaDaLoja
  enviando: boolean
  erro: ErroApi | null
  aoEnviar: (pedido: PedidoMudarStatus) => void
  aoVoltar: () => void
}

/** Confirmar: a hora em que fica pronta para retirar, em Palmas. O prazo para retirar conta dela. */
function ConfirmarComHora({ reserva, enviando, erro, aoEnviar, aoVoltar }: FormularioDaAcaoProps) {
  const [agora] = useState(() => Date.now())
  const [hora, setHora] = useState(() => proximaMeiaHora(agora))
  const [erroHora, setErroHora] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!quandoFicaPronta(hora, Date.now())) {
      setErroHora('Informe a hora em que fica pronta, como 15:30.')
      return
    }
    setErroHora(null)
    aoEnviar({ status: 'CONFIRMADA', prontaAs: hora.trim() })
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={`Confirmar a reserva de ${reserva.cliente}`}
      className="flex flex-col gap-3 rounded-md bg-surface-sunken p-3"
    >
      <Campo
        ref={campo}
        rotulo="Pronta para retirar a partir de"
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        dica={fraseDaHoraPronta(hora, agora) ?? undefined}
        erro={erroHora}
        className="max-w-[260px]"
      />
      <p className="text-body-sm text-ink-muted">{reserva.cliente} recebe o aviso com essa hora.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="confirm" icon="check" disabled={enviando}>
          {enviando ? 'Confirmando…' : 'Confirmar reserva'}
        </Button>
        <Button size="sm" variant="ghost" disabled={enviando} onClick={aoVoltar}>
          Voltar
        </Button>
      </div>
      {erro && <Erro erro={erro} />}
    </form>
  )
}

/** Recusar não volta atrás: diz o que acontece, pede o motivo (que o cliente vê) e confirma. */
function RecusarComMotivo({ reserva, enviando, erro, aoEnviar, aoVoltar }: FormularioDaAcaoProps) {
  const [motivo, setMotivo] = useState('')
  const [erroMotivo, setErroMotivo] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const idAviso = useId()

  useEffect(() => campo.current?.focus(), [])

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!motivo.trim()) {
      setErroMotivo('Diga o motivo em poucas palavras. O cliente vê essa frase.')
      return
    }
    setErroMotivo(null)
    aoEnviar({ status: 'RECUSADA', motivo: motivo.trim() })
  }

  const oQueAcontece = juntar([
    'o produto volta ao estoque',
    reserva.cupom && 'o cupom fica livre de novo',
    reserva.pago && 'o estorno do Pix é pedido',
    'o cliente recebe o motivo',
  ])

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={`Recusar a reserva de ${reserva.cliente}`}
      aria-describedby={idAviso}
      className="flex flex-col gap-3 rounded-md bg-perigo-soft p-3"
    >
      <p id={idAviso} className="text-body-sm text-perigo-ink">
        Recusar a reserva de {reserva.cliente}? {primeiraMaiuscula(oQueAcontece)}. Não dá para desfazer.
      </p>
      <Campo
        ref={campo}
        rotulo="Motivo da recusa"
        maxLength={200}
        autoComplete="off"
        placeholder="O último par veio com defeito"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        erro={erroMotivo}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="danger" disabled={enviando}>
          {enviando ? 'Recusando…' : 'Recusar reserva'}
        </Button>
        <Button size="sm" variant="ghost" disabled={enviando} onClick={aoVoltar}>
          Voltar
        </Button>
      </div>
      {erro && <Erro erro={erro} />}
    </form>
  )
}

/** ["a", "b", "c"] → "a, b e c". */
function juntar(partes: (string | false | null)[]) {
  const textos = partes.filter((p): p is string => Boolean(p))
  return textos.length > 1 ? `${textos.slice(0, -1).join(', ')} e ${textos.at(-1)}` : (textos[0] ?? '')
}

function primeiraMaiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
