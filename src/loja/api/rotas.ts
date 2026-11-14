// Uma função por rota da API que o painel usa, com os tipos de src/tipos/loja.ts.
// As telas chamam estas funções, nunca fetch direto. Rota nova: escreva a função aqui
// (e a rota em functions/api/loja, com teste em tests/api).
import type {
  Atendimento,
  Compra,
  CupomDaLoja,
  Extrato,
  FiltroProdutos,
  FiltroReservas,
  Lista,
  ListaDeReservas,
  PedidoCompra,
  EdicaoCupom,
  PedidoCupom,
  PedidoMudarStatus,
  PedidoPrevia,
  PedidoProduto,
  Periodo,
  PreviaCompra,
  ProdutoDaLoja,
  Relatorio,
  ReservaDaLoja,
  ResultadoImportacao,
} from '../../tipos/loja'
import { requisitar } from './cliente'

/** GET /api/loja/atendimento/{qr}: ficha, reservas e cupons do cliente do QR (RF18). */
export function buscarAtendimento(qr: string, sinal?: AbortSignal) {
  return requisitar<Atendimento>('GET', `/api/loja/atendimento/${encodeURIComponent(qr)}`, { sinal })
}

/** POST /api/loja/compras/previa: o desconto item por item, quanto o cliente paga e quantos pontos ganha, sem gravar (RF19). */
export function calcularPrevia(pedido: PedidoPrevia, sinal?: AbortSignal) {
  return requisitar<PreviaCompra>('POST', '/api/loja/compras/previa', { corpo: pedido, sinal })
}

/** POST /api/loja/compras: registra a compra no caixa (reservas, produtos e "Outros"), com cupons, e soma os pontos (RF19). */
export function registrarCompra(pedido: PedidoCompra) {
  return requisitar<Compra>('POST', '/api/loja/compras', { corpo: pedido })
}

/**
 * GET /api/loja/reservas: reservas da loja do token, as novas (PENDENTE) primeiro e depois as que
 * vencem antes (RF20). Vem com quantas esperam a loja responder (`pendentes`).
 */
export function listarReservas(filtro: FiltroReservas = {}, sinal?: AbortSignal) {
  return requisitar<ListaDeReservas>('GET', '/api/loja/reservas', {
    busca: { status: filtro.status?.join(','), pagina: filtro.pagina, tamanho: filtro.tamanho },
    sinal,
  })
}

/**
 * PATCH /api/loja/reservas/{id}: confirmar (com a hora em que fica pronta), separar ou recusar
 * (com o motivo) (RF20). A retirada é a compra no Atendimento; cancelar é do cliente.
 */
export function mudarStatusReserva(id: string, pedido: PedidoMudarStatus) {
  return requisitar<ReservaDaLoja>('PATCH', `/api/loja/reservas/${encodeURIComponent(id)}`, { corpo: pedido })
}

/** GET /api/loja/produtos: o catálogo da loja, ativos e inativos (RF21). */
export function listarProdutos(filtro: FiltroProdutos = {}, sinal?: AbortSignal) {
  return requisitar<Lista<ProdutoDaLoja>>('GET', '/api/loja/produtos', {
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

/** GET /api/loja/cupons: os cupons da loja e o uso de cada um (RF23). */
export function listarCupons(sinal?: AbortSignal) {
  return requisitar<Lista<CupomDaLoja>>('GET', '/api/loja/cupons', { busca: { tamanho: 100 }, sinal })
}

/** POST /api/loja/cupons */
export function criarCupom(cupom: PedidoCupom) {
  return requisitar<CupomDaLoja>('POST', '/api/loja/cupons', { corpo: cupom })
}

/** PUT /api/loja/cupons/{id}: edita, desativa ou reativa (o que não vier fica como está). */
export function editarCupom(id: string, edicao: EdicaoCupom) {
  return requisitar<CupomDaLoja>('PUT', `/api/loja/cupons/${encodeURIComponent(id)}`, { corpo: edicao })
}

/** DELETE /api/loja/cupons/{id}: só o cupom nunca usado e sem reserva. */
export function excluirCupom(id: string) {
  return requisitar<void>('DELETE', `/api/loja/cupons/${encodeURIComponent(id)}`)
}

/** GET /api/loja/relatorios: o desempenho da loja no período (RF24). */
export function buscarRelatorio(periodo: Periodo, sinal?: AbortSignal) {
  return requisitar<Relatorio>('GET', '/api/loja/relatorios', { busca: { periodo }, sinal })
}

/** GET /api/loja/extrato: vendas pela plataforma, descontos e reembolsos a receber (RF25). */
export function buscarExtrato(periodo: Periodo, pagina: number, sinal?: AbortSignal) {
  return requisitar<Extrato>('GET', '/api/loja/extrato', { busca: { periodo, pagina, tamanho: 20 }, sinal })
}
