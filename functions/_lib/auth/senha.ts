// Senhas com PBKDF2-SHA256 (Web Crypto) e sal aleatório por usuário.
// Formato guardado: pbkdf2_sha256$<iterações>$<sal base64>$<hash base64>.
// As iterações ficam dentro do hash: a verificação usa as do hash, então dá para mudar
// ITERACOES sem quebrar senhas antigas; no próximo login a senha é regravada com o valor novo.
// O scripts/lib/senha.mjs (usado pelo seed) gera hashes neste mesmo formato.

const ALGORITMO = 'pbkdf2_sha256'
/** Iterações dos hashes novos. O projeto pede 100 mil. */
export const ITERACOES = 100_000
/** O Workers recusa PBKDF2 com mais de 100 mil iterações. */
export const ITERACOES_MAXIMAS = 100_000

const paraBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))

async function derivar(senha: string, sal: Uint8Array<ArrayBuffer>, iteracoes: number) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    chave,
    256,
  )
  return new Uint8Array(bits)
}

function iguaisEmTempoConstante(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i]
  return diferenca === 0
}

/** Lê as partes do hash guardado; null se estiver fora do formato. */
function partes(guardado: string) {
  const [algoritmo, iteracoes, sal, hash, ...sobra] = guardado.split('$')
  const n = Number(iteracoes)
  if (algoritmo !== ALGORITMO || !Number.isInteger(n) || n < 1 || n > ITERACOES_MAXIMAS || !sal || !hash || sobra.length) {
    return null
  }
  return { iteracoes: n, sal, hash }
}

export async function gerarHashSenha(senha: string, iteracoes = ITERACOES): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivar(senha, sal, iteracoes)
  return [ALGORITMO, iteracoes, paraBase64(sal), paraBase64(hash)].join('$')
}

/** Confere a senha com as iterações gravadas no próprio hash. */
export async function verificarSenha(senha: string, guardado: string): Promise<boolean> {
  const p = partes(guardado)
  if (!p) return false
  try {
    return iguaisEmTempoConstante(deBase64(p.hash), await derivar(senha, deBase64(p.sal), p.iteracoes))
  } catch {
    return false
  }
}

/** Se o hash foi gerado com outras iterações e deve ser regravado no próximo login. */
export function precisaAtualizar(guardado: string) {
  return partes(guardado)?.iteracoes !== ITERACOES
}

let hashDeComparacao: Promise<string> | undefined

/** Hash qualquer, para o login gastar o mesmo tempo quando o e-mail não existe. */
export function hashParaComparar() {
  hashDeComparacao ??= gerarHashSenha('senha-que-nenhum-usuario-tem')
  return hashDeComparacao
}
