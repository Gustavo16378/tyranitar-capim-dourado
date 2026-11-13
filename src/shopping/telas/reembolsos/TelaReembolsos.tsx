// Reembolsos (RF31): o que o shopping deve a cada loja pelos vouchers usados nela (RN11), e
// marcar como pago depois de transferir. Um reembolso pago não volta para pendente, então
// pagar pede confirmação.
//
//   TelaReembolsos     cabeçalho, filtro e GET /api/shopping/reembolsos
//   └─ CartaoDaLoja    os reembolsos de uma loja e o PATCH /api/shopping/reembolsos/{id}
import { useCallback, useState } from 'react'
import { formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { Segmentos } from '../../../painel/comum/Segmentos'
import type { Reembolsos, StatusReembolso } from '../../../tipos/shopping'
import { listarReembolsos, useConsulta } from '../../api'
import { CartaoDaLoja } from './CartaoDaLoja'

type Filtro = 'PENDENTE' | 'PAGO' | 'TODOS'

const FILTROS: readonly { valor: Filtro; rotulo: string }[] = [
  { valor: 'PENDENTE', rotulo: 'A pagar' },
  { valor: 'PAGO', rotulo: 'Pagos' },
  { valor: 'TODOS', rotulo: 'Todos' },
]

export function TelaReembolsos() {
  const ref = useEntrada<HTMLDivElement>()
  const [filtro, setFiltro] = useState<Filtro>('PENDENTE')
  const [aviso, setAviso] = useState('')
  const buscar = useCallback(
    (sinal: AbortSignal) => listarReembolsos(filtro === 'TODOS' ? undefined : (filtro as StatusReembolso), sinal),
    [filtro],
  )
  const consulta = useConsulta(buscar)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Reembolsos"
        descricao="O que o shopping deve a cada loja pelos vouchers usados nela. Marque como pago depois de transferir."
      />
      <div data-anim>
        <Segmentos rotulo="Filtrar reembolsos" opcoes={FILTROS} valor={filtro} aoMudar={setFiltro} />
      </div>
      <p role="status" className={cx('text-body-sm text-cerrado-ink', !aviso && 'sr-only')}>
        {aviso}
      </p>
      <div data-anim>
        {consulta.estado === 'carregando' && (
          <Carregando rotulo="Carregando os reembolsos" className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((i) => (
                <Esqueleto key={i} className="h-[124px] w-[200px]" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-[180px]" />
            ))}
          </Carregando>
        )}
        {consulta.estado === 'erro' && (
          <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
        )}
        {consulta.estado === 'pronto' && (
          <PorLoja
            reembolsos={consulta.dados}
            filtro={filtro}
            atualizando={consulta.atualizando}
            aoPagar={(mensagem) => {
              setAviso(mensagem)
              consulta.recarregar()
            }}
          />
        )}
      </div>
    </div>
  )
}

interface PorLojaProps {
  reembolsos: Reembolsos
  filtro: Filtro
  atualizando: boolean
  aoPagar: (mensagem: string) => void
}

function PorLoja({ reembolsos, filtro, atualizando, aoPagar }: PorLojaProps) {
  const ref = useEntrada<HTMLDivElement>()
  const { totais, lojas } = reembolsos
  return (
    <div
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-6 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      <div data-anim className="flex flex-wrap items-start gap-3">
        <StatTile rotulo="A pagar às lojas" valor={formatarPreco(totais.pendenteCentavos)} nota="vouchers já usados" />
        <StatTile
          rotulo="Lojas a receber"
          valor={formatarNumero(totais.lojasComPendencia)}
          nota={totais.lojasComPendencia === 1 ? 'loja com reembolso' : 'lojas com reembolso'}
        />
        <StatTile rotulo="Pago nos últimos 30 dias" valor={formatarPreco(totais.pagoUltimos30DiasCentavos)} nota="já transferido" />
      </div>
      {lojas.length === 0 ? (
        <Vazio ilustracao="recibo">
          {filtro === 'PENDENTE'
            ? 'Nenhum reembolso a pagar. Quando um cliente usar um voucher numa loja, ele aparece aqui.'
            : 'Nenhum reembolso neste filtro.'}
        </Vazio>
      ) : (
        <ul className="flex flex-col gap-4">
          {lojas.map((daLoja) => (
            <li key={daLoja.loja.id} data-anim>
              <CartaoDaLoja daLoja={daLoja} aoPagar={aoPagar} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
