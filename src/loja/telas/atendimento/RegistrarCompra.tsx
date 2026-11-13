import { useId, useState, type FormEvent } from 'react'
import { Button, Icon } from '../../../componentes'
import type { Atendimento, CupomDoCliente, PedidoCompra } from '../../../tipos/loja'
import { registrarCompra, useAcao } from '../../api'
import { Campo } from '../../../painel/comum/Campo'
import { Erro } from '../../../painel/comum/Estados'
import { lerValorEmCentavos, valorParaCampo } from '../../../painel/comum/formatos'
import { Opcao } from '../../../painel/comum/Opcao'
import { podeRetirar } from '../../comum/reserva'
import { VALOR_DA_DEMO } from './demo'
import type { Leitura } from './LeitorQR'
import { Recibo } from './Recibo'
import { TotalDaCompra } from './TotalDaCompra'

interface RegistrarCompraProps {
  atendimento: Atendimento
  leitura: Leitura
  aoRegistrar: () => void
  aoTerminar: () => void
}

/**
 * O caixa (RF19): valor da compra, cupons do cliente e, se houver, a reserva que ele leva
 * agora. O desconto e os pontos são calculados pela API: antes de registrar, no
 * TotalDaCompra (prévia), e depois, no Recibo.
 */
export function RegistrarCompra({ atendimento, leitura, aoRegistrar, aoTerminar }: RegistrarCompraProps) {
  const { cliente, cupons } = atendimento
  const retiraveis = atendimento.reservas.filter((r) => podeRetirar(r.status))
  const idTitulo = useId()
  const grupoReserva = useId()

  const [valor, setValor] = useState(leitura.simulada ? valorParaCampo(VALOR_DA_DEMO) : '')
  const [erroValor, setErroValor] = useState<string | null>(null)
  const [escolhidos, setEscolhidos] = useState(() => cuponsIniciais(cupons))
  const [reservaId, setReservaId] = useState<string | null>(null)
  const compra = useAcao(registrarCompra)

  const reserva = retiraveis.find((r) => r.id === reservaId)
  // Reserva paga com Pix: a API usa o valor dela e o caixa não cobra de novo.
  const reservaPaga = Boolean(reserva?.pago)

  function alternarCupom(cupom: CupomDoCliente, marcado: boolean) {
    setEscolhidos((atuais) => {
      // RN05: um cupom da loja e um voucher do shopping por compra. Marcar outro da mesma
      // origem desmarca o anterior.
      const outraOrigem = (id: string) => cupons.find((c) => c.id === id)?.origem !== cupom.origem
      const sem = atuais.filter((id) => id !== cupom.id && (!marcado || outraOrigem(id)))
      return marcado ? [...sem, cupom.id] : sem
    })
  }

  function arrumarValor() {
    const centavos = lerValorEmCentavos(valor)
    if (centavos) setValor(valorParaCampo(centavos))
  }

  // O pedido sai do que está na tela; null enquanto o valor não é válido. Serve para a
  // prévia do total e para o registro. Com reserva paga, o valor vai 0 e a API usa o da reserva.
  const centavos = reservaPaga ? 0 : lerValorEmCentavos(valor)
  const pedido: PedidoCompra | null =
    centavos === null || (!reservaPaga && centavos <= 0)
      ? null
      : {
          qrToken: leitura.qr,
          valorCentavos: centavos,
          cupons: reservaPaga ? [] : escolhidos,
          ...(reserva && { reservaId: reserva.id }),
        }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!pedido) {
      setErroValor('Informe o valor da compra, como 459,80.')
      return
    }
    setErroValor(null)
    if (await compra.executar(pedido)) aoRegistrar()
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5">
      <h2 id={idTitulo} className="text-title-sm">
        Registrar compra
      </h2>

      {compra.resultado ? (
        <Recibo
          compra={compra.resultado}
          cliente={cliente.nome}
          cupons={cupons}
          retiradaPaga={reservaPaga}
          aoTerminar={aoTerminar}
        />
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          {retiraveis.length > 0 && (
            <fieldset className="flex flex-col">
              <legend className="mb-1 text-label">Entregar reserva</legend>
              <Opcao tipo="radio" name={grupoReserva} checked={reservaId === null} onChange={() => setReservaId(null)}>
                Não, só a compra do caixa
              </Opcao>
              {retiraveis.map((r) => (
                <Opcao
                  key={r.id}
                  tipo="radio"
                  name={grupoReserva}
                  checked={reservaId === r.id}
                  onChange={() => setReservaId(r.id)}
                >
                  {r.produto} <span className="text-ink-muted">· {r.pago ? 'paga com Pix' : 'cobrar no caixa'}</span>
                </Opcao>
              ))}
            </fieldset>
          )}

          {reservaPaga ? (
            <p className="flex items-start gap-2 rounded-sm bg-cerrado-soft p-3 text-body-sm text-cerrado-ink">
              <Icon name="check" className="mt-px" />
              Paga com Pix: não cobre de novo. Os pontos entram na retirada.
            </p>
          ) : (
            <>
              <Campo
                rotulo="Valor da compra"
                prefixo="R$"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onBlur={arrumarValor}
                erro={erroValor}
              />
              {cupons.length > 0 && (
                <fieldset className="flex flex-col">
                  <legend className="mb-1 text-label">Cupons do cliente</legend>
                  {cupons.map((c) => (
                    <Opcao
                      key={c.id}
                      tipo="checkbox"
                      checked={escolhidos.includes(c.id)}
                      onChange={(e) => alternarCupom(c, e.target.checked)}
                    >
                      {c.titulo} <span className="text-ink-muted">({c.origem === 'LOJA' ? 'loja' : 'shopping'})</span>
                    </Opcao>
                  ))}
                  {cupons.length > 2 && (
                    <p className="text-body-sm text-ink-muted">Um cupom da loja e um do shopping por compra.</p>
                  )}
                </fieldset>
              )}
            </>
          )}

          {compra.erro && <Erro erro={compra.erro} />}

          <TotalDaCompra pedido={pedido} cliente={cliente.nome} reservaPaga={reservaPaga} />

          <Button type="submit" variant="confirm" icon="check" block disabled={compra.enviando}>
            {compra.enviando ? 'Registrando…' : reservaPaga ? 'Registrar retirada' : 'Registrar compra'}
          </Button>
        </form>
      )}
    </section>
  )
}

/**
 * Os cupons já vêm marcados, como no protótipo: o primeiro da loja e o primeiro do shopping
 * (RN05). A API manda os que dão desconto antes dos brindes, então o brinde não toma o lugar.
 */
function cuponsIniciais(cupons: CupomDoCliente[]) {
  const primeiros = [cupons.find((c) => c.origem === 'LOJA'), cupons.find((c) => c.origem === 'SHOPPING')]
  return primeiros.filter((c) => c !== undefined).map((c) => c.id)
}
