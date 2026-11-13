// Validação do corpo de POST /api/chat: { texto?, imagem?: { tipo, base64 }, link? }.
// imagem e link são opcionais e não vêm juntos; sem eles, o texto é obrigatório.
import { ErroApi } from '../erros'

export const TEXTO_MAXIMO = 1000
/** O app reduz a foto antes de enviar; acima disto, 400 (RF03). */
export const IMAGEM_MAXIMA_BYTES = 4 * 1024 * 1024
export const TIPOS_DE_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export type TipoDeImagem = (typeof TIPOS_DE_IMAGEM)[number]

export interface EntradaDoChat {
  texto: string
  imagem?: { tipo: TipoDeImagem; base64: string }
  link?: string
}

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)

/** Bytes de um base64 sem precisar decodificar. */
export function tamanhoDoBase64(base64: string) {
  const sobra = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - sobra
}

function lerImagem(valor: unknown): EntradaDoChat['imagem'] {
  if (!valor || typeof valor !== 'object') throw invalido('A imagem vem como { tipo, base64 }.')
  const { tipo, base64 } = valor as Record<string, unknown>
  if (typeof base64 !== 'string' || !base64) throw invalido('Mande a foto em base64.')
  // Aceita também "data:image/jpeg;base64,..." vindo direto do navegador.
  const dataUrl = base64.match(/^data:(image\/[a-z]+);base64,(.*)$/s)
  const tipoFinal = dataUrl?.[1] ?? tipo
  const dados = (dataUrl?.[2] ?? base64).replace(/\s/g, '')
  if (!TIPOS_DE_IMAGEM.includes(tipoFinal as TipoDeImagem)) {
    throw invalido('A foto precisa ser JPEG, PNG, WebP ou GIF.')
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dados)) throw invalido('A foto não está em base64 válido.')
  if (tamanhoDoBase64(dados) > IMAGEM_MAXIMA_BYTES) throw invalido('A foto passa de 4 MB. Mande uma foto menor.')
  return { tipo: tipoFinal as TipoDeImagem, base64: dados }
}

function lerLink(valor: unknown): string {
  if (typeof valor !== 'string' || valor.length > 2000) throw invalido('Mande o link como texto, com até 2.000 caracteres.')
  let url: URL
  try {
    url = new URL(valor.trim())
  } catch {
    throw invalido('Esse link não parece um endereço de página.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw invalido('O link precisa começar com http ou https.')
  return url.toString()
}

export function lerEntradaDoChat(corpo: Record<string, unknown>): EntradaDoChat {
  if (corpo.texto !== undefined && corpo.texto !== null && typeof corpo.texto !== 'string') {
    throw invalido('O campo texto precisa ser um texto.')
  }
  const texto = typeof corpo.texto === 'string' ? corpo.texto.trim() : ''
  if (texto.length > TEXTO_MAXIMO) throw invalido(`A mensagem aceita até ${TEXTO_MAXIMO} caracteres.`)

  const temImagem = corpo.imagem !== undefined && corpo.imagem !== null
  const temLink = corpo.link !== undefined && corpo.link !== null && corpo.link !== ''
  if (temImagem && temLink) throw invalido('Mande a foto ou o link, um de cada vez.')
  if (!texto && !temImagem && !temLink) throw invalido('Escreva uma mensagem para a Capi.')

  return {
    texto,
    ...(temImagem ? { imagem: lerImagem(corpo.imagem) } : {}),
    ...(temLink ? { link: lerLink(corpo.link) } : {}),
  }
}
