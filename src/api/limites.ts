// Limites de POST /api/chat (docs/api.md › Capi), os mesmos que o servidor confere.
import type { TipoDeImagem } from '../tipos'

export const TEXTO_MAXIMO = 1000
/** O app reduz a foto antes de enviar; acima disto, o servidor recusa. */
export const IMAGEM_MAXIMA_BYTES = 4 * 1024 * 1024
export const TIPOS_DE_IMAGEM: readonly TipoDeImagem[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Bytes de um base64, sem decodificar. */
export function tamanhoDoBase64(base64: string) {
  const sobra = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - sobra
}
