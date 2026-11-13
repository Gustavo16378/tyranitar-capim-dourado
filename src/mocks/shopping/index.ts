// Mocks da API do painel do shopping, no formato de docs/api.md.
//
// Como trocar pela API real: quando a rota existir em functions/, apague a linha dela em
// ROTAS_MOCKADAS. O cliente HTTP do painel passa a chamar a API sozinho. Quando a tabela
// ficar vazia, apague esta pasta e ponha mocksLigados: false em src/shopping/api/cliente.ts.
//
// Ordem segura: o login primeiro. As rotas mockadas aceitam o token real (só leem o
// perfil), mas a API real recusa o token do mock.
import type { Manipulador } from '../comum/resposta'
import { criarResponderMock } from '../comum/servidor'
import { entrar } from './auth'
import { criarLojista, editarLoja, listarLojas, listarLojistas } from './lojas'

export { reiniciarMocks } from './dados'

export const ROTAS_MOCKADAS: Record<string, Manipulador> = {
  'POST /api/auth/login': entrar,
  'GET /api/shopping/lojas': listarLojas,
  'PUT /api/shopping/lojas/:id': editarLoja,
  'GET /api/shopping/lojas/:id/lojistas': listarLojistas,
  'POST /api/shopping/lojistas': criarLojista,
}

/** Responde como a API se a rota estiver mockada; senão devolve null e o cliente HTTP chama a API. */
export const responderMock = criarResponderMock(ROTAS_MOCKADAS)
