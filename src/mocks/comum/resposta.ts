// Peças comuns dos mocks: o pedido que chega e a resposta no formato da API.

export interface PedidoMock {
  metodo: string
  /** Parâmetros da rota: em '/api/loja/reservas/:id', params.id. */
  params: Record<string, string>
  busca: URLSearchParams
  /** Corpo já lido do JSON (undefined se não veio corpo). */
  corpo: unknown
  token: string | null
}

export interface RespostaMock {
  status: number
  corpo?: unknown
}

export type Manipulador = (pedido: PedidoMock) => RespostaMock

export function ok(corpo: unknown, status = 200): RespostaMock {
  return { status, corpo }
}

/** Erro no formato de docs/api.md: { status, erro, mensagem }. */
export function erro(status: number, codigo: string, mensagem: string): RespostaMock {
  return { status, corpo: { status, erro: codigo, mensagem } }
}

export function dadosInvalidos(mensagem: string) {
  return erro(400, 'DADOS_INVALIDOS', mensagem)
}

export function naoEncontrado(mensagem: string) {
  return erro(404, 'NAO_ENCONTRADO', mensagem)
}

/** O corpo como objeto, ou null se não for um objeto JSON. */
export function objeto(corpo: unknown): Record<string, unknown> | null {
  return typeof corpo === 'object' && corpo !== null && !Array.isArray(corpo)
    ? (corpo as Record<string, unknown>)
    : null
}
