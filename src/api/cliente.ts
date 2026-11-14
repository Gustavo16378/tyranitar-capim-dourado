// Cliente HTTP da API (/api, mesmo domínio). Toda chamada passa por requisitar(): ela põe o
// token, fala JSON e transforma qualquer falha em ErroApi, no formato { status, erro, mensagem }.
import type { RespostaErro } from '../tipos'
import { usarMock } from './fonte'
import { apagarSessao, lerSessao } from './sessao'

export class ErroApi extends Error implements RespostaErro {
  status: number
  erro: string
  mensagem: string
  /** RESERVA_REPETIDA: a reserva em aberto que o cliente já tem, com o link dela. */
  reserva?: { id: string; link: string }

  constructor({ status, erro, mensagem, reserva }: RespostaErro) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.erro = erro
    this.mensagem = mensagem
    if (reserva) this.reserva = reserva
  }
}

/** Qualquer erro vira ErroApi; o que não veio da API ganha uma mensagem que o cliente entende. */
export function comoErroApi(erro: unknown): ErroApi {
  if (erro instanceof ErroApi) return erro
  return new ErroApi({
    status: 0,
    erro: 'SEM_CONEXAO',
    mensagem: 'Não deu para falar com o servidor. Confira a internet e tente de novo.',
  })
}

function ehRespostaErro(corpo: unknown): corpo is RespostaErro {
  return typeof corpo === 'object' && corpo !== null && 'erro' in corpo && 'mensagem' in corpo
}

/** Monta ?a=1&b=2, pulando os campos vazios. */
export function query(params: object = {}) {
  const busca = new URLSearchParams()
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== '') busca.set(chave, String(valor))
  }
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}

export async function requisitar<T>(
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  caminho: string,
  corpo?: unknown,
  /** Para cancelar a chamada (o tempo limite da Capi). */
  sinal?: AbortSignal,
) {
  const cabecalhos: Record<string, string> = { Accept: 'application/json' }
  // O token do login em mock não vale na API real (que recusa token inválido até em rota pública).
  const token = usarMock('auth') ? undefined : lerSessao()?.token
  if (token) cabecalhos.Authorization = `Bearer ${token}`
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: sinal,
    })
  } catch (erro) {
    throw comoErroApi(erro)
  }

  const json: unknown = resposta.status === 204 ? null : await resposta.json().catch(() => null)
  // Token vencido ou inválido: a sessão acaba e o app volta para a tela de login.
  if (resposta.status === 401 && token) apagarSessao()
  if (!resposta.ok) {
    throw new ErroApi(
      ehRespostaErro(json)
        ? { status: resposta.status, erro: json.erro, mensagem: json.mensagem, ...(json.reserva ? { reserva: json.reserva } : {}) }
        : {
            status: resposta.status,
            erro: 'ERRO_INESPERADO',
            mensagem: 'Algo deu errado do nosso lado. Tente de novo.',
          },
    )
  }
  return json as T
}
