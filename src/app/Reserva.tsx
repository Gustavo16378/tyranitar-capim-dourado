import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import { comoErroApi, ErroApi, pagarReserva } from '../api'
import { Button, formatarPreco, Icon, ReservaStatus } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { ErroTela } from './Estados'
import type { EstadoReserva } from './FolhaReserva'
import { nomeDoPiso, prazoDaReserva } from './formatos'

function ehEstadoReserva(estado: unknown): estado is EstadoReserva {
  return typeof estado === 'object' && estado !== null && 'reserva' in estado && 'produto' in estado
}

const SEM_DADOS = new ErroApi({
  status: 404,
  erro: 'NAO_ENCONTRADO',
  mensagem:
    'Os detalhes desta reserva não estão abertos neste aparelho. Ela continua valendo: mostre o QR da carteira no balcão.',
})

/**
 * Reserva: o Pix simulado (quando o cliente escolheu pagar agora) e depois a reserva confirmada,
 * com o status e os próximos passos. Os dados chegam da folha de reserva pela navegação.
 */
export default function Reserva() {
  const location = useLocation()
  const navigate = useNavigate()
  const inicial = ehEstadoReserva(location.state) ? location.state : null
  const [reserva, setReserva] = useState(inicial?.reserva ?? null)
  const [pagando, setPagando] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const produto = inicial?.produto
  const esperandoPix = reserva?.formaPagamento === 'PIX' && !reserva.pago
  const tela = useEntrada<HTMLDivElement>([esperandoPix])

  if (!reserva || !produto) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <title>{`Reserva · ${APP_NOME}`}</title>
        <h1 className="text-title-lg">Sua reserva</h1>
        <ErroTela erro={SEM_DADOS} />
        <Button variant="primary" onClick={() => navigate('/carteira')}>
          Abrir carteira
        </Button>
      </div>
    )
  }

  const pagar = async (id: string) => {
    setPagando(true)
    setErro(null)
    try {
      const paga = await pagarReserva(id)
      setReserva(paga)
      // Guarda no histórico, para recarregar a página não voltar para o Pix.
      navigate(location.pathname, { replace: true, state: { reserva: paga, produto } satisfies EstadoReserva })
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setPagando(false)
    }
  }

  if (esperandoPix) {
    return (
      <div ref={tela} className="flex min-h-full flex-col gap-5 px-4 py-6">
        <title>{`Pague com Pix · ${APP_NOME}`}</title>
        <div data-anim>
          <h1 className="text-title-lg">Pague com Pix</h1>
          <p className="mt-0.5 text-body-sm text-ink-muted">
            {produto.nome} · {formatarPreco(reserva.precoCentavos)}
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
        <div data-anim className="mt-auto">
          <Button variant="primary" size="lg" block disabled={pagando} onClick={() => pagar(reserva.id)}>
            {pagando ? 'Confirmando…' : 'Já paguei'}
          </Button>
        </div>
      </div>
    )
  }

  if (reserva.status === 'CANCELADA' || reserva.status === 'EXPIRADA') {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <title>{`Reserva · ${APP_NOME}`}</title>
        <h1 className="text-title-lg">{reserva.status === 'CANCELADA' ? 'Reserva cancelada' : 'Reserva expirada'}</h1>
        <p className="text-body-sm text-ink-muted">
          O produto voltou para o estoque da loja. Você pode reservar de novo.
        </p>
        <Button variant="primary" onClick={() => navigate(`/produto/${produto.id}`)}>
          Ver o produto
        </Button>
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
          produto={produto.nome}
          loja={`${produto.loja.nome} · ${nomeDoPiso(produto.loja.piso)}`}
          status={reserva.status}
          pago={reserva.pago}
          prazo={reserva.pago ? undefined : prazoDaReserva(reserva.expiraEm)}
        />
      </div>
      <div data-anim className="mt-auto flex gap-2">
        <Button block onClick={() => navigate('/carteira')}>
          Abrir carteira
        </Button>
        <Button
          variant="primary"
          block
          icon="mapa"
          onClick={() => navigate(`/mapa?loja=${encodeURIComponent(produto.loja.mapaId)}`)}
        >
          Como chegar
        </Button>
      </div>
    </div>
  )
}
