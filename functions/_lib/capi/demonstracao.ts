// Respostas salvas para a demonstração (RNF10, TM04): o pitch responde mesmo sem internet ou
// com o Claude fora do ar. O texto é fixo; os produtos vêm do banco, pela busca (RN14).
import { buscarNoCatalogo, registrarResultado } from '../catalogo'
import { normalizar } from '../texto'
import salvas from './demonstracao.json'

export interface RespostaSalva {
  id: string
  /** Trechos que disparam a resposta (sem acento, minúsculas). */
  textos: string[]
  /** SHA-256 (hex) das fotos do pitch que disparam a resposta. */
  imagensSha256: string[]
  resposta: string
  busca: { texto?: string; categoria?: string }
}

export const RESPOSTAS_SALVAS: RespostaSalva[] = salvas.respostas
export const RESPOSTA_SALVA_SEM_PRODUTO = 'Não achei isso no shopping agora. Quer que eu procure outra coisa?'

/** SHA-256 em hex dos bytes da foto (o mesmo que o scripts/hash-imagem.mjs calcula do arquivo). */
export async function sha256DaImagem(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** A resposta salva para esta mensagem, se houver: primeiro pela foto, depois pelo texto. */
export function acharRespostaSalva(
  mensagem: { texto: string; imagemSha256?: string },
  lista: RespostaSalva[] = RESPOSTAS_SALVAS,
): RespostaSalva | null {
  if (mensagem.imagemSha256) {
    const pelaFoto = lista.find((r) => r.imagensSha256.includes(mensagem.imagemSha256!))
    if (pelaFoto) return pelaFoto
  }
  const texto = normalizar(mensagem.texto)
  if (!texto.trim()) return null
  return lista.find((r) => r.textos.some((t) => texto.includes(normalizar(t)))) ?? null
}

/** Os produtos da resposta salva, buscados agora no banco, com a busca registrada (RN12). */
export async function produtosDaRespostaSalva(db: D1Database, salva: RespostaSalva, clienteId: string) {
  const encontrados = await buscarNoCatalogo(db, salva.busca)
  await registrarResultado(db, {
    clienteId,
    termo: salva.busca.texto ?? salva.busca.categoria ?? salva.id,
    categoria: salva.busca.categoria,
    encontrados,
  })
  return encontrados
}
