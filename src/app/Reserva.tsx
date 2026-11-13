import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import { comoErroApi, obterReserva, pagarReserva, useDados, type ErroApi } from '../api'
import { Button, formatarPreco, Icon, ReservaStatus } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import type { Reserva as RespostaReserva, ReservaDetalhe } from '../tipos'
import { Carregando, ErroTela, Esqueleto } from './Estados'
import { FolhaCancelarReserva } from './FolhaCancelarReserva'
import { nomeDoPiso, prazoDaReserva } from './formatos'

const EM_ABERTO = ['PENDENTE', 'CONFIRMADA', 'SEPARADA']

/**
 * Reserva: o Pix simulado (quando o cliente escolheu pagar agora) e depois a reserva confirmada,
 * com o status e os próximos passos. Abre pelo link (/reserva/{id}), lendo GET /api/reservas/{id}.
 * Em aberto, dá para cancelar, com confirmação: o produto volta para a loja.
 */
export default function Reserva() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const lida = useDados(() => obterReserva(id), id)
  // A resposta do pagamento ou do cancelamento atualiza a reserva lida sem carregar tudo de novo.
  const [atualizada, setAtualizada] = useState<RespostaReserva | null>(null)
  const [pagando, setPagando] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const reserva: ReservaDetalhe | null =
    lida.tipo === 'ok' ? { ...lida.dados, ...(atualizada?.id === lida.dados.id ? atualizada : {}) } : null
  const emAberto = reserva !== null && EM_ABERTO.includes(reserva.status)
  const esperandoPix = emAberto && reserva?.formaPagamento === 'PIX' && !reserva.pago
  const tela = useEntrada<HTMLDivElement>([lida.tipo, esperandoPix, reserva?.status])
  // Cancelada aqui, o botão tocado some com a tela: o foco vai para o título da reserva cancelada.
  const tituloCancelada = useRef<HTMLHeadingElement>(null)
  const canceladaAgora = atualizada?.status === 'CANCELADA'
  useEffect(() => {
    if (canceladaAgora) tituloCancelada.current?.focus()
  }, [canceladaAgora])

  async function pagar(idReserva: string) {
    setPagando(true)
    setErro(null)
    try {
      setAtualizada(await pagarReserva(idReserva))
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setPagando(false)
    }
  }

  if (!reserva) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <title>{`Reserva · ${APP_NOME}`}</title>
        <h1 className="text-title-lg">Sua reserva</h1>
        {lida.tipo === 'carregando' && (
          <Carregando className="flex flex-col gap-5">
            <Esqueleto className="h-5 w-2/3" />
            <Esqueleto className="h-[164px]" />
          </Carregando>
        )}
        {lida.tipo === 'erro' && (
          <>
            {/* Reserva que não existe (ou é de outra pessoa) não volta tentando de novo. */}
            <ErroTela erro={lida.erro} onTentar={lida.erro.status === 404 ? undefined : lida.recarregar} />
            <Button variant="primary" onClick={() => navigate('/inicio')}>
              Ir para o início
            </Button>
          </>
        )}
      </div>
    )
  }

  const { produto } = reserva
  // O produto pode ter saído do catálogo: a reserva continua valendo.
  const nome = produto?.nome ?? 'Produto reservado'

  const cancelar = (
    <>
      <Button variant="ghost" block disabled={pagando} onClick={() => setConfirmandoCancelar(true)}>
        Cancelar reserva
      </Button>
      <FolhaCancelarReserva
        reserva={confirmandoCancelar ? reserva : null}
        onFechar={() => setConfirmandoCancelar(false)}
        onCancelada={(cancelada) => {
          setAtualizada(cancelada)
          setConfirmandoCancelar(false)
        }}
      />
    </>
  )

  if (esperandoPix) {
    return (
      <div ref={tela} className="flex min-h-full flex-col gap-5 px-4 py-6">
        <title>{`Pague com Pix · ${APP_NOME}`}</title>
        <div data-anim>
          <h1 className="text-title-lg">Pague com Pix</h1>
          <p className="mt-0.5 text-body-sm text-ink-muted">
            {nome} · {formatarPreco(reserva.precoCentavos)}
          </p>
        </div>
        <div data-anim className="flex flex-col items-center gap-2 rounded-md border bg-surface-raised p-6">
          {/* O QR fica sempre sobre fundo claro, nos dois temas. */}
          <div className="rounded-sm bg-on-terra p-3 text-terra">
            <QRCodeSVG
              value={reserva.pix?.copiaECola ?? reserva.id}
              level="M"
              size={152}
              bgColor="transparent"
              fgColor="currentColor"
              title="QR code do Pix"
            />
          </div>
          <p className="text-caption text-ink-muted">Pix simulado para a demonstração</p>
        </div>
        {erro && <ErroTela erro={erro} />}
        <div data-anim className="mt-auto flex flex-col gap-2">
          <Button variant="primary" size="lg" block disabled={pagando} onClick={() => pagar(reserva.id)}>
            {pagando ? 'Confirmando…' : 'Já paguei'}
          </Button>
          {cancelar}
        </div>
      </div>
    )
  }

  if (reserva.status === 'CANCELADA' || reserva.status === 'EXPIRADA') {
    return (
      <div ref={tela} className="flex flex-col gap-5 px-4 py-6">
        <title>{`Reserva · ${APP_NOME}`}</title>
        <h1 ref={tituloCancelada} tabIndex={-1} data-anim className="text-title-lg outline-none">
          {reserva.status === 'CANCELADA' ? 'Reserva cancelada' : 'Reserva expirada'}
        </h1>
        <p data-anim className="text-body-sm text-ink-muted">
          {nome} voltou para o estoque da loja. Você pode reservar de novo.
        </p>
        {reserva.estornoSolicitado && (
          <p data-anim className="rounded-md bg-cerrado-soft px-4 py-3 text-body-sm text-cerrado-ink">
            O estorno do Pix foi pedido. Na demonstração, ele é simulado, como o pagamento.
          </p>
        )}
        <div data-anim>
          <Button
            variant="primary"
            onClick={() => navigate(produto ? `/produto/${encodeURIComponent(produto.id)}` : '/inicio')}
          >
            {produto ? 'Ver o produto' : 'Ir para o início'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={tela} className="flex min-h-full flex-col gap-5 px-4 py-6">
      <title>{`Reserva confirmada · ${APP_NOME}`}</title>
      <div data-anim className="flex items-center gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-full bg-cerrado text-on-cerrado">
          <Icon name="check" />
        </span>
        <h1 className="text-title-lg">Separado para você</h1>
      </div>
      <p data-anim className="text-body-sm text-ink-muted">
        A loja já foi avisada. Mostre o QR da carteira no balcão.
      </p>
      <div data-anim>
        <ReservaStatus
          produto={nome}
          loja={produto ? `${produto.loja.nome} · ${nomeDoPiso(produto.loja.piso)}` : ''}
          status={reserva.status}
          pago={reserva.pago}
          prazo={reserva.pago ? undefined : prazoDaReserva(reserva.expiraEm)}
        />
      </div>
      <div data-anim className="mt-auto flex flex-col gap-2">
        <div className="flex gap-2">
          <Button block onClick={() => navigate('/carteira')}>
            Abrir carteira
          </Button>
          {produto && (
            <Button
              variant="primary"
              block
              icon="mapa"
              onClick={() => navigate(`/mapa?loja=${encodeURIComponent(produto.loja.mapaId)}`)}
            >
              Como chegar
            </Button>
          )}
        </div>
        {/* Retirada não cancela mais. */}
        {emAberto && cancelar}
      </div>
    </div>
  )
}
