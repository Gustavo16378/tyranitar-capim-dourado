import { useRef, useState } from 'react'
import { Button, formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { CATEGORIAS_DO_SHOPPING } from '../../../painel/comum/categorias'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { hojeEmPalmas } from '../../../painel/comum/formatos'
import { useAgora } from '../../../painel/comum/useAgora'
import { AcoesDoCupom } from '../../../painel/cupons/AcoesDoCupom'
import { CartaoCupom } from '../../../painel/cupons/CartaoCupom'
import { FormularioCupom } from '../../../painel/cupons/FormularioCupom'
import { cupomValendo } from '../../../painel/cupons/textos'
import { useCuponsNaTela } from '../../../painel/cupons/useCuponsNaTela'
import type { PedidoCupom, VoucherDoShopping } from '../../../tipos/shopping'
import { criarVoucher, editarVoucher, excluirVoucher, listarVouchers, useConsulta } from '../../api'

type Modo = { tipo: 'lista' } | { tipo: 'novo' } | { tipo: 'editando'; voucher: VoucherDoShopping }

/**
 * Os vouchers do shopping e o uso deles; "Novo voucher" e "Editar" abrem o mesmo formulário dos
 * cupons da loja. Cada voucher tem Desativar ou Reativar e, se nunca foi usado, Excluir.
 */
export function Vouchers() {
  const consulta = useConsulta(listarVouchers)
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' })
  const [aviso, setAviso] = useState('')

  if (modo.tipo !== 'lista') {
    const editando = modo.tipo === 'editando' ? modo.voucher : undefined
    return (
      <FormularioCupom
        key={editando?.id ?? 'novo'}
        origem="shopping"
        criar={editando ? (pedido: PedidoCupom) => editarVoucher(editando.id, pedido) : criarVoucher}
        categorias={CATEGORIAS_DO_SHOPPING}
        cupom={editando}
        aoCriar={(voucher) => {
          setAviso(
            editando
              ? `Voucher salvo: ${voucher.titulo}.`
              : `Voucher criado: ${voucher.titulo}. Ele já vale nas lojas e aparece na vitrine do app.`,
          )
          setModo({ tipo: 'lista' })
          consulta.recarregar()
        }}
        aoVoltar={() => setModo({ tipo: 'lista' })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="primary" onClick={() => setModo({ tipo: 'novo' })} className="ml-auto">
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
          <Vazio ilustracao="cupom">O shopping ainda não tem vouchers. Crie o primeiro: ele aparece na vitrine do app.</Vazio>
        ) : (
          <ListaDeVouchers
            // Recarregada (depois de criar ou salvar), a lista começa sem as mudanças que fez na tela.
            key={consulta.atualizando ? 'atualizando' : 'pronta'}
            vouchers={consulta.dados.itens}
            aviso={aviso}
            aoEditar={(voucher) => setModo({ tipo: 'editando', voucher })}
          />
        ))}
    </div>
  )
}

interface ListaDeVouchersProps {
  vouchers: VoucherDoShopping[]
  /** O aviso da tela (voucher criado ou salvo); os das ações da lista passam na frente. */
  aviso: string
  aoEditar: (voucher: VoucherDoShopping) => void
}

function ListaDeVouchers({ vouchers: itens, aviso, aoEditar }: ListaDeVouchersProps) {
  const ref = useEntrada<HTMLDivElement>()
  const hoje = hojeEmPalmas(useAgora())
  const refAviso = useRef<HTMLParagraphElement>(null)
  const tela = useCuponsNaTela(itens, refAviso)
  const vouchers = tela.lista
  const valendo = vouchers.filter((v) => cupomValendo(v, hoje)).length
  const usos = vouchers.reduce((soma, v) => soma + v.usos, 0)
  const devolvido = vouchers.reduce((soma, v) => soma + v.descontoCentavos, 0)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <p ref={refAviso} tabIndex={-1} role="status" className={cx('text-body-sm text-cerrado-ink outline-none', !(tela.aviso || aviso) && 'sr-only')}>
        {tela.aviso || aviso}
      </p>
      <div data-anim className="flex flex-wrap gap-3">
        <StatTile rotulo="Vouchers valendo" valor={formatarNumero(valendo)} nota={`de ${formatarNumero(vouchers.length)} criados`} />
        <StatTile rotulo="Usos nas lojas" valor={formatarNumero(usos)} nota="compras com voucher" />
        <StatTile rotulo="Devolvido às lojas" valor={formatarPreco(devolvido)} nota="cada uso vira reembolso" />
      </div>
      <ul className="grid items-start gap-x-4 gap-y-6 md:grid-cols-2">
        {vouchers.map((voucher) => (
          <li key={voucher.id} data-anim>
            <CartaoCupom
              cupom={voucher}
              origem="shopping"
              hoje={hoje}
              acoes={
                <AcoesDoCupom
                  cupom={voucher}
                  nome="voucher"
                  aoEditar={() => aoEditar(voucher)}
                  alternar={editarVoucher}
                  excluir={excluirVoucher}
                  aoMudar={tela.trocar}
                  aoExcluir={tela.tirar}
                />
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
