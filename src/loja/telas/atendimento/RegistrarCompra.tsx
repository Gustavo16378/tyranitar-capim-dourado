import { useId, useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../../componentes'
import type { Atendimento } from '../../../tipos/loja'
import { registrarCompra, useAcao } from '../../api'
import { Campo } from '../../../painel/comum/Campo'
import { Erro } from '../../../painel/comum/Estados'
import { lerValorEmCentavos, valorParaCampo } from '../../../painel/comum/formatos'
import { BuscaNoCatalogo } from './BuscaNoCatalogo'
import {
  comOutros,
  cuponsEscolhidos,
  cuponsQueValem,
  montarPedido,
  nomesDosCupons,
  paraCupom,
  SEM_CUPONS,
  type CarrinhoDoCaixa,
  type EscolhaDeCupons,
} from './carrinho'
import { CuponsDaCompra } from './CuponsDaCompra'
import { ItensDaCompra } from './ItensDaCompra'
import type { Leitura } from './LeitorQR'
import { Recibo } from './Recibo'
import { TotalDaCompra } from './TotalDaCompra'
import { usePrevia } from './usePrevia'

interface RegistrarCompraProps {
  atendimento: Atendimento
  leitura: Leitura
  carrinho: CarrinhoDoCaixa
  aoRegistrar: () => void
  aoTerminar: () => void
}

/**
 * O caixa (RF19): os itens da compra (as reservas que saem agora, produtos do catálogo e valores em
 * "Outros"), os cupons do cliente que valem nesses itens e o total. O desconto de cada cupom em
 * cada item e os pontos são calculados pela API: antes de registrar, na prévia, e depois, no Recibo.
 */
export function RegistrarCompra({ atendimento, leitura, carrinho, aoRegistrar, aoTerminar }: RegistrarCompraProps) {
  const { cliente, cupons, reservas } = atendimento
  const idTitulo = useId()
  const idItens = useId()
  const [escolha, setEscolha] = useState<EscolhaDeCupons>(SEM_CUPONS)
  const [erroItens, setErroItens] = useState<string | null>(null)
  // Os nomes dos cupons na hora de registrar: depois, o atendimento é buscado de novo e os cupons
  // usados (e as reservas retiradas) saem dele, mas o recibo ainda fala deles.
  const [nomesDoRecibo, setNomesDoRecibo] = useState<ReadonlyMap<string, string> | null>(null)
  const [retiradaNoRecibo, setRetiradaNoRecibo] = useState(false)
  const compra = useAcao(registrarCompra)

  // A reserva como o atendimento tem agora (depois de buscar de novo).
  const itensParaCupom = carrinho.itens.map((i) =>
    paraCupom(i.tipo === 'reserva' ? { ...i, reserva: reservas.find((r) => r.id === i.reserva.id) ?? i.reserva } : i),
  )
  const validos = cuponsQueValem(cupons, itensParaCupom)
  const pedido = montarPedido(leitura.qr, carrinho.itens, cuponsEscolhidos(escolha, validos))
  const { previa, recalculando, erro: erroPrevia, recarregar } = usePrevia(pedido)
  const nomes = useMemo(() => nomesDosCupons(cupons, reservas), [cupons, reservas])
  // Só reservas pagas com Pix: o caixa não cobra nada, só registra a retirada (e os pontos).
  const soRetiradaPaga = carrinho.itens.length > 0 && carrinho.itens.every((i) => i.tipo === 'reserva' && i.reserva.pago)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!pedido) {
      setErroItens('Ponha pelo menos um item na compra: retire uma reserva, busque um produto ou informe um valor em Outros.')
      return
    }
    setErroItens(null)
    setNomesDoRecibo(nomes)
    setRetiradaNoRecibo(soRetiradaPaga)
    if (await compra.executar(pedido)) aoRegistrar()
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-5 rounded-md border border-line bg-surface-raised p-5">
      <h2 id={idTitulo} className="text-title-sm">
        Registrar compra
      </h2>

      {compra.resultado ? (
        <Recibo
          compra={compra.resultado}
          cliente={cliente.nome}
          nomes={nomesDoRecibo ?? nomes}
          retiradaPaga={retiradaNoRecibo}
          aoTerminar={aoTerminar}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h3 id={idItens} className="text-label">
              Itens da compra
            </h3>
            <ItensDaCompra
              carrinho={carrinho}
              previa={previa}
              recalculando={recalculando}
              nomes={nomes}
              cliente={cliente.nome}
            />
          </div>

          <BuscaNoCatalogo aoEscolher={carrinho.adicionar} />
          <ValorEmOutros carrinho={carrinho} />

          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <CuponsDaCompra
              cupons={cupons}
              itens={itensParaCupom}
              escolha={escolha}
              aoEscolher={setEscolha}
              cliente={cliente.nome}
            />

            {/* O mesmo erro da prévia já aparece no total: não repete. */}
            {compra.erro && compra.erro.mensagem !== erroPrevia?.mensagem && <Erro erro={compra.erro} />}

            <TotalDaCompra
              previa={previa}
              recalculando={recalculando}
              erro={erroPrevia}
              aoTentarDeNovo={recarregar}
              vazia={!carrinho.itens.length}
              cliente={cliente.nome}
              nomes={nomes}
            />

            {erroItens && !carrinho.itens.length && (
              <p role="alert" className="text-body-sm text-perigo-ink">
                {erroItens}
              </p>
            )}

            <Button type="submit" variant="confirm" icon="check" block disabled={compra.enviando}>
              {compra.enviando ? 'Registrando…' : soRetiradaPaga ? 'Registrar retirada' : 'Registrar compra'}
            </Button>
          </form>
        </>
      )}
    </section>
  )
}

/**
 * "Outros": um valor sem produto, como antes dos itens (uma sacola, um ajuste). Não tem categoria,
 * então cupom de categoria não desconta nele. Enter no campo também põe o valor na compra.
 */
function ValorEmOutros({ carrinho }: { carrinho: CarrinhoDoCaixa }) {
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function adicionar(evento: FormEvent) {
    evento.preventDefault()
    const centavos = lerValorEmCentavos(valor)
    if (!centavos || centavos <= 0) {
      setErro('Informe o valor, como 49,90.')
      return
    }
    setErro(null)
    setValor('')
    carrinho.trocar(comOutros(carrinho.itens, centavos), `Outros, ${valorParaCampo(centavos)} reais, entrou na compra.`)
  }

  return (
    <form onSubmit={adicionar} noValidate aria-label="Valor em Outros" className="flex flex-col items-start gap-2">
      <Campo
        rotulo="Outros, sem produto"
        prefixo="R$"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        erro={erro}
        dica="Um valor avulso. Cupom de categoria não vale nele."
        className="w-full max-w-[320px]"
      />
      <Button type="submit" icon="mais">
        Adicionar valor
      </Button>
    </form>
  )
}
