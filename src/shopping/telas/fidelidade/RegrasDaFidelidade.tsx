import { useState, type FormEvent } from 'react'
import { Button, formatarNumero, NivelBadge } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import { Campo } from '../../../painel/comum/Campo'
import { Carregando, Erro, Esqueleto } from '../../../painel/comum/Estados'
import { paraNivel } from '../../../painel/comum/formatos'
import type { ConfiguracaoDoShopping, NivelApi } from '../../../tipos/shopping'
import { buscarConfiguracao, salvarConfiguracao, useAcao, useConsulta } from '../../api'

const NIVEIS: readonly NivelApi[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']

/** As regras da fidelidade, nos quatro estados; com dados, o formulário. */
export function RegrasDaFidelidade() {
  const consulta = useConsulta(buscarConfiguracao)
  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando as regras" className="flex flex-col gap-4">
        <Esqueleto className="h-[360px]" />
      </Carregando>
    )
  }
  if (consulta.estado === 'erro') {
    return <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
  }
  return <FormularioDasRegras configuracao={consulta.dados} />
}

const texto = (n: number) => String(n)

function FormularioDasRegras({ configuracao }: { configuracao: ConfiguracaoDoShopping }) {
  const ref = useEntrada<HTMLFormElement>()
  const [niveis, setNiveis] = useState(() => Object.fromEntries(NIVEIS.map((n) => [n, texto(configuracao.niveis[n])])))
  const [pontosPorReal, setPontosPorReal] = useState(texto(configuracao.pontosPorReal))
  const [naLoja, setNaLoja] = useState(texto(configuracao.prazoReservaHoras.NA_LOJA))
  const [pix, setPix] = useState(texto(configuracao.prazoReservaHoras.PIX))
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const salvar = useAcao(salvarConfiguracao)

  const numero = (valor: string) => (/^\d+$/.test(valor.trim()) ? Number(valor) : NaN)
  const pontos = NIVEIS.map((n) => numero(niveis[n]))
  const emOrdem = pontos.every((p, i) => Number.isFinite(p) && (i === 0 || p > pontos[i - 1]))

  /** A faixa de cada nível com os números digitados: "de 500 a 1.999 pontos". */
  function faixa(i: number) {
    if (!emOrdem) return ''
    const de = formatarNumero(pontos[i])
    return i === NIVEIS.length - 1 ? `${de} pontos ou mais` : `de ${de} a ${formatarNumero(pontos[i + 1] - 1)} pontos`
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setSalvo(false)
    if (!emOrdem) {
      setErroLocal('Cada nível precisa de mais pontos que o anterior.')
      return
    }
    setErroLocal(null)
    const pedido: ConfiguracaoDoShopping = {
      niveis: Object.fromEntries(NIVEIS.map((n, i) => [n, pontos[i]])) as ConfiguracaoDoShopping['niveis'],
      pontosPorReal: numero(pontosPorReal),
      prazoReservaHoras: { NA_LOJA: numero(naLoja), PIX: numero(pix) },
    }
    if (await salvar.executar(pedido)) setSalvo(true)
  }

  const porReal = numero(pontosPorReal)

  return (
    <form ref={ref} onSubmit={enviar} noValidate className="flex flex-col gap-6 rounded-md border border-line bg-surface-raised p-5 md:p-6">
      <fieldset data-anim className="flex flex-col gap-3">
        <legend className="mb-1 text-title-sm">Níveis</legend>
        <p className="text-body-sm text-ink-muted">
          O nível do cliente sai dos pontos dos últimos 12 meses. Ao mudar os números, o nível de cada cliente é
          recalculado na próxima compra.
        </p>
        <ul className="flex flex-col divide-y divide-line">
          {NIVEIS.map((nivel, i) => (
            <li key={nivel} className="flex flex-wrap items-end justify-between gap-4 py-3">
              <div className="flex min-w-[220px] flex-col gap-1">
                <NivelBadge nivel={paraNivel(nivel)} />
                <span className="text-body-sm text-ink-muted">{faixa(i)}</span>
              </div>
              <Campo
                rotulo="A partir de"
                inputMode="numeric"
                value={niveis[nivel]}
                disabled={nivel === 'SEMENTE'}
                onChange={(e) => setNiveis({ ...niveis, [nivel]: e.target.value })}
                dica={nivel === 'SEMENTE' ? 'Todo cliente começa aqui.' : undefined}
                className="w-[200px]"
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset data-anim className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 text-title-sm">Pontos e reservas</legend>
        <Campo
          rotulo="Pontos por real pago"
          inputMode="numeric"
          value={pontosPorReal}
          onChange={(e) => setPontosPorReal(e.target.value)}
          dica={Number.isFinite(porReal) ? `Uma compra de R$ 100 dá ${formatarNumero(porReal * 100)} pontos.` : undefined}
        />
        <Campo
          rotulo="Reserva para pagar na loja"
          inputMode="numeric"
          value={naLoja}
          onChange={(e) => setNaLoja(e.target.value)}
          dica="Horas separada; depois, expira e o estoque volta."
        />
        <Campo
          rotulo="Reserva paga com Pix"
          inputMode="numeric"
          value={pix}
          onChange={(e) => setPix(e.target.value)}
          dica="Horas separada para o cliente retirar."
        />
      </fieldset>

      <div data-anim className="flex flex-col gap-3 border-t border-line pt-4">
        {erroLocal && <p className="text-body-sm text-perigo-ink">{erroLocal}</p>}
        {salvar.erro && <Erro erro={salvar.erro} />}
        <p role="status" className={salvo ? 'text-body-sm text-cerrado-ink' : 'sr-only'}>
          {salvo ? 'Regras salvas. Valem a partir da próxima compra e da próxima reserva.' : ''}
        </p>
        <div>
          <Button type="submit" variant="primary" disabled={salvar.enviando}>
            {salvar.enviando ? 'Salvando…' : 'Salvar regras'}
          </Button>
        </div>
      </div>
    </form>
  )
}
