import { useCallback, useState } from 'react'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { ReservaDaLoja } from '../../../tipos/loja'
import { listarReservas, useConsulta } from '../../api'
import { Carregando, Erro, Esqueleto, Vazio } from '../../comum/Estados'
import { Paginacao } from '../../comum/Paginacao'
import { useAgora } from '../../comum/useAgora'
import { CartaoReserva } from './CartaoReserva'
import type { Filtro } from './filtros'

const TAMANHO = 20

interface ListaDeReservasProps {
  filtro: Filtro
  pagina: number
  aoMudarPagina: (pagina: number) => void
}

/**
 * As reservas de um filtro, nos quatro estados, com paginação. Ao trocar o filtro ou a
 * página, a lista anterior fica mais clara até a nova chegar.
 */
export function ListaDeReservas({ filtro, pagina, aoMudarPagina }: ListaDeReservasProps) {
  const [aviso, setAviso] = useState('')
  const buscar = useCallback(
    (sinal: AbortSignal) => listarReservas({ status: [...filtro.status], pagina, tamanho: TAMANHO }, sinal),
    [filtro, pagina],
  )
  const consulta = useConsulta(buscar)

  function aoMudar(reserva: ReservaDaLoja, mensagem: string) {
    setAviso(`${mensagem} (${reserva.produto}, ${reserva.cliente}).`)
    consulta.recarregar()
  }

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando as reservas" className="grid gap-4 lg:grid-cols-2">
        <Esqueleto className="h-[190px]" />
        <Esqueleto className="h-[190px]" />
        <Esqueleto className="h-[190px]" />
        <Esqueleto className="h-[190px]" />
      </Carregando>
    )
  }

  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }

  const { dados, atualizando } = consulta
  return (
    <div className="flex flex-col gap-4">
      {/* O resultado de cada ação é anunciado aqui, uma vez. */}
      <p role="status" className={cx('text-body-sm text-cerrado-ink', !aviso && 'sr-only')}>
        {aviso}
      </p>
      {dados.itens.length === 0 ? (
        <Vazio>{filtro.vazio}</Vazio>
      ) : (
        <Reservas reservas={dados.itens} atualizando={atualizando} aoMudar={aoMudar} />
      )}
      <Paginacao pagina={pagina} tamanho={TAMANHO} total={dados.total} aoMudar={aoMudarPagina} />
    </div>
  )
}

interface ReservasProps {
  reservas: ReservaDaLoja[]
  atualizando: boolean
  aoMudar: (reserva: ReservaDaLoja, mensagem: string) => void
}

/** Com dados: os cartões chegam em cascata quando a lista aparece. */
function Reservas({ reservas, atualizando, aoMudar }: ReservasProps) {
  const ref = useEntrada<HTMLUListElement>()
  const agora = useAgora()
  return (
    <ul
      ref={ref}
      aria-busy={atualizando}
      className={cx('grid items-start gap-4 transition-opacity duration-rapida lg:grid-cols-2', atualizando && 'opacity-60')}
    >
      {reservas.map((reserva) => (
        <li key={reserva.id} data-anim>
          <CartaoReserva reserva={reserva} agora={agora} aoMudar={aoMudar} />
        </li>
      ))}
    </ul>
  )
}
