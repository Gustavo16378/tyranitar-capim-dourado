// O seed (scripts/gerar-seed.mjs) grava hashes que a API aceita, e as senhas não estão no repositório.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { verificarSenha } from '../../functions/_lib/auth/senha'
import { hashSenha } from '../../scripts/lib/senha.mjs'

const raiz = new URL('../../', import.meta.url)

describe('seed da demo', () => {
  it('o hash gerado pelo seed abre a conta na API', async () => {
    const hash = await hashSenha('uma-senha-de-teste-longa')
    expect(hash).toMatch(/^pbkdf2_sha256\$100000\$/)
    expect(await verificarSenha('uma-senha-de-teste-longa', hash)).toBe(true)
    expect(await verificarSenha('outra-senha-qualquer', hash)).toBe(false)
  })

  it('o .dev.vars.exemplo tem as chaves das senhas, sem valor', () => {
    const exemplo = readFileSync(new URL('.dev.vars.exemplo', raiz), 'utf8')
    const chaves = [...exemplo.matchAll(/^([A-Z_]+)=(.*)$/gm)]
    expect(chaves.map(([, chave]) => chave)).toEqual(
      expect.arrayContaining(['SEED_SENHA_CLIENTE', 'SEED_SENHA_LOJISTA', 'SEED_SENHA_ADMIN']),
    )
    expect(chaves.filter(([, , valor]) => valor.trim() !== '').map(([, chave]) => chave)).toEqual([])
  })

  it('as migrations só têm o esquema, sem INSERT de dados da demo', () => {
    const pasta = new URL('migrations/', raiz)
    const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith('.sql'))
    expect(arquivos.length).toBeGreaterThan(0)
    for (const nome of arquivos) {
      expect(readFileSync(new URL(nome, pasta), 'utf8'), nome).not.toMatch(/INSERT INTO (loja|usuario|produto|cupom)\b/)
    }
  })
})
