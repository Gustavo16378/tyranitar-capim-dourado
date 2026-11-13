/// <reference types="vite/client" />
// (A linha acima dá o tipo de import.meta.env também quando os testes compilam este arquivo.)
//
// Cliente HTTP do painel da loja. Toda chamada à API passa por requisitar():
// põe o token, manda JSON, e transforma qualquer erro em ErroApi, no formato
// { status, erro, mensagem } de docs/api.md.
//
// Mocks: enquanto uma rota estiver na tabela de src/mocks/loja/index.ts, quem responde é o
// mock, no mesmo formato da API. Quando a rota real ficar pronta, apague a linha dela lá e
// nada muda aqui nem nas telas. Para testar tudo contra a API real: VITE_LOJA_MOCKS=0.
import type { CorpoErro } from '../../tipos/loja'
import { apagarSessao, lerSessao } from './sessao'

export const MOCKS_LIGADOS = import.meta.env.VITE_LOJA_MOCKS !== '0'

/** Erro da API (ou da rede), com a frase pronta para mostrar em `mensagem`. */
export class ErroApi extends Error {
  readonly status: number
  readonly erro: string
  readonly mensagem: string

  constructor({ status, erro, mensagem }: CorpoErro) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.erro = erro
    this.mensagem = mensagem
  }

  /** Vale tentar de novo? Sem conexão ou falha do servidor, sim; erro de regra (4xx), não. */
  get passageiro() {
    return this.status === 0 || this.status >= 500
  }
}

const SEM_CONEXAO: CorpoErro = {
  status: 0,
  erro: 'SEM_CONEXAO',
  mensagem: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
}

/** Qualquer coisa que um catch recebe vira ErroApi. */
export function paraErroApi(erro: unknown): ErroApi {
  if (erro instanceof ErroApi) return erro
  if (erro instanceof TypeError) return new ErroApi(SEM_CONEXAO)
  return new ErroApi({ status: 0, erro: 'ERRO_INESPERADO', mensagem: 'Algo deu errado. Tente de novo.' })
}

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OpcoesRequisicao {
  /** Vai como JSON no corpo. */
  corpo?: unknown
  /** Vira ?chave=valor; valores undefined ficam de fora. */
  busca?: Record<string, string | number | undefined>
  /** Para cancelar a chamada quando a tela sai (o useConsulta já passa um). */
  sinal?: AbortSignal
}

export async function requisitar<T>(metodo: Metodo, caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const url = caminho + montarBusca(opcoes.busca)
  const corpo = opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)
  const token = lerSessao()?.token ?? null

  if (MOCKS_LIGADOS) {
    // Import dinâmico: os mocks ficam num pedaço separado do bundle.
    const { responderMock } = await import('../../mocks/loja')
    const resposta = await responderMock({ metodo, url, corpo, token })
    if (resposta) return tratar<T>(resposta)
  }

  const cabecalhos: Record<string, string> = { Accept: 'application/json' }
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  let resposta: Response
  try {
    resposta = await fetch(url, { method: metodo, headers: cabecalhos, body: corpo, signal: opcoes.sinal })
  } catch (erro) {
    if (opcoes.sinal?.aborted) throw erro
    throw new ErroApi(SEM_CONEXAO)
  }
  return tratar<T>(resposta)
}

function montarBusca(busca: OpcoesRequisicao['busca']) {
  if (!busca) return ''
  const parametros = new URLSearchParams()
  for (const [chave, valor] of Object.entries(busca)) {
    if (valor !== undefined && valor !== '') parametros.set(chave, String(valor))
  }
  const texto = parametros.toString()
  return texto ? `?${texto}` : ''
}

async function tratar<T>(resposta: Response): Promise<T> {
  const corpo: unknown = resposta.status === 204 ? undefined : await resposta.json().catch(() => undefined)
  if (resposta.ok) return corpo as T

  // Token vencido ou inválido: a sessão acaba e o painel volta para o login.
  if (resposta.status === 401) apagarSessao()
  throw new ErroApi(comoCorpoErro(corpo, resposta.status))
}

function comoCorpoErro(corpo: unknown, status: number): CorpoErro {
  const c = corpo as Partial<CorpoErro> | undefined
  if (c && typeof c.erro === 'string' && typeof c.mensagem === 'string') {
    return { status, erro: c.erro, mensagem: c.mensagem }
  }
  // Resposta fora do contrato (HTML de erro, proxy sem a API rodando...).
  return {
    status,
    erro: 'RESPOSTA_INVALIDA',
    mensagem: 'O servidor respondeu de um jeito inesperado. Tente de novo em instantes.',
  }
}
