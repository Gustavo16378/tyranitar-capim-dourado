// O login único (/entrar): para onde cada perfil segue depois de entrar (src/app/destinoDoLogin.ts).
import { describe, expect, it } from 'vitest'
import { destinoDoLogin, lerPedidoDeLogin } from '../../src/app/destinoDoLogin'

describe('login único: o destino pelo perfil do token', () => {
  it('sem tela de origem: cliente no Início, lojista em /loja, administração em /shopping', () => {
    expect(destinoDoLogin('CLIENTE', {})).toBe('/inicio')
    expect(destinoDoLogin('LOJISTA', {})).toBe('/loja')
    expect(destinoDoLogin('ADMIN_SHOPPING', {})).toBe('/shopping')
  })

  it('volta para a tela que pediu o login, se ela for da área do perfil', () => {
    expect(destinoDoLogin('CLIENTE', { de: '/carteira' })).toBe('/carteira')
    expect(destinoDoLogin('LOJISTA', { de: '/loja/reservas', perfil: 'LOJISTA' })).toBe('/loja/reservas')
    expect(destinoDoLogin('ADMIN_SHOPPING', { de: '/shopping/vagas?periodo=90d' })).toBe('/shopping/vagas?periodo=90d')
  })

  it('quem entra com outro perfil vai para a área do perfil dele, não para a tela de origem', () => {
    expect(destinoDoLogin('CLIENTE', { de: '/loja/reservas', perfil: 'LOJISTA' })).toBe('/inicio')
    expect(destinoDoLogin('LOJISTA', { de: '/carteira' })).toBe('/loja')
    expect(destinoDoLogin('ADMIN_SHOPPING', { de: '/loja' })).toBe('/shopping')
    expect(destinoDoLogin('LOJISTA', { de: '/lojas-do-mapa' })).toBe('/loja')
  })

  it('lê o pedido que a guarda manda, sem aceitar endereço de fora nem perfil inventado', () => {
    expect(lerPedidoDeLogin({ de: '/loja/cupons', perfil: 'LOJISTA' })).toEqual({ de: '/loja/cupons', perfil: 'LOJISTA' })
    expect(lerPedidoDeLogin({ de: 'https://outro.site', perfil: 'ROOT' })).toEqual({ de: undefined, perfil: undefined })
    expect(lerPedidoDeLogin({ de: '/entrar' })).toEqual({ de: undefined, perfil: undefined })
    expect(lerPedidoDeLogin(null)).toEqual({})
  })
})
