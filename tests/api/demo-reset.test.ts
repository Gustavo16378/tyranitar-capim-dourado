// O demo:reset (scripts/demo-reset.mjs) roda o SQL de scripts/lib/demo-reset.mjs: aqui o mesmo
// SQL roda no D1 de teste depois de um ensaio de verdade no balcão (TA41). A Ana do tests/seed.sql
// tem 2.140 pontos em duas compras do "seed" (co-ana-1 e co-ana-2), como a do seed da demo.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestPost as compras } from '../../functions/api/loja/compras/index'
import { onRequestGet as extrato } from '../../functions/api/loja/extrato'
import { onRequestGet as carteira } from '../../functions/api/me/carteira'
import { onRequestPost as reservar } from '../../functions/api/reservas/index'
import { resumoDoReset, sqlDaLimpeza, sqlDoResumo, sqlDoSaldo } from '../../scripts/lib/demo-reset.mjs'
import { ANA, BRUNO, chamar, LOJISTA_A } from '../workers/rotas'

const CONTA = {
  email: 'ana@teste.test',
  comprasDoSeed: ['co-ana-1', 'co-ana-2'],
  cuponsDoSeed: ['cp-a-10', 'cp-a-15', 'cp-shopping-20'],
}

const um = async <T>(sql: string) => (await env.DB.prepare(sql).first<T>())!
const carteiraDe = async (usuario = ANA) => (await chamar(carteira, { url: '/api/me/carteira', usuario })).corpo
const titulos = (c: { cupons: { titulo: string }[] }) => c.cupons.map((k) => k.titulo).sort()
/** Uma compra no balcão da Loja A: um produto do catálogo (com os cupons) e um valor avulso. */
const compraNoBalcao = (qrToken: string, produtoId: string, cupons: string[]) =>
  chamar(compras, {
    metodo: 'POST',
    url: '/api/loja/compras',
    corpo: { qrToken, itens: [{ produtoId, quantidade: 1 }], cupons },
    usuario: LOJISTA_A,
  })

/** O que o seed põe de volta depois da limpeza: a ficha da Ana (a carteira mostra os cupons de categoria dela). */
const FICHA_DO_SEED =
  "INSERT INTO ficha (cliente_id, interesses) VALUES ('c-ana', '[{\"categoria\":\"calcados\",\"detalhe\":\"Tênis de corrida\"},{\"categoria\":\"roupas\",\"detalhe\":\"Camisetas dry-fit\"}]')"

/** Roda o SQL de cada passo do demo:reset numa transação, como o wrangler d1 execute. */
async function rodar(comandos: string[]) {
  const resultados = await env.DB.batch(comandos.map((sql) => env.DB.prepare(sql)))
  return resultados.map((r) => r.results as Record<string, unknown>[])
}

describe('demo:reset (TA41)', () => {
  it('desfaz a compra de ensaio com cupom: 2.140 pontos, os cupons de volta e o extrato só com o seed', async () => {
    const antes = await carteiraDe()
    expect(antes.pontos).toBe(2140)

    // O ensaio: a Ana compra no balcão com o cupom da loja e o voucher do shopping, reserva um
    // produto e conversa com a Capi. Outro cliente compra na mesma loja com o voucher.
    expect((await compraNoBalcao('q-ana', 'p-pulse', ['cp-a-10', 'cp-shopping-20'])).status).toBe(201)
    expect((await compraNoBalcao('q-bruno', 'p-camiseta', ['cp-shopping-20'])).status).toBe(201)
    expect(
      (await chamar(reservar, { metodo: 'POST', url: '/api/reservas', corpo: { produtoId: 'p-run', formaPagamento: 'NA_LOJA' }, usuario: ANA }))
        .status,
    ).toBe(201)
    await rodar([
      "INSERT INTO mensagem (id, cliente_id, papel, conteudo) VALUES ('m-ensaio', 'c-ana', 'CLIENTE', 'tem tênis 42?')",
      "INSERT INTO busca (id, cliente_id, termo, categoria, encontrou) VALUES ('b-ensaio', 'c-ana', 'tênis', 'calcados', 1)",
    ])
    const depois = await carteiraDe()
    // R$ 399,90 - 10% (R$ 39,99) - R$ 20 = R$ 339,91: 339 pontos.
    expect(depois.pontos).toBe(2140 + 339)
    expect(titulos(depois)).not.toContain('10% em calçados')
    expect(titulos(depois)).not.toContain('R$ 20 em qualquer loja')

    // O reset: a limpeza (com a contagem antes) e, depois do seed, o saldo.
    const limpeza = sqlDaLimpeza(CONTA)
    const [[contagem]] = await rodar([limpeza.contagem, ...limpeza.comandos])
    expect(contagem).toEqual({
      compras: 1,
      pontos: 339,
      usos_de_cupom: 2,
      reembolsos: 1,
      reservas: 1,
      // A reserva enviada e os pontos da compra.
      avisos: 2,
      mensagens: 1,
      buscas: 1,
    })
    await rodar([FICHA_DO_SEED, sqlDoSaldo(CONTA.email)])

    // A carteira da Ana volta ao seed: os pontos, o nível e os mesmos cupons de antes do ensaio.
    const final = await carteiraDe()
    expect(final.pontos).toBe(2140)
    expect(final.nivel).toBe(antes.nivel)
    expect(titulos(final)).toEqual(titulos(antes))
    expect(final.reservasAtivas).toEqual([])

    // O extrato da Loja A (90 dias) fica com a compra do seed e a do outro cliente, e o
    // reembolso dele continua a receber.
    const r = await chamar(extrato, { url: '/api/loja/extrato?periodo=90d', usuario: LOJISTA_A })
    const lancamentos = r.corpo.lancamentos.itens.map((l: { id: string; cliente: string }) => [l.id === 'co-ana-1' ? 'seed' : l.cliente])
    expect(lancamentos.flat().sort()).toEqual(['Bruno', 'seed'])
    expect(r.corpo.reembolsos.pendenteCentavos).toBe(2000)

    // A conta do outro cliente não muda: a compra, o cupom usado e os pontos dele.
    expect(await um("SELECT pontos FROM usuario WHERE id = 'c-bruno'")).toEqual({ pontos: 59 })
    expect(titulos(await carteiraDe(BRUNO))).not.toContain('R$ 20 em qualquer loja')

    // O resumo que o demo:reset mostra é o que a carteira e o extrato mostram.
    const resumo = resumoDoReset(await rodar(sqlDoResumo({ ...CONTA, emailDoLojista: 'lojista.a@teste.test' })))
    expect(resumo).toEqual({
      pontos: 2140,
      compras: 2,
      nivel: final.nivel,
      cupons: expect.arrayContaining(titulos(final)),
      extrato: { loja: 'Loja A', compras: 1, doSeed: 0, deOutrosClientes: 1, reembolsos: 1 },
    })
    expect(resumo.cupons).toHaveLength(final.cupons.length)
  })

  it('volta a ligar um cupom do seed desligado no painel durante os ensaios', async () => {
    await rodar(["UPDATE cupom SET ativo = 0 WHERE id = 'cp-a-15'"])
    expect(titulos(await carteiraDe())).not.toContain('R$ 15 em camisetas')
    const limpeza = sqlDaLimpeza(CONTA)
    await rodar([...limpeza.comandos, FICHA_DO_SEED, sqlDoSaldo(CONTA.email)])
    expect(titulos(await carteiraDe())).toContain('R$ 15 em camisetas')
  })
})
