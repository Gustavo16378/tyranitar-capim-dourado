// Leitura da requisição e escrita da resposta, com erros no formato da API.
import { ErroApi } from './erros'

export function json(dados: unknown, status = 200) {
  return Response.json(dados, { status })
}

export async function lerCorpo(request: Request): Promise<Record<string, unknown>> {
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    throw new ErroApi('DADOS_INVALIDOS', 'Envie os dados em JSON.')
  }
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    throw new ErroApi('DADOS_INVALIDOS', 'Envie os dados como um objeto JSON.')
  }
  return corpo as Record<string, unknown>
}

/** Campo de texto obrigatório do corpo, com tamanho mínimo e máximo. */
export function texto(
  corpo: Record<string, unknown>,
  campo: string,
  { min = 1, max = 200, aparar = true }: { min?: number; max?: number; aparar?: boolean } = {},
): string {
  const valor = corpo[campo]
  if (typeof valor !== 'string') throw new ErroApi('DADOS_INVALIDOS', `Informe o campo ${campo}.`)
  const limpo = aparar ? valor.trim() : valor
  if (limpo.length < min) {
    throw new ErroApi('DADOS_INVALIDOS', `O campo ${campo} precisa ter pelo menos ${min} caracteres.`)
  }
  if (limpo.length > max) throw new ErroApi('DADOS_INVALIDOS', `O campo ${campo} aceita até ${max} caracteres.`)
  return limpo
}

/** Parâmetro inteiro não negativo da URL; undefined quando não veio. */
export function inteiro(url: URL, nome: string): number | undefined {
  const bruto = url.searchParams.get(nome)
  if (bruto === null || bruto.trim() === '') return undefined
  if (!/^\d+$/.test(bruto.trim())) {
    throw new ErroApi('DADOS_INVALIDOS', `O parâmetro ${nome} precisa ser um número inteiro.`)
  }
  return Number(bruto)
}

/** ?pagina=1&tamanho=20. As listas respondem { itens, total }. */
export function paginacao(url: URL, { padrao = 20, maximo = 100 }: { padrao?: number; maximo?: number } = {}) {
  const pagina = inteiro(url, 'pagina') ?? 1
  const tamanho = inteiro(url, 'tamanho') ?? padrao
  if (pagina < 1) throw new ErroApi('DADOS_INVALIDOS', 'A página começa em 1.')
  if (tamanho < 1 || tamanho > maximo) {
    throw new ErroApi('DADOS_INVALIDOS', `O tamanho da página vai de 1 a ${maximo}.`)
  }
  return { pagina, tamanho, inicio: (pagina - 1) * tamanho }
}
