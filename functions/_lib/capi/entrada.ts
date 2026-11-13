// Validação do corpo de POST /api/chat.
import { ErroApi } from '../erros'

export const TEXTO_MAXIMO = 1000

export interface EntradaDoChat {
  texto: string
}

export function lerEntradaDoChat(corpo: Record<string, unknown>): EntradaDoChat {
  const texto = typeof corpo.texto === 'string' ? corpo.texto.trim() : ''
  if (corpo.texto !== undefined && typeof corpo.texto !== 'string') {
    throw new ErroApi('DADOS_INVALIDOS', 'O campo texto precisa ser um texto.')
  }
  if (texto.length > TEXTO_MAXIMO) {
    throw new ErroApi('DADOS_INVALIDOS', `A mensagem aceita até ${TEXTO_MAXIMO} caracteres.`)
  }
  if (!texto) throw new ErroApi('DADOS_INVALIDOS', 'Escreva uma mensagem para a Capi.')
  return { texto }
}
