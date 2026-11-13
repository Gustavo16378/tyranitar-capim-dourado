import type { StatusReserva } from '../../../tipos/loja'
import { STATUS_ATIVOS } from '../../comum/reserva'

/** As abas da tela: cada uma pede um grupo de status e tem sua frase de vazio. */
export const FILTROS = [
  {
    id: 'ativas',
    rotulo: 'Ativas',
    status: STATUS_ATIVOS,
    vazio: 'Nenhuma reserva ativa agora. Quando um cliente reservar, ela aparece aqui.',
  },
  {
    id: 'novas',
    rotulo: 'Novas',
    status: ['PENDENTE'],
    vazio: 'Nenhuma reserva nova para confirmar.',
  },
  {
    id: 'confirmadas',
    rotulo: 'Confirmadas',
    status: ['CONFIRMADA'],
    vazio: 'Nenhuma reserva confirmada esperando para ser separada.',
  },
  {
    id: 'separadas',
    rotulo: 'Separadas',
    status: ['SEPARADA'],
    vazio: 'Nenhuma reserva separada esperando o cliente.',
  },
  {
    id: 'encerradas',
    rotulo: 'Encerradas',
    status: ['RETIRADA', 'CANCELADA', 'EXPIRADA'],
    vazio: 'Nenhuma reserva retirada, cancelada ou expirada ainda.',
  },
] as const satisfies readonly { id: string; rotulo: string; status: readonly StatusReserva[]; vazio: string }[]

export type Filtro = (typeof FILTROS)[number]
export type IdFiltro = Filtro['id']
