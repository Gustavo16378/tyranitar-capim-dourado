// Chama uma rota das Functions como o Pages faz: passa pelo _middleware (erros no formato da
// API, JWT e perfis) e depois pela rota. O token é um JWT de verdade, assinado com o
// JWT_SECRET dos testes.
import { env } from 'cloudflare:test'
import { onRequest as middleware } from '../../functions/api/_middleware'
import { emitirToken, type UsuarioSessao } from '../../functions/_lib/auth/jwt'
import type { Dados, Rota } from '../../functions/_lib/contexto'

export const ANA: UsuarioSessao = { id: 'c-ana', nome: 'Ana Souza', perfil: 'CLIENTE', lojaId: null }
export const BRUNO: UsuarioSessao = { id: 'c-bruno', nome: 'Bruno Lima', perfil: 'CLIENTE', lojaId: null }
export const LOJISTA_A: UsuarioSessao = { id: 'l-a', nome: 'Equipe da Loja A', perfil: 'LOJISTA', lojaId: 'loja-a' }
export const LOJISTA_B: UsuarioSessao = { id: 'l-b', nome: 'Equipe da Loja B', perfil: 'LOJISTA', lojaId: 'loja-b' }
export const ADMIN: UsuarioSessao = { id: 'admin', nome: 'Administração', perfil: 'ADMIN_SHOPPING', lojaId: null }

export async function chamar(
  rota: Rota<string>,
  pedido: {
    metodo?: string
    url: string
    corpo?: unknown
    /** Corpo em texto, no lugar do JSON, como o CSV da importação: { conteudo, tipo: 'text/csv' }. */
    texto?: { conteudo: string; tipo: string }
    params?: Record<string, string>
    usuario?: UsuarioSessao
    /** Variáveis a mais só para esta chamada, como { DEMO: '1' }. */
    ambiente?: Partial<Env>
  },
) {
  const cabecalhos = new Headers({ 'content-type': pedido.texto?.tipo ?? 'application/json' })
  if (pedido.usuario) cabecalhos.set('Authorization', `Bearer ${await emitirToken(pedido.usuario, env.JWT_SECRET)}`)
  const request = new Request(`https://teste.local${pedido.url}`, {
    method: pedido.metodo ?? 'GET',
    headers: cabecalhos,
    body: pedido.texto ? pedido.texto.conteudo : pedido.corpo === undefined ? undefined : JSON.stringify(pedido.corpo),
  })
  const cadeia = [...middleware, rota]
  const data: Dados = {}
  const contexto = (i: number): Parameters<Rota<string>>[0] =>
    ({
      request,
      env: { ...env, ...pedido.ambiente },
      params: pedido.params ?? {},
      data,
      functionPath: pedido.url,
      waitUntil: () => {},
      passThroughOnException: () => {},
      next: async () => cadeia[i + 1](contexto(i + 1)),
    }) as unknown as Parameters<Rota<string>>[0]
  const resposta = await cadeia[0](contexto(0))
  const texto = await resposta.text()
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, cabecalhos: resposta.headers, texto }
}
