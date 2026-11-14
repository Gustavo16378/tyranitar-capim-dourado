// O carrinho do caixa no Atendimento (src/loja/telas/atendimento/carrinho.ts, TU45): os itens e o
// pedido, e quais cupons o caixa oferece. A regra dos cupons é conferida contra a da API
// (functions/_lib/regras/cupons.ts): o caixa só oferece o cupom que a API aceitaria.
import { describe, expect, it } from 'vitest'
import { aplicarCuponsNosItens, type Cupom, type ItemDaCompra } from '../../functions/_lib/regras/cupons'
import {
  completarOrigens,
  comOutros,
  comProduto,
  comQuantidade,
  comReserva,
  cuponsEscolhidos,
  cuponsQueValem,
  faltaOrigem,
  itemAceitaCupom,
  montarPedido,
  nomesDosCupons,
  paraCupom,
  previaDosItens,
  semItem,
  type ItemNoCarrinho,
  type ProdutoNoCarrinho,
} from '../../src/loja/telas/atendimento/carrinho'
import type { CupomDoCliente, ItemDaCompra as ItemDaPrevia, ReservaDoCliente } from '../../src/tipos/loja'

const TENIS: ProdutoNoCarrinho = { id: 'p-pulse', nome: 'Tênis de corrida Pulse', categoria: 'calcados', precoCentavos: 39990, fotos: [] }
const CAMISETA: ProdutoNoCarrinho = { id: 'p-camiseta', nome: 'Camiseta dry-fit', categoria: 'roupas', precoCentavos: 7990, fotos: [] }

function reserva(id: string, extra: Partial<ReservaDoCliente> = {}): ReservaDoCliente {
  return {
    id,
    produto: 'Tênis Run 2 preto',
    foto: null,
    categoria: 'calcados',
    quantidade: 1,
    tamanho: '41',
    cor: 'preto',
    brutoCentavos: 34990,
    descontoCentavos: 0,
    precoCentavos: 34990,
    cupom: null,
    status: 'CONFIRMADA',
    pago: false,
    podeRetirar: true,
    ...extra,
  }
}

const cupom = (id: string, origem: 'LOJA' | 'SHOPPING', categoria: string | null = null): CupomDoCliente => ({
  id,
  titulo: id,
  origem,
  tipo: 'VALOR',
  categoria,
  paraQueVale: categoria === 'calcados' ? 'Calçados' : categoria === 'roupas' ? 'Roupas' : null,
})

const CALCADOS = cupom('10% em calçados', 'LOJA', 'calcados')
const ROUPAS = cupom('R$ 15 em camisetas', 'LOJA', 'roupas')
const LOJA_TODA = cupom('R$ 10 na loja', 'LOJA')
const VOUCHER = cupom('R$ 20 em qualquer loja', 'SHOPPING')
const CUPONS = [CALCADOS, ROUPAS, LOJA_TODA, VOUCHER]

