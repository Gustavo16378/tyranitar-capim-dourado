// Uma função por rota da API que o painel do shopping usa, com os tipos de src/tipos/shopping.ts.
// As telas chamam estas funções, nunca fetch direto. Rota nova: escreva a função aqui e,
// enquanto a API não existir, o mock em src/mocks/shopping/.
import type {
  FiltroLojas,
  LojaDoShopping,
  LojistaCriado,
  LojistaDaLoja,
  Pagina,
  PedidoLogin,
  PedidoLoja,
  PedidoLojista,
  RespostaLogin,
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
