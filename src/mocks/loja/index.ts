// Mocks da API do painel da loja, no formato de docs/api.md.
//
// Como trocar pela API real: quando a rota existir em functions/, apague a linha dela em
// ROTAS_MOCKADAS. O cliente HTTP do painel passa a chamar a API sozinho. Quando a tabela
// ficar vazia, apague esta pasta e ponha mocksLigados: false em src/loja/api/cliente.ts.
//
// Ordem segura: o login primeiro. As rotas mockadas aceitam o token real (só leem o
// perfil), mas a API real recusa o token do mock.
import { entrar } from './auth'
import { buscarAtendimento, calcularPrevia, registrarCompra } from './atendimento'
import { criarCupom, listarCupons } from './cupons'
import { criarProduto, editarProduto, importarProdutos, listarProdutos } from './produtos'
import { buscarRelatorio } from './relatorios'
import { listarReservas, mudarStatusReserva } from './reservas'
import type { Manipulador } from '../comum/resposta'
import { criarResponderMock } from '../comum/servidor'

export { reiniciarMocks } from './dados'

export const ROTAS_MOCKADAS: Record<string, Manipulador> = {
  'POST /api/auth/login': entrar,
  'GET /api/loja/atendimento/:qr': buscarAtendimento,
  'POST /api/loja/atendimento/previa': calcularPrevia,
  'POST /api/loja/compras': registrarCompra,
  'GET /api/loja/reservas': listarReservas,
  'PATCH /api/loja/reservas/:id': mudarStatusReserva,
  'GET /api/loja/produtos': listarProdutos,
  'POST /api/loja/produtos': criarProduto,
  'PUT /api/loja/produtos/:id': editarProduto,
  'POST /api/loja/produtos/importar': importarProdutos,
  'GET /api/loja/cupons': listarCupons,
  'POST /api/loja/cupons': criarCupom,
  'GET /api/loja/relatorios': buscarRelatorio,
}

/** Responde como a API se a rota estiver mockada; senão devolve null e o cliente HTTP chama a API. */
export const responderMock = criarResponderMock(ROTAS_MOCKADAS)
