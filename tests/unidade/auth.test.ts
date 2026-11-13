import { describe, expect, it } from 'vitest'
import { emitirToken, lerToken, VALIDADE_SEGUNDOS, type UsuarioSessao } from '../../functions/_lib/auth/jwt'
import { gerarHashSenha, precisaAtualizar, verificarSenha } from '../../functions/_lib/auth/senha'

const SEGREDO = 'segredo-de-teste-com-pelo-menos-32-caracteres'
const ANA: UsuarioSessao = { id: 'c1', nome: 'Ana Souza', perfil: 'CLIENTE', lojaId: null }

describe('senha (TU25)', () => {
  it('a mesma senha gera hashes diferentes, por causa do sal', async () => {
    const [a, b] = await Promise.all([gerarHashSenha('minimo8caracteres'), gerarHashSenha('minimo8caracteres')])
    expect(a).not.toBe(b)
    expect(a).toMatch(/^pbkdf2_sha256\$100000\$/)
  })

  it('a verificação aceita só a senha certa', async () => {
    const hash = await gerarHashSenha('minimo8caracteres')
    expect(await verificarSenha('minimo8caracteres', hash)).toBe(true)
    expect(await verificarSenha('minimo8caracterez', hash)).toBe(false)
    expect(await verificarSenha('', hash)).toBe(false)
  })

  it('recusa hash fora do formato', async () => {
    expect(await verificarSenha('qualquer', 'texto-solto')).toBe(false)
    expect(await verificarSenha('qualquer', 'pbkdf2_sha256$999999999$AAAA$AAAA')).toBe(false)
  })

  it('usa as iterações gravadas no hash e pede para regravar quando mudam', async () => {
    const antigo = await gerarHashSenha('minimo8caracteres', 1_000)
    expect(antigo).toMatch(/^pbkdf2_sha256\$1000\$/)
    expect(await verificarSenha('minimo8caracteres', antigo)).toBe(true)
    expect(precisaAtualizar(antigo)).toBe(true)
    expect(precisaAtualizar(await gerarHashSenha('minimo8caracteres'))).toBe(false)
  })
})

describe('JWT (TU26)', () => {
  it('lê de volta o usuário do token', async () => {
    const token = await emitirToken(ANA, SEGREDO)
    expect(await lerToken(token, SEGREDO)).toEqual(ANA)
  })

  it('rejeita token vencido', async () => {
    const emitido = new Date('2026-11-13T00:00:00Z')
    const token = await emitirToken(ANA, SEGREDO, emitido)
    const depois = new Date(emitido.getTime() + (VALIDADE_SEGUNDOS + 1) * 1000)
    await expect(lerToken(token, SEGREDO, depois)).rejects.toMatchObject({ codigo: 'NAO_AUTENTICADO' })
  })

  it('rejeita assinatura errada e token adulterado', async () => {
    const token = await emitirToken(ANA, SEGREDO)
    await expect(lerToken(token, `${SEGREDO}-outro`)).rejects.toMatchObject({ codigo: 'NAO_AUTENTICADO' })
    const [cabecalho, , assinatura] = token.split('.')
    const payloadAdmin = btoa(JSON.stringify({ sub: 'c1', nome: 'Ana', perfil: 'ADMIN_SHOPPING', lojaId: null }))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    await expect(lerToken(`${cabecalho}.${payloadAdmin}.${assinatura}`, SEGREDO)).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })
  })

  it('não emite token sem um JWT_SECRET de verdade', async () => {
    await expect(emitirToken(ANA, undefined)).rejects.toThrow(/JWT_SECRET/)
    await expect(emitirToken(ANA, 'curto')).rejects.toThrow(/JWT_SECRET/)
  })
})
