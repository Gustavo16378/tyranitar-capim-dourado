/// <reference types="vite/client" />
// O cliente HTTP e a sessão do painel da loja. As rotas (rotas.ts) usam este requisitar().
import { criarRequisitar } from '../../painel/api/http'
import { criarSessao } from '../../painel/api/sessao'

/** Mocks de src/mocks/loja ligados. Para testar tudo contra a API real: VITE_LOJA_MOCKS=0. */
export const MOCKS_LIGADOS = import.meta.env.VITE_LOJA_MOCKS !== '0'

export const sessao = criarSessao('loja.sessao')

export const requisitar = criarRequisitar({
  sessao,
  mocksLigados: MOCKS_LIGADOS,
  carregarMocks: () => import('../../mocks/loja'),
})
