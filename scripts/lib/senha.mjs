// Hash de senha no Node, no mesmo formato de functions/_lib/auth/senha.ts:
// pbkdf2_sha256$<iterações>$<sal base64>$<hash base64>. O teste tests/unidade/seed.test.ts
// confere que a API aceita os hashes gerados aqui.
import { randomBytes, webcrypto } from 'node:crypto'

export const ITERACOES = 100_000

export async function hashSenha(senha, iteracoes = ITERACOES) {
  const sal = randomBytes(16)
  const chave = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    chave,
    256,
  )
  return `pbkdf2_sha256$${iteracoes}$${sal.toString('base64')}$${Buffer.from(bits).toString('base64')}`
}
