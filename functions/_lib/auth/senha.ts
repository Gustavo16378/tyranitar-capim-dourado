// Senhas com PBKDF2-SHA256 (Web Crypto), 100 mil iterações e sal aleatório por usuário.
// Formato guardado: pbkdf2_sha256$<iterações>$<sal base64>$<hash base64>.
// O scripts/gerar-seed.mjs gera hashes neste mesmo formato.

const ALGORITMO = 'pbkdf2_sha256'
/** 100 mil é o que o projeto pede e também o máximo que o Workers aceita. */
export const ITERACOES = 100_000

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

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivar(senha, sal, ITERACOES)
  return [ALGORITMO, ITERACOES, paraBase64(sal), paraBase64(hash)].join('$')
}

export async function verificarSenha(senha: string, guardado: string): Promise<boolean> {
  const [algoritmo, iteracoes, sal, hash, ...sobra] = guardado.split('$')
  const n = Number(iteracoes)
  if (algoritmo !== ALGORITMO || !Number.isInteger(n) || n < 1 || n > ITERACOES || !sal || !hash || sobra.length) {
    return false
  }
  try {
    return iguaisEmTempoConstante(deBase64(hash), await derivar(senha, deBase64(sal), n))
  } catch {
    return false
  }
}

let hashDeComparacao: Promise<string> | undefined

/** Hash qualquer, para o login gastar o mesmo tempo quando o e-mail não existe. */
export function hashParaComparar() {
  hashDeComparacao ??= gerarHashSenha('senha-que-nenhum-usuario-tem')
  return hashDeComparacao
}
