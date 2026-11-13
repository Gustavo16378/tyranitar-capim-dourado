import { formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { CupomDaLoja } from '../../../tipos/loja'
import { listarCupons, useConsulta } from '../../api'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { hojeEmPalmas } from '../../../painel/comum/formatos'
import { useAgora } from '../../../painel/comum/useAgora'
import { CartaoCupom } from '../../../painel/cupons/CartaoCupom'
import { cupomValendo } from '../../../painel/cupons/textos'

/** Os cupons da loja e o uso deles, nos quatro estados. */
export function ListaDeCupons({ aviso }: { aviso: string }) {
  const consulta = useConsulta(listarCupons)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando os cupons" className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-[124px] w-[200px]" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} className="h-[150px]" />
          ))}
        </div>
      </Carregando>
    )
  }

  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className={cx('text-body-sm text-cerrado-ink', !aviso && 'sr-only')}>
        {aviso}
      </p>
      {consulta.dados.itens.length === 0 ? (
        <Vazio ilustracao="cupom">A loja ainda não tem cupons. Crie o primeiro: ele aparece para o cliente no atendimento.</Vazio>
      ) : (
        <Cupons cupons={consulta.dados.itens} />
      )}
    </div>
  )
}

function Cupons({ cupons }: { cupons: CupomDaLoja[] }) {
  const ref = useEntrada<HTMLDivElement>()
  const hoje = hojeEmPalmas(useAgora())
  const valendo = cupons.filter((c) => cupomValendo(c, hoje)).length
  const usos = cupons.reduce((soma, c) => soma + c.usos, 0)
  const desconto = cupons.reduce((soma, c) => soma + c.descontoCentavos, 0)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <div data-anim className="flex flex-wrap gap-3">
        <StatTile rotulo="Cupons valendo" valor={formatarNumero(valendo)} nota={`de ${formatarNumero(cupons.length)} criados`} />
        <StatTile rotulo="Usos" valor={formatarNumero(usos)} nota="compras com cupom da loja" />
        <StatTile rotulo="Desconto concedido" valor={formatarPreco(desconto)} nota="pago pela loja" />
      </div>
      <ul className="grid items-start gap-x-4 gap-y-6 md:grid-cols-2">
        {cupons.map((cupom) => (
          <li key={cupom.id} data-anim>
            <CartaoCupom cupom={cupom} origem="loja" hoje={hoje} />
          </li>
        ))}
      </ul>
    </div>
  )
}
