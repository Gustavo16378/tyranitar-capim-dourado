// O seed (migrations/0002_seed.sql) bate com o que o projeto pede e com o login da API.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { verificarSenha } from '../../functions/_lib/auth/senha'

const raiz = new URL('../../', import.meta.url)
const seed = readFileSync(new URL('migrations/0002_seed.sql', raiz), 'utf8')
const senhaTeste = readFileSync(new URL('.dev.vars.exemplo', raiz), 'utf8').match(/^SENHA_TESTE=(.+)$/m)?.[1]?.trim()

/** Linhas de valores do INSERT de uma tabela. */
function linhas(tabela: string) {
  const bloco = seed.match(new RegExp(`INSERT INTO ${tabela} \\([^)]*\\) VALUES\\n([\\s\\S]*?);\\n`))?.[1] ?? ''
  return bloco.split('\n').filter((l) => l.trim().startsWith('('))
}

describe('seed da demo', () => {
  it('tem as 148 lojas da planta, com as vagas inativas', () => {
    const lojas = linhas('loja')
    expect(lojas).toHaveLength(148)
    expect(lojas.filter((l) => l.trimEnd().replace(/,$/, '').endsWith(', 0)'))).toHaveLength(13)
  })

  it('tem Ana Souza com 2.140 pontos e consentimento, um lojista por loja com produto e o admin', () => {
    const usuarios = linhas('usuario')
    const ana = usuarios.find((u) => u.includes("'Ana Souza'"))
    expect(ana).toMatch(/'CLIENTE', NULL, 'q-[0-9a-f]+', 2140, 1,/)
    const lojasComProduto = new Set(linhas('produto').map((p) => p.split("', '")[1]))
    expect(usuarios.filter((u) => u.includes("'LOJISTA'"))).toHaveLength(lojasComProduto.size)
    expect(usuarios.filter((u) => u.includes("'ADMIN_SHOPPING'"))).toHaveLength(1)
  })

  it('a senha de teste do .dev.vars.exemplo abre a conta da Ana', async () => {
    expect(senhaTeste).toBeTruthy()
    const hash = linhas('usuario')
      .find((u) => u.includes("'Ana Souza'"))
      ?.match(/'(pbkdf2_sha256\$[^']+)'/)?.[1]
    expect(hash).toBeTruthy()
    expect(await verificarSenha(senhaTeste!, hash!)).toBe(true)
  })
})
