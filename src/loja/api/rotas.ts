// Uma função por rota da API que o painel usa, com os tipos de src/tipos/loja.ts.
// As telas chamam estas funções, nunca fetch direto. Rota nova: escreva a função aqui
// e, enquanto a API não existir, o mock em src/mocks/loja/.
import type {
  Atendimento,
  Compra,
  FiltroReservas,
  Pagina,
  PedidoCompra,
  PedidoLogin,
  ReservaDaLoja,
  RespostaLogin,
  StatusPedidoPelaLoja,
} from '../../tipos/loja'
import { requisitar } from './http'

/** POST /api/auth/login */
export function entrar(pedido: PedidoLogin) {
  return requisitar<RespostaLogin>('POST', '/api/auth/login', { corpo: pedido })
}

/** GET /api/loja/atendimento/{qr}: ficha, reservas e cupons do cliente do QR (RF18). */
export function buscarAtendimento(qr: string, sinal?: AbortSignal) {
  return requisitar<Atendimento>('GET', `/api/loja/atendimento/${encodeURIComponent(qr)}`, { sinal })
}

/** POST /api/loja/compras: registra a compra no caixa, com cupons, e soma os pontos (RF19). */
export function registrarCompra(pedido: PedidoCompra) {
  return requisitar<Compra>('POST', '/api/loja/compras', { corpo: pedido })
}

/** GET /api/loja/reservas: reservas da loja do token, mais urgentes primeiro (RF20). */
export function listarReservas(filtro: FiltroReservas = {}, sinal?: AbortSignal) {
  return requisitar<Pagina<ReservaDaLoja>>('GET', '/api/loja/reservas', {
    busca: { status: filtro.status?.join(','), pagina: filtro.pagina, tamanho: filtro.tamanho },
    sinal,
  })
}

/** PATCH /api/loja/reservas/{id}: confirmar, separar, marcar retirada ou cancelar (RF20). */
export function mudarStatusReserva(id: string, status: StatusPedidoPelaLoja) {
  return requisitar<ReservaDaLoja>('PATCH', `/api/loja/reservas/${encodeURIComponent(id)}`, {
    corpo: { status },
  })
}
