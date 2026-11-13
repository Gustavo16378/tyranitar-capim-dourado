// O cliente HTTP e a sessão do painel do shopping. As rotas (rotas.ts) usam este requisitar().
// Todas as rotas do shopping estão na API (functions/api/shopping): sem mocks.
import { criarRequisitar } from '../../painel/api/http'
import { sessaoDoShopping } from '../../painel/api/sessoes'

/** A sessão do painel: quem grava é o login único (/entrar). */
export const sessao = sessaoDoShopping

export const requisitar = criarRequisitar({ sessao, mocksLigados: false })