describe('TU45: o carrinho do caixa', () => {
  it('retirar, adicionar do catálogo, mudar a quantidade, "Outros" e tirar', () => {
    let carrinho: ItemNoCarrinho[] = []
    carrinho = comReserva(carrinho, reserva('r1'))
    // A mesma reserva não entra duas vezes; a pendente não entra.
    carrinho = comReserva(carrinho, reserva('r1'))
    carrinho = comReserva(carrinho, reserva('r2', { status: 'PENDENTE', podeRetirar: false }))
    carrinho = comProduto(carrinho, CAMISETA)
    carrinho = comProduto(carrinho, CAMISETA)
    carrinho = comOutros(carrinho, 1000)
    carrinho = comOutros(carrinho, 500)
    expect(montarPedido('q-ana', carrinho, [])).toEqual({
      qrToken: 'q-ana',
      itens: [
        { reservaId: 'r1' },
        { produtoId: 'p-camiseta', quantidade: 2 },
        { valorCentavos: 1000, descricao: 'Outros' },
        { valorCentavos: 500, descricao: 'Outros' },
      ],
      cupons: [],
    })
    carrinho = comQuantidade(carrinho, 'p-camiseta', 0)
    expect(carrinho[1]).toMatchObject({ quantidade: 1 })
    expect(comQuantidade(carrinho, 'p-camiseta', 500)[1]).toMatchObject({ quantidade: 99 })
    carrinho = semItem(carrinho, 'outros:1')
    carrinho = semItem(carrinho, 'reserva:r1')
    expect(montarPedido('q-ana', carrinho, ['x'])?.itens).toEqual([
      { produtoId: 'p-camiseta', quantidade: 1 },
      { valorCentavos: 500, descricao: 'Outros' },
    ])
    expect(montarPedido('q-ana', [], [])).toBeNull()
  })

  it('o cupom de categoria só aparece com um item dela; "Outros" não tem categoria', () => {
    const itens = (carrinho: ItemNoCarrinho[]) => carrinho.map((i) => paraCupom(i))
    const soCamiseta = comProduto([], CAMISETA)
    expect(cuponsQueValem(CUPONS, itens(soCamiseta))).toEqual([ROUPAS, LOJA_TODA, VOUCHER])
    const comTenis = comProduto(soCamiseta, TENIS)
    expect(cuponsQueValem(CUPONS, itens(comTenis))).toEqual(CUPONS)
    const soOutros = comOutros([], 5000)
    expect(cuponsQueValem(CUPONS, itens(soOutros))).toEqual([LOJA_TODA, VOUCHER])
    expect(cuponsQueValem(CUPONS, [])).toEqual([])
  })

  it('o que já foi pago com Pix ou tem o cupom da reserva não conta, e o cupom da reserva ocupa o lado dele', () => {
    const paga = paraCupom({ tipo: 'reserva', reserva: reserva('r1', { pago: true }) })
    expect(cuponsQueValem(CUPONS, [paga])).toEqual([])
    const comCupom = paraCupom({ tipo: 'reserva', reserva: reserva('r2', { cupom: { id: 'cp-r', titulo: 'R$ 30', origem: 'LOJA' } }) })
    const camiseta = paraCupom({ tipo: 'produto', produto: CAMISETA, quantidade: 1 })
    // A reserva já usa o cupom da loja: na camiseta, só o voucher.
    expect(cuponsQueValem(CUPONS, [comCupom, camiseta])).toEqual([VOUCHER])
    // Sem a origem na resposta, ela sai dos cupons do cliente, se o mesmo estiver lá.
    const semOrigem = { tipo: 'reserva', reserva: reserva('r3', { cupom: { id: VOUCHER.id, titulo: VOUCHER.titulo } }) } as const
    expect(paraCupom(semOrigem, CUPONS).cupomDaReserva).toEqual({ id: VOUCHER.id, origem: 'SHOPPING' })
    expect(paraCupom(semOrigem).cupomDaReserva).toEqual({ id: VOUCHER.id })
  })

  it('a origem do cupom da reserva sai da lista de reservas da loja quando o atendimento não manda', () => {
    const semOrigem = reserva('r1', { cupom: { id: 'cp-a-10', titulo: '10% em calçados' } })
    const comOrigem = reserva('r2', { cupom: { id: 'cp-s', titulo: 'R$ 20', origem: 'SHOPPING' } })
    expect(faltaOrigem([semOrigem, comOrigem])).toBe(true)
    expect(faltaOrigem([comOrigem, reserva('r3')])).toBe(false)
    const daLoja = [{ id: 'r1', cupom: { id: 'cp-a-10', titulo: '10% em calçados', origem: 'LOJA' as const } }]
    const completas = completarOrigens([semOrigem, comOrigem], daLoja)
    expect(completas.map((r) => r.cupom?.origem)).toEqual(['LOJA', 'SHOPPING'])
    expect(completarOrigens([semOrigem], null)[0].cupom).toEqual({ id: 'cp-a-10', titulo: '10% em calçados' })
    // Com a origem, a reserva ocupa o lado da loja: o caixa só oferece o voucher na camiseta.
    const itens = [{ tipo: 'reserva', reserva: completas[0] } as const, { tipo: 'produto', produto: CAMISETA, quantidade: 1 } as const]
    expect(cuponsQueValem(CUPONS, itens.map((i) => paraCupom(i)))).toEqual([VOUCHER])
  })

  it('o cupom escolhido sai do pedido quando o item dele sai', () => {
    const escolha = { LOJA: CALCADOS.id, SHOPPING: VOUCHER.id }
    expect(cuponsEscolhidos(escolha, CUPONS)).toEqual([CALCADOS.id, VOUCHER.id])
    expect(cuponsEscolhidos(escolha, [ROUPAS, VOUCHER])).toEqual([VOUCHER.id])
    expect(cuponsEscolhidos({ LOJA: null, SHOPPING: null }, CUPONS)).toEqual([])
  })

  it('oferece um cupom exatamente quando a API o aceitaria', () => {
    const LOJA = 'loja-a'
    const regra = (c: CupomDoCliente): Cupom => ({
      id: c.id,
      titulo: c.titulo,
      lojaId: c.origem === 'LOJA' ? LOJA : null,
      tipo: 'VALOR',
      valor: 1000,
      nivelMinimo: 'SEMENTE',
      limitePorCliente: 1,
      validade: '2099-12-31',
      ativo: true,
      categoria: c.categoria,
    })
    const CUPOM_DA_RESERVA = cupom('cp-da-reserva', 'LOJA', 'calcados')
    const todos: ItemNoCarrinho[] = [
      { tipo: 'produto', produto: TENIS, quantidade: 1 },
      { tipo: 'produto', produto: CAMISETA, quantidade: 2 },
      { tipo: 'outros', numero: 1, valorCentavos: 2500 },
      { tipo: 'reserva', reserva: reserva('r-pix', { pago: true }) },
      { tipo: 'reserva', reserva: reserva('r-cupom', { cupom: { id: CUPOM_DA_RESERVA.id, titulo: 'cp', origem: 'LOJA' }, descontoCentavos: 1000, precoCentavos: 33990 }) },
    ]
    const naApi = (item: ItemNoCarrinho, n: number): ItemDaCompra => {
      if (item.tipo === 'produto') return { chave: `p${n}`, categoria: item.produto.categoria, quantidade: item.quantidade, precoCentavos: item.produto.precoCentavos }
      if (item.tipo === 'outros') return { chave: `o${n}`, categoria: null, quantidade: 1, precoCentavos: item.valorCentavos }
      const r = item.reserva
      return {
        chave: `r${n}`,
        categoria: r.categoria,
        quantidade: 1,
        precoCentavos: r.brutoCentavos,
        jaPago: r.pago,
        ...(r.cupom ? { descontoDaReserva: { cupomId: r.cupom.id, centavos: r.descontoCentavos } } : {}),
      }
    }
    // Toda combinação de itens (menos a vazia) e todo cupom do caixa.
    for (let mascara = 1; mascara < 1 << todos.length; mascara++) {
      const carrinho = todos.filter((_, i) => mascara & (1 << i))
      const oferecidos = cuponsQueValem(CUPONS, carrinho.map((i) => paraCupom(i)))
      const daReserva = carrinho.some((i) => i.tipo === 'reserva' && i.reserva.cupom) ? [regra(CUPOM_DA_RESERVA)] : []
      for (const c of CUPONS) {
        let aceito = true
        try {
          aplicarCuponsNosItens(carrinho.map(naApi), [regra(c), ...daReserva], {
            lojaId: LOJA,
            nivelCliente: 'SEMENTE',
            usosDoCliente: {},
            agora: new Date('2026-11-13T15:00:00Z'),
          })
        } catch {
          aceito = false
        }
        expect(oferecidos.includes(c), `${c.id} com ${carrinho.map((i) => i.tipo).join(', ')}`).toBe(aceito)
      }
    }
  })

  it('cada item acha a linha dele na prévia, mesmo com a prévia de um carrinho anterior', () => {
    const carrinho: ItemNoCarrinho[] = [
      { tipo: 'reserva', reserva: reserva('r1') },
      { tipo: 'produto', produto: TENIS, quantidade: 1 },
      { tipo: 'outros', numero: 1, valorCentavos: 1000 },
    ]
    const linha = (extra: Partial<ItemDaPrevia>): ItemDaPrevia => ({
      descricao: 'x',
      detalhe: null,
      categoria: null,
      produtoId: null,
      reservaId: null,
      quantidade: 1,
      precoCentavos: 1,
      brutoCentavos: 1,
      descontos: [],
      pagoCentavos: 1,
      jaPago: false,
      ...extra,
    })
    // A prévia veio noutra ordem e com um item que já saiu: cada um acha o seu pela identidade.
    const previa = {
      itens: [
        linha({ descricao: 'Outros', pagoCentavos: 900 }),
        linha({ descricao: 'Camiseta', produtoId: 'p-camiseta' }),
        linha({ descricao: 'Tênis', produtoId: 'p-pulse' }),
        linha({ descricao: 'Run', produtoId: 'p-run', reservaId: 'r1' }),
      ],
    }
    expect(previaDosItens(carrinho, previa).map((i) => i?.descricao)).toEqual(['Run', 'Tênis', 'Outros'])
    expect(previaDosItens(carrinho, null)).toEqual([undefined, undefined, undefined])
  })

  it('os nomes dos cupons: os do cliente e os presos às reservas', () => {
    const nomes = nomesDosCupons([VOUCHER], [reserva('r1', { cupom: { id: 'cp-r', titulo: 'R$ 30 no tênis' } })])
    expect(nomes.get('cp-r')).toBe('R$ 30 no tênis')
    expect(nomes.get(VOUCHER.id)).toBe(VOUCHER.titulo)
  })

  it('a regra de cada item, sozinha', () => {
    const tenis = { categoria: 'calcados', jaPago: false, cupomDaReserva: null }
    expect(itemAceitaCupom(tenis, CALCADOS)).toBe(true)
    expect(itemAceitaCupom(tenis, ROUPAS)).toBe(false)
    expect(itemAceitaCupom({ ...tenis, categoria: null }, LOJA_TODA)).toBe(true)
    expect(itemAceitaCupom({ ...tenis, jaPago: true }, VOUCHER)).toBe(false)
  })
})
