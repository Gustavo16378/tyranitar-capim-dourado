import { useId, useState, type FormEvent } from 'react'
import { Button, Icon } from '../../../componentes'
import type { Atendimento, CupomDoCliente } from '../../../tipos/loja'
import { registrarCompra, useAcao } from '../../api'
import { Campo } from '../../comum/Campo'
import { Erro } from '../../comum/Estados'
import { lerValorEmCentavos, valorParaCampo } from '../../comum/formatos'
import { Opcao } from '../../comum/Opcao'
import { podeRetirar } from '../../comum/reserva'
import { VALOR_DA_DEMO } from './demo'
import type { Leitura } from './LeitorQR'
import { Recibo } from './Recibo'

interface RegistrarCompraProps {
  atendimento: Atendimento
  leitura: Leitura
  aoRegistrar: () => void
  aoTerminar: () => void
}

/**
 * O caixa (RF19): valor da compra, cupons do cliente e, se houver, a reserva que ele leva
 * agora. O desconto e os pontos são calculados pela API e aparecem no recibo.
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
      const sem = atuais.filter((id) => id !== cupom.id)
      if (!marcado) return sem
      // RN05: um cupom da loja por compra. Marcar outro da loja desmarca o anterior.
      const daLoja = (id: string) => cupons.find((c) => c.id === id)?.origem === 'LOJA'
      return [...(cupom.origem === 'LOJA' ? sem.filter((id) => !daLoja(id)) : sem), cupom.id]
    })
  }

  function arrumarValor() {
    const centavos = lerValorEmCentavos(valor)
    if (centavos) setValor(valorParaCampo(centavos))
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const centavos = reservaPaga ? 0 : lerValorEmCentavos(valor)
    if (centavos === null || (!reservaPaga && centavos <= 0)) {
      setErroValor('Informe o valor da compra, como 459,80.')
      return
    }
    setErroValor(null)
    const feita = await compra.executar({
      qrToken: leitura.qr,
      valorCentavos: centavos,
      cupons: reservaPaga ? [] : escolhidos,
      ...(reserva && { reservaId: reserva.id }),
    })
    if (feita) aoRegistrar()
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
                  {cupons.filter((c) => c.origem === 'LOJA').length > 1 && (
                    <p className="text-body-sm text-ink-muted">Um cupom da loja por compra; o do shopping vai junto.</p>
                  )}
                </fieldset>
              )}
            </>
          )}

          {compra.erro && <Erro erro={compra.erro} />}

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <Button type="submit" variant="confirm" icon="check" block disabled={compra.enviando}>
              {compra.enviando ? 'Registrando…' : reservaPaga ? 'Registrar retirada' : 'Registrar compra'}
            </Button>
            {!reservaPaga && (
              <p className="text-center text-body-sm text-ink-muted">O valor com desconto aparece no recibo.</p>
            )}
          </div>
        </form>
      )}
    </section>
  )
}

/** Os cupons já vêm marcados, como no protótipo, com no máximo um da loja (RN05). */
function cuponsIniciais(cupons: CupomDoCliente[]) {
  const primeiroDaLoja = cupons.find((c) => c.origem === 'LOJA')
  return cupons.filter((c) => c.origem === 'SHOPPING' || c === primeiroDaLoja).map((c) => c.id)
}
