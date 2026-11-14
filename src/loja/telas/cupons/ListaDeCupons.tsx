import { useRef } from 'react'
import { formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { CupomDaLoja } from '../../../tipos/loja'
import { editarCupom, excluirCupom, listarCupons, useConsulta } from '../../api'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { hojeEmPalmas } from '../../../painel/comum/formatos'
import { useAgora } from '../../../painel/comum/useAgora'
import { AcoesDoCupom } from '../../../painel/cupons/AcoesDoCupom'
import { CartaoCupom } from '../../../painel/cupons/CartaoCupom'
import { cupomValendo } from '../../../painel/cupons/textos'
import { useCuponsNaTela } from '../../../painel/cupons/useCuponsNaTela'

interface ListaDeCuponsProps {
  /** O aviso que a tela trouxe (cupom criado ou salvo). */
  aviso: string
  /** "Editar" de um cupom: a tela troca a lista pelo formulário com ele. */
  aoEditar: (cupom: CupomDaLoja) => void
}

/** Os cupons da loja e o uso deles, nos quatro estados. */
export function ListaDeCupons({ aviso, aoEditar }: ListaDeCuponsProps) {
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

  return <CuponsNaTela itens={consulta.dados.itens} aviso={aviso} aoEditar={aoEditar} />
}

/** O aviso e os cupons, com o que muda na tela depois de desativar, reativar ou excluir. */
function CuponsNaTela({ itens, aviso, aoEditar }: { itens: CupomDaLoja[] } & ListaDeCuponsProps) {
  const refAviso = useRef<HTMLParagraphElement>(null)
  const tela = useCuponsNaTela(itens, refAviso)
  const texto = tela.aviso || aviso
  return (
    <div className="flex flex-col gap-6">
      <p ref={refAviso} tabIndex={-1} role="status" className={cx('text-body-sm text-cerrado-ink outline-none', !texto && 'sr-only')}>
        {texto}
      </p>
      {tela.lista.length === 0 ? (
        <Vazio ilustracao="cupom">A loja ainda não tem cupons. Crie o primeiro: ele aparece para o cliente no atendimento.</Vazio>
      ) : (
        <Cupons cupons={tela.lista} aoEditar={aoEditar} aoMudar={tela.trocar} aoExcluir={tela.tirar} />
      )}
    </div>
  )
}

interface CuponsProps {
  cupons: CupomDaLoja[]
  aoEditar: (cupom: CupomDaLoja) => void
  aoMudar: (cupom: CupomDaLoja, aviso: string) => void
  aoExcluir: (cupom: CupomDaLoja, aviso: string) => void
}

function Cupons({ cupons, aoEditar, aoMudar, aoExcluir }: CuponsProps) {
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
            <CartaoCupom
              cupom={cupom}
              origem="loja"
              hoje={hoje}
              acoes={
                <AcoesDoCupom
                  cupom={cupom}
                  nome="cupom"
                  aoEditar={() => aoEditar(cupom)}
                  alternar={editarCupom}
                  excluir={excluirCupom}
                  aoMudar={aoMudar}
                  aoExcluir={aoExcluir}
                />
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
