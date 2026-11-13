// Uma função por rota da API que o painel usa, com os tipos de src/tipos/loja.ts.
// As telas chamam estas funções, nunca fetch direto. Rota nova: escreva a função aqui
// e, enquanto a API não existir, o mock em src/mocks/loja/.
import type {
  Atendimento,
  Compra,
  FiltroProdutos,
  FiltroReservas,
  Pagina,
  PedidoCompra,
  PedidoLogin,
  PedidoPrevia,
  PedidoProduto,
  PreviaCompra,
  ProdutoDaLoja,
  ReservaDaLoja,
  RespostaLogin,
  ResultadoImportacao,
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

/** POST /api/loja/atendimento/previa: quanto o cliente paga e quantos pontos ganha, sem gravar (RF19). */
export function calcularPrevia(pedido: PedidoPrevia, sinal?: AbortSignal) {
  return requisitar<PreviaCompra>('POST', '/api/loja/atendimento/previa', { corpo: pedido, sinal })
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

/** GET /api/loja/produtos: o catálogo da loja, ativos e inativos (RF21). */
export function listarProdutos(filtro: FiltroProdutos = {}, sinal?: AbortSignal) {
  return requisitar<Pagina<ProdutoDaLoja>>('GET', '/api/loja/produtos', {
    busca: { q: filtro.q, pagina: filtro.pagina, tamanho: filtro.tamanho },
    sinal,
  })
}

/** POST /api/loja/produtos */
export function criarProduto(produto: PedidoProduto) {
  return requisitar<ProdutoDaLoja>('POST', '/api/loja/produtos', { corpo: produto })
}

/** PUT /api/loja/produtos/{id} */
export function editarProduto(id: string, produto: PedidoProduto) {
  return requisitar<ProdutoDaLoja>('PUT', `/api/loja/produtos/${encodeURIComponent(id)}`, { corpo: produto })
}

/** POST /api/loja/produtos/importar: a planilha CSV inteira; linhas com erro não são salvas (RF22). */
export function importarProdutos(csv: string) {
  return requisitar<ResultadoImportacao>('POST', '/api/loja/produtos/importar', {
    texto: { conteudo: csv, tipo: 'text/csv' },
  })
}
