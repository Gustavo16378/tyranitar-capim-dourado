import { describe, expect, it } from 'vitest'
import { acoesNaConversa } from '../../src/app/acoesDoChat'
import { desdeAUltimaVista } from '../../src/app/carteiraVista'
import { partesDoLink } from '../../src/app/formatos'
import type { ReservaCriada } from '../../src/tipos'

const reserva = (formaPagamento: 'PIX' | 'NA_LOJA'): ReservaCriada => ({
  id: 'r9',
  produtoId: 'p1',
  lojaId: 'l1',
  quantidade: 1,
  precoCentavos: 39990,
  status: 'PENDENTE',
  formaPagamento,
  pago: false,
  expiraEm: '2026-11-13T18:00:00Z',
})

describe('ações da resposta da Capi', () => {
  it('reservar não vira botão na conversa (o "Reservar" fica no cartão); a rota leva ao mapa', () => {
    expect(
      acoesNaConversa([
        { tipo: 'RESERVAR', produtoId: 'p1' },
        { tipo: 'ROTA', lojaId: 'l1', mapaId: 'loja-esportes', piso: 1 },
      ]),
    ).toEqual({
      botoes: [
        {
          chave: 'rota-loja-esportes',
          rotulo: 'Ver no mapa',
          destino: '/mapa?loja=loja-esportes',
          icone: 'mapa',
          principal: false,
        },
      ],
      abrirSozinho: undefined,
    })
  })

  it('reserva criada com Pix (conversa antiga) abre o pagamento sozinha', () => {
    const { botoes, abrirSozinho } = acoesNaConversa([
      { tipo: 'RESERVAR', produtoId: 'p1' },
      { tipo: 'RESERVA_CRIADA', reserva: reserva('PIX') },
    ])
    expect(abrirSozinho).toBe('/reserva/r9')
    expect(botoes).toEqual([{ chave: 'reserva-r9', rotulo: 'Pagar com Pix', destino: '/reserva/r9', principal: true }])
  })

  it('reserva criada para pagar na loja fica num botão, sem abrir sozinha', () => {
    const { botoes, abrirSozinho } = acoesNaConversa([{ tipo: 'RESERVA_CRIADA', reserva: reserva('NA_LOJA') }])
    expect(abrirSozinho).toBeUndefined()
    expect(botoes[0]).toMatchObject({ rotulo: 'Ver reserva', principal: true })
  })
})

describe('link na conversa', () => {
  it('prévia do link: site sem www e o caminho do produto', () => {
    expect(partesDoLink('https://www.loja.com.br/tenis-de-corrida-pulse/p?cor=preto')).toEqual({
      site: 'loja.com.br',
      caminho: '/tenis-de-corrida-pulse/p',
    })
    expect(partesDoLink('https://loja.com/')).toEqual({ site: 'loja.com', caminho: 'Página da loja' })
  })
})

describe('carteira: o que mudou desde a última visita', () => {
  it('primeira visita: os pontos contam do zero, sem "subiu de nível"', () => {
    expect(desdeAUltimaVista(null, { pontos: 2140, nivel: 'CAPIM' })).toEqual({ de: 0, somou: true, subiu: false })
  })

  it('pontos novos contam desde a última visita', () => {
    expect(desdeAUltimaVista({ pontos: 2140, nivel: 'CAPIM' }, { pontos: 2533, nivel: 'CAPIM' })).toEqual({
      de: 2140,
      somou: true,
      subiu: false,
    })
    expect(desdeAUltimaVista({ pontos: 2140, nivel: 'CAPIM' }, { pontos: 2140, nivel: 'CAPIM' }).somou).toBe(false)
  })

  it('subiu de nível só quando o nível novo é mais alto', () => {
    expect(desdeAUltimaVista({ pontos: 4900, nivel: 'CAPIM' }, { pontos: 5100, nivel: 'DOURADO' }).subiu).toBe(true)
    expect(desdeAUltimaVista({ pontos: 5100, nivel: 'DOURADO' }, { pontos: 4900, nivel: 'CAPIM' }).subiu).toBe(false)
  })
})
