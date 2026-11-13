import { useState } from 'react'
import { Button, formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { CATEGORIAS_DO_SHOPPING } from '../../../painel/comum/categorias'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { hojeEmPalmas } from '../../../painel/comum/formatos'
import { useAgora } from '../../../painel/comum/useAgora'
import { CartaoCupom } from '../../../painel/cupons/CartaoCupom'
import { FormularioCupom } from '../../../painel/cupons/FormularioCupom'
import { cupomValendo } from '../../../painel/cupons/textos'
import type { VoucherDoShopping } from '../../../tipos/shopping'
import { criarVoucher, listarVouchers, useConsulta } from '../../api'

/** Os vouchers do shopping e o uso deles; "Novo voucher" abre o mesmo formulário dos cupons da loja. */
export function Vouchers() {
  const consulta = useConsulta(listarVouchers)
  const [criando, setCriando] = useState(false)
  const [aviso, setAviso] = useState('')

  if (criando) {
    return (
      <FormularioCupom
        origem="shopping"
        criar={criarVoucher}
        categorias={CATEGORIAS_DO_SHOPPING}
        aoCriar={(voucher) => {
          setAviso(`Voucher criado: ${voucher.titulo}. Ele já vale nas lojas e aparece na vitrine do app.`)
          setCriando(false)
          consulta.recarregar()
        }}
        aoVoltar={() => setCriando(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className={cx('text-body-sm text-cerrado-ink', !aviso && 'sr-only')}>
          {aviso}
        </p>
        <Button variant="primary" onClick={() => setCriando(true)} className="ml-auto">
          Novo voucher
        </Button>
      </div>
      {consulta.estado === 'carregando' && (
        <Carregando rotulo="Carregando os vouchers" className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-[124px] w-[200px]" />
            ))}
          </div>
          <Esqueleto className="h-[300px]" />
        </Carregando>
      )}
      {consulta.estado === 'erro' && (
        <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
      )}
      {consulta.estado === 'pronto' &&
        (consulta.dados.itens.length === 0 ? (
          <Vazio>O shopping ainda não tem vouchers. Crie o primeiro: ele aparece na vitrine do app.</Vazio>
        ) : (
          <ListaDeVouchers vouchers={consulta.dados.itens} />
        ))}
    </div>
  )
}

function ListaDeVouchers({ vouchers }: { vouchers: VoucherDoShopping[] }) {
  const ref = useEntrada<HTMLDivElement>()
  const hoje = hojeEmPalmas(useAgora())
  const valendo = vouchers.filter((v) => cupomValendo(v, hoje)).length
  const usos = vouchers.reduce((soma, v) => soma + v.usos, 0)
  const devolvido = vouchers.reduce((soma, v) => soma + v.descontoCentavos, 0)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <div data-anim className="flex flex-wrap gap-3">
        <StatTile rotulo="Vouchers valendo" valor={formatarNumero(valendo)} nota={`de ${formatarNumero(vouchers.length)} criados`} />
        <StatTile rotulo="Usos nas lojas" valor={formatarNumero(usos)} nota="compras com voucher" />
        <StatTile rotulo="Devolvido às lojas" valor={formatarPreco(devolvido)} nota="cada uso vira reembolso" />
      </div>
      <ul className="grid items-start gap-x-4 gap-y-6 md:grid-cols-2">
        {vouchers.map((voucher) => (
          <li key={voucher.id} data-anim>
            <CartaoCupom cupom={voucher} origem="shopping" hoje={hoje} />
          </li>
        ))}
      </ul>
    </div>
  )
}
