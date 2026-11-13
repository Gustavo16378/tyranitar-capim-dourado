// Mocks da API do painel da loja, no formato de docs/api.md, só para as rotas que a API ainda
// não tem: cupons e relatórios. O login, o atendimento, as compras, as reservas, os produtos e o
// extrato já vão para a API real (functions/api/loja).
//
// Como trocar pela API real: quando a rota existir em functions/, apague a linha dela em
// ROTAS_MOCKADAS. O cliente HTTP do painel passa a chamar a API sozinho. Quando a tabela
// ficar vazia, apague esta pasta, a src/mocks/comum e ponha mocksLigados: false em
// src/loja/api/cliente.ts. As rotas mockadas aceitam o token do login real (só leem o perfil).
import { criarCupom, listarCupons } from './cupons'
import { buscarRelatorio } from './relatorios'
import type { Manipulador } from '../comum/resposta'
import { criarResponderMock } from '../comum/servidor'

export { reiniciarMocks } from './dados'

export const ROTAS_MOCKADAS: Record<string, Manipulador> = {
  'GET /api/loja/cupons': listarCupons,
  'POST /api/loja/cupons': criarCupom,
  'GET /api/loja/relatorios': buscarRelatorio,
}

/** Responde como a API se a rota estiver mockada; senão devolve null e o cliente HTTP chama a API. */
export const responderMock = criarResponderMock(ROTAS_MOCKADAS)
