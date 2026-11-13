/// <reference types="vite/client" />
// O cliente HTTP e a sessão do painel da loja. As rotas (rotas.ts) usam este requisitar().
import { criarRequisitar } from '../../painel/api/http'
import { sessaoDaLoja } from '../../painel/api/sessoes'

/** A sessão do painel: quem grava é o login único (/entrar). */
export const sessao = sessaoDaLoja

export const requisitar = criarRequisitar({
  sessao,
  // Todas as rotas do painel da loja já estão na API (functions/api/loja).
  mocksLigados: false,
})
