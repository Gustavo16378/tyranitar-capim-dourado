// A conta do cliente (tela Minha conta). Sem mock: as rotas existem em functions/api/me.
import type { Conta, FichaDoCliente, MeusDados } from '../tipos'
import { sair } from './auth'
import { requisitar } from './cliente'
import { mudarNomeNaSessao } from './sessao'

/** GET /api/me */
export function obterConta() {
  return requisitar<Conta>('GET', '/api/me')
}

/** PATCH /api/me: troca o nome. O nome guardado na sessão (saudação, barra lateral) muda junto. */
export async function mudarNome(nome: string) {
  const conta = await requisitar<Conta>('PATCH', '/api/me', { nome })
  mudarNomeNaSessao(conta.nome)
  return conta
}

/** PUT /api/me/senha: pede a senha atual. Errada, a API responde 400 e a sessão continua. */
export async function trocarSenha(senhaAtual: string, novaSenha: string) {
  await requisitar<null>('PUT', '/api/me/senha', { senhaAtual, novaSenha })
}

/** GET /api/me/ficha: o que a Capi anotou. */
export function obterFicha() {
  return requisitar<FichaDoCliente>('GET', '/api/me/ficha')
}

/** DELETE /api/me/ficha/{id}: apaga um interesse e devolve a ficha atualizada. */
export function apagarInteresse(id: string) {
  return requisitar<FichaDoCliente>('DELETE', `/api/me/ficha/${encodeURIComponent(id)}`)
}

/** GET /api/me/dados (LGPD): tudo o que o app guarda sobre o cliente. A tela salva como arquivo. */
export function obterMeusDados() {
  return requisitar<MeusDados>('GET', '/api/me/dados')
}

/** PUT /api/me/consentimento: desligar apaga a ficha na hora. Devolve a conta atualizada. */
export function mudarConsentimento(compartilharFicha: boolean) {
  return requisitar<Conta>('PUT', '/api/me/consentimento', { compartilharFicha })
}

/** DELETE /api/me: exclui a conta e encerra a sessão neste aparelho. */
export async function excluirConta() {
  await requisitar<null>('DELETE', '/api/me')
  sair()
}
