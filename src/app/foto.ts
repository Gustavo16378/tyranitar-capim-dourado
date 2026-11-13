// A foto que o cliente manda à Capi: reduzida no aparelho antes de enviar (até 4 MB pelo
// contrato; na prática fica bem abaixo), em JPEG, já com a orientação certa da câmera.
import { IMAGEM_MAXIMA_BYTES, tamanhoDoBase64 } from '../api/limites'

/** Maior lado da foto enviada, em px: suficiente para a Capi reconhecer o produto. */
const LADO_MAXIMO = 1280
const QUALIDADES = [0.82, 0.6, 0.4]

export interface FotoReduzida {
  imagem: { tipo: 'image/jpeg'; base64: string }
  /** data URL para a prévia na conversa. */
  previa: string
}

/** Quanto encolher para o maior lado caber em LADO_MAXIMO (nunca aumenta). */
function escalaPara(largura: number, altura: number, lado = LADO_MAXIMO) {
  return Math.min(1, lado / Math.max(largura, altura))
}

async function abrir(arquivo: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) return createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function lerComoDataUrl(blob: Blob) {
  return new Promise<string>((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver(String(leitor.result))
    leitor.onerror = () => rejeitar(leitor.error)
    leitor.readAsDataURL(blob)
  })
}

export async function reduzirFoto(arquivo: File): Promise<FotoReduzida> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Esse arquivo não é uma foto. Escolha uma imagem.')
  let fonte: Awaited<ReturnType<typeof abrir>>
  try {
    fonte = await abrir(arquivo)
  } catch {
    throw new Error('Não consegui abrir essa foto. Tente outra, em JPG ou PNG.')
  }
  const escala = escalaPara(fonte.width, fonte.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(fonte.width * escala)
  canvas.height = Math.round(fonte.height * escala)
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Não consegui preparar a foto neste aparelho.')
  // JPEG não tem transparência: um PNG com fundo vazio ficaria preto. Fundo branco, como papel.
  contexto.fillStyle = 'white'
  contexto.fillRect(0, 0, canvas.width, canvas.height)
  contexto.drawImage(fonte, 0, 0, canvas.width, canvas.height)

  for (const qualidade of QUALIDADES) {
    const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/jpeg', qualidade))
    if (!blob) break
    const previa = await lerComoDataUrl(blob)
    const base64 = previa.slice(previa.indexOf(',') + 1)
    if (tamanhoDoBase64(base64) <= IMAGEM_MAXIMA_BYTES) return { imagem: { tipo: 'image/jpeg', base64 }, previa }
  }
  throw new Error('A foto ficou grande demais para enviar. Tente outra.')
}
