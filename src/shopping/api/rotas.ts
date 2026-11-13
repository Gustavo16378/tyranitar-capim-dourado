// Uma função por rota da API que o painel do shopping usa, com os tipos de src/tipos/shopping.ts.
// As telas chamam estas funções, nunca fetch direto. Rota nova: escreva a função aqui e,
// enquanto a API não existir, o mock em src/mocks/shopping/.
import type {
  ConfiguracaoDoShopping,
  FiltroLojas,
  LojaDoShopping,
  LojistaCriado,
  LojistaDaLoja,
  Pagina,
  PedidoLogin,
  PedidoCupom,
  PedidoLoja,
  PedidoLojista,
  RespostaLogin,
  VoucherDoShopping,
} from '../../tipos/shopping'
import { requisitar } from './cliente'

/** POST /api/auth/login */
export function entrar(pedido: PedidoLogin) {
  return requisitar<RespostaLogin>('POST', '/api/auth/login', { corpo: pedido })
}

/** GET /api/shopping/lojas: as unidades da planta, com a loja de cada uma ou vaga (RF27). */
export function listarLojas(filtro: FiltroLojas = {}, sinal?: AbortSignal) {
  return requisitar<Pagina<LojaDoShopping>>('GET', '/api/shopping/lojas', {
    busca: { q: filtro.q, situacao: filtro.situacao, pagina: filtro.pagina, tamanho: filtro.tamanho },
    sinal,
  })
}

/** PUT /api/shopping/lojas/{id}: ocupar uma vaga, editar a loja ou liberar a unidade. */
export function editarLoja(id: string, loja: PedidoLoja) {
  return requisitar<LojaDoShopping>('PUT', `/api/shopping/lojas/${encodeURIComponent(id)}`, { corpo: loja })
}

/** GET /api/shopping/lojas/{id}/lojistas: quem administra a loja. */
export function listarLojistas(lojaId: string, sinal?: AbortSignal) {
  return requisitar<LojistaDaLoja[]>('GET', `/api/shopping/lojas/${encodeURIComponent(lojaId)}/lojistas`, { sinal })
}

/** POST /api/shopping/lojistas: cria o acesso de um lojista, com senha provisória (RF27). */
export function criarLojista(pedido: PedidoLojista) {
  return requisitar<LojistaCriado>('POST', '/api/shopping/lojistas', { corpo: pedido })
}

/** GET /api/shopping/configuracao: níveis, pontos por real e prazos das reservas (RF28). */
export function buscarConfiguracao(sinal?: AbortSignal) {
  return requisitar<ConfiguracaoDoShopping>('GET', '/api/shopping/configuracao', { sinal })
}

/** PUT /api/shopping/configuracao */
export function salvarConfiguracao(configuracao: ConfiguracaoDoShopping) {
  return requisitar<ConfiguracaoDoShopping>('PUT', '/api/shopping/configuracao', { corpo: configuracao })
}

/** GET /api/shopping/cupons: os vouchers do shopping, com uso e o que foi devolvido às lojas (RF28). */
export function listarVouchers(sinal?: AbortSignal) {
  return requisitar<Pagina<VoucherDoShopping>>('GET', '/api/shopping/cupons', { busca: { tamanho: 100 }, sinal })
}

/** POST /api/shopping/cupons: um voucher que vale em qualquer loja e aparece na vitrine do app. */
export function criarVoucher(voucher: PedidoCupom) {
  return requisitar<VoucherDoShopping>('POST', '/api/shopping/cupons', { corpo: voucher })
}
