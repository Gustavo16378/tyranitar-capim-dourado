/// <reference types="vite/client" />
// O cliente HTTP e a sessão do painel do shopping. As rotas (rotas.ts) usam este requisitar().
import { criarRequisitar } from '../../painel/api/http'
import { sessaoDoShopping } from '../../painel/api/sessoes'

/** Mocks de src/mocks/shopping ligados. Para testar tudo contra a API real: VITE_SHOPPING_MOCKS=0. */
export const MOCKS_LIGADOS = import.meta.env.VITE_SHOPPING_MOCKS !== '0'

/** A sessão do painel: quem grava é o login único (/entrar). */
export const sessao = sessaoDoShopping

export const requisitar = criarRequisitar({
  sessao,
  mocksLigados: MOCKS_LIGADOS,
  carregarMocks: () => import('../../mocks/shopping'),
})
