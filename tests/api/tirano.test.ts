// Easter eggs da API, tema "O tirano da sexta-feira 13": o cabeçalho X-Tyranitar que o
// _middleware põe em toda resposta (inclusive as de erro) e GET /api/loja-13, os créditos.
import { describe, expect, it, vi } from 'vitest'
import { onRequest as semRota } from '../../functions/api/[[rota]]'
import { onRequestGet as loja13 } from '../../functions/api/loja-13'
import { onRequestGet as conta } from '../../functions/api/me/index'
import { onRequestGet as saude } from '../../functions/api/saude'
import type { Rota } from '../../functions/_lib/contexto'
import { ADMIN, ANA, chamar, LOJISTA_A } from '../workers/rotas'

const TIRANO = 'ontem foi sexta-feira 13'

describe('X-Tyranitar em toda resposta da API', () => {
  it('nas respostas certas, sem mudar o status, o corpo nem os outros cabeçalhos', async () => {
    const r = await chamar(saude, { url: '/api/saude' })
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({ ok: true })
    expect(r.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)
    expect(r.cabecalhos.get('content-type')).toContain('application/json')

    const logada = await chamar(conta, { url: '/api/me', usuario: ANA })
    expect(logada.status).toBe(200)
    expect(logada.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)
  })

  it('nos erros da API: 401, 403 e a rota que não existe (404)', async () => {
    const semLogin = await chamar(conta, { url: '/api/me' })
    expect(semLogin.status).toBe(401)
    expect(semLogin.corpo).toMatchObject({ status: 401, erro: 'NAO_AUTENTICADO' })
    expect(semLogin.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)

    const outroPerfil = await chamar(conta, { url: '/api/me', usuario: LOJISTA_A })
    expect(outroPerfil.status).toBe(403)
    expect(outroPerfil.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)

    const inexistente = await chamar(semRota, { url: '/api/nao-existe' })
    expect(inexistente.status).toBe(404)
    expect(inexistente.corpo).toMatchObject({ erro: 'NAO_ENCONTRADO' })
    expect(inexistente.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)
  })

  it('no erro inesperado (500), já no formato da API', async () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {})
    const quebrada: Rota = () => {
      throw new Error('falha de teste')
    }
    const r = await chamar(quebrada, { url: '/api/quebrada' })
    silencio.mockRestore()
    expect(r.status).toBe(500)
    expect(r.corpo).toMatchObject({ status: 500, erro: 'ERRO_INTERNO' })
    expect(r.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)
  })

  it('sem corpo (204) e numa resposta de cabeçalhos imutáveis (redirect)', async () => {
    const vazia = await chamar(() => new Response(null, { status: 204 }), { url: '/api/vazia' })
    expect(vazia.status).toBe(204)
    expect(vazia.texto).toBe('')
    expect(vazia.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)

    const redirecionada = await chamar(() => Response.redirect('https://teste.local/', 302), { url: '/api/ir' })
    expect(redirecionada.status).toBe(302)
    expect(redirecionada.cabecalhos.get('Location')).toBe('https://teste.local/')
    expect(redirecionada.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)
  })
})

describe('GET /api/loja-13', () => {
  it('os créditos em JSON: a equipe, cada integrante com o papel e os orientadores', async () => {
    const r = await chamar(loja13, { url: '/api/loja-13' })
    expect(r.status).toBe(200)
    expect(r.cabecalhos.get('X-Tyranitar')).toBe(TIRANO)
    expect(r.corpo).toMatchObject({
      equipe: 'Tyranitar',
      tema: 'O tirano da sexta-feira 13',
      evento: 'HackaRun 2026',
      orientadores: ['Haroldo Soares', 'Paulo Rafael'],
    })
    expect(r.corpo.integrantes.map((pessoa: { nome: string }) => pessoa.nome)).toEqual([
      'Gustavo Barbosa Lima',
      'Gustavo Ferreira',
      'Kauã',
      'Diogo',
    ])
    for (const pessoa of r.corpo.integrantes) expect(pessoa.papel).toEqual(expect.any(String))
  })

  it('é pública para qualquer um: sem login e com qualquer perfil (não é a área /api/loja/ do lojista)', async () => {
    for (const usuario of [undefined, ANA, LOJISTA_A, ADMIN]) {
      const r = await chamar(loja13, { url: '/api/loja-13', usuario })
      expect(r.status).toBe(200)
      expect(r.corpo.equipe).toBe('Tyranitar')
    }
  })
})
