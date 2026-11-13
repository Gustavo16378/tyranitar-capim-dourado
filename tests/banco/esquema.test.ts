// Banco (docs/testes.md › TB): as migrations criam o esquema e as restrições do próprio banco
// (CHECK, UNIQUE e chaves estrangeiras) barram dados errados, mesmo que uma rota se engane.
// Cada recusa vem ao lado do caso válido parecido, para mostrar que é aquela regra que barra.
// Antes de cada teste, o banco volta ao tests/seed.sql (tests/workers/preparar-banco.ts).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

const executar = (sql: string, ...valores: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...valores)
    .run()

const CHECK = /CHECK constraint failed/
const UNICO = /UNIQUE constraint failed/
const CHAVE_ESTRANGEIRA = /FOREIGN KEY constraint failed/

async function recusa(regra: RegExp, sql: string, ...valores: unknown[]) {
  await expect(executar(sql, ...valores)).rejects.toThrow(regra)
}

async function aceita(sql: string, ...valores: unknown[]) {
  await expect(executar(sql, ...valores)).resolves.toMatchObject({ success: true })
}

const NOVO_USUARIO = `INSERT INTO usuario (id, nome, email, senha_hash, perfil, loja_id, qr_token)
  VALUES (?1, 'Teste', ?2, 'pbkdf2_sha256$1$AAAA$AAAA', ?3, ?4, ?5)`

const NOVA_RESERVA = `INSERT INTO reserva
  (id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status, forma_pagamento, pago, expira_em)
  VALUES (?1, 'c-ana', 'p-run', 'loja-a', 1, 34990, ?2, ?3, ?4, '2099-01-01T00:00:00Z')`

const NOVA_COMPRA = `INSERT INTO compra (id, cliente_id, loja_id, valor_centavos, origem, chave_nfce, reserva_id)
  VALUES (?1, 'c-ana', 'loja-a', 10000, ?2, ?3, ?4)`

const NOVO_CUPOM = `INSERT INTO cupom (id, loja_id, titulo, tipo, valor, validade)
  VALUES (?1, 'loja-a', 'Cupom de teste', ?2, ?3, '2099-12-31')`

const NOVO_REEMBOLSO = `INSERT INTO reembolso (id, loja_id, compra_id, cupom_id, valor_centavos, status, pago_em)
  VALUES (?1, 'loja-a', ?2, ?3, 2000, ?4, ?5)`

/** Chave de acesso de NFC-e com 44 dígitos. */
const chave = (fim: string) => fim.padStart(44, '1')

describe('TB01: migrations num banco vazio', () => {
  it('criam as 15 tabelas, na ordem das migrations, e a configuração inicial', async () => {
    const { results: tabelas } = await env.DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations'
       ORDER BY name`,
    ).all<{ name: string }>()
    expect(tabelas.map((t) => t.name)).toEqual([
      'avaliacao',
      'busca',
      'compra',
      'configuracao',
      'cupom',
      'favorito',
      'ficha',
      'loja',
      'mensagem',
      'notificacao',
      'produto',
      'reembolso',
      'reserva',
      'uso_cupom',
      'usuario',
    ])

    const { results: aplicadas } = await env.DB.prepare('SELECT name FROM d1_migrations ORDER BY id').all<{
      name: string
    }>()
    expect(aplicadas.map((m) => m.name)).toEqual(env.MIGRATIONS.map((m) => m.name))

    const { results: configuracao } = await env.DB.prepare('SELECT chave, valor FROM configuracao ORDER BY chave').all<{
      chave: string
      valor: string
    }>()
    expect(Object.fromEntries(configuracao.map((c) => [c.chave, JSON.parse(c.valor)]))).toEqual({
      niveis: { SEMENTE: 0, BROTO: 500, CAPIM: 2000, DOURADO: 5000 },
      pontos_por_real: 1,
      prazo_reserva_horas: { NA_LOJA: 4, PIX: 48 },
    })
  })
})

describe('TB02: perfil e loja do usuário', () => {
  it('lojista sem loja e cliente com loja são recusados', async () => {
    await recusa(CHECK, NOVO_USUARIO, 'u-1', 'lojista.sem@teste.test', 'LOJISTA', null, null)
    await recusa(CHECK, NOVO_USUARIO, 'u-2', 'cliente.com@teste.test', 'CLIENTE', 'loja-a', 'q-novo')
    await aceita(NOVO_USUARIO, 'u-3', 'lojista.com@teste.test', 'LOJISTA', 'loja-a', null)
    await aceita(NOVO_USUARIO, 'u-4', 'cliente.sem@teste.test', 'CLIENTE', null, 'q-novo')
  })

  it('só cliente tem QR', async () => {
    await recusa(CHECK, NOVO_USUARIO, 'u-1', 'admin.qr@teste.test', 'ADMIN_SHOPPING', null, 'q-admin')
  })
})

describe('TB03: e-mail único', () => {
  it('o mesmo e-mail com maiúsculas diferentes é recusado', async () => {
    await recusa(UNICO, NOVO_USUARIO, 'u-1', 'ANA@Teste.TEST', 'CLIENTE', null, 'q-outro')
    await aceita(NOVO_USUARIO, 'u-2', 'ana.outra@teste.test', 'CLIENTE', null, 'q-outro')
  })
})

describe('TB04: estoque e preço', () => {
  it('estoque negativo e preço zero são recusados', async () => {
    await recusa(CHECK, "UPDATE produto SET estoque = -1 WHERE id = 'p-run'")
    await recusa(CHECK, "UPDATE produto SET preco_centavos = 0 WHERE id = 'p-run'")
    await aceita("UPDATE produto SET estoque = 0, preco_centavos = 1 WHERE id = 'p-run'")
  })
})

describe('TB05: valores fora da lista', () => {
  it('status, forma de pagamento e tipo de cupom desconhecidos são recusados', async () => {
    await recusa(CHECK, NOVA_RESERVA, 'r-1', 'PERDIDA', 'PIX', 0)
    await recusa(CHECK, NOVA_RESERVA, 'r-2', 'PENDENTE', 'BOLETO', 0)
    await recusa(CHECK, NOVO_CUPOM, 'cp-1', 'CASHBACK', 10)
    await aceita(NOVA_RESERVA, 'r-3', 'SEPARADA', 'NA_LOJA', 0)
    await aceita(NOVO_CUPOM, 'cp-2', 'BRINDE', 0)
  })
})

describe('TB06: reserva paga só com Pix', () => {
  it('reserva para pagar na loja marcada como paga é recusada', async () => {
    await recusa(CHECK, NOVA_RESERVA, 'r-1', 'PENDENTE', 'NA_LOJA', 1)
    await aceita(NOVA_RESERVA, 'r-2', 'PENDENTE', 'PIX', 1)
  })
})

describe('TB16: estorno só em reserva paga', () => {
  it('estorno pedido numa reserva que não foi paga é recusado', async () => {
    await aceita(NOVA_RESERVA, 'r-1', 'CANCELADA', 'NA_LOJA', 0)
    await aceita(NOVA_RESERVA, 'r-2', 'CANCELADA', 'PIX', 1)
    await recusa(CHECK, "UPDATE reserva SET estorno_solicitado = 1 WHERE id = 'r-1'")
    await aceita("UPDATE reserva SET estorno_solicitado = 1 WHERE id = 'r-2'")
    await recusa(CHECK, "UPDATE reserva SET estorno_solicitado = 2 WHERE id = 'r-2'")
  })
})

describe('TB07: nota fiscal', () => {
  it('a mesma chave de acesso duas vezes é recusada', async () => {
    await aceita(NOVA_COMPRA, 'co-1', 'NOTA', chave('7'), null)
    await recusa(UNICO, NOVA_COMPRA, 'co-2', 'NOTA', chave('7'), null)
  })

  it('compra por nota sem chave, ou com chave fora de 44 dígitos, é recusada', async () => {
    await recusa(CHECK, NOVA_COMPRA, 'co-1', 'NOTA', null, null)
    await recusa(CHECK, NOVA_COMPRA, 'co-2', 'NOTA', '123', null)
    await aceita(NOVA_COMPRA, 'co-3', 'CAIXA', null, null)
  })
})

describe('TB08: reserva retirada uma vez', () => {
  it('a mesma reserva em duas compras é recusada', async () => {
    await aceita(NOVA_RESERVA, 'r-1', 'SEPARADA', 'PIX', 1)
    await aceita(NOVA_COMPRA, 'co-1', 'CAIXA', null, 'r-1')
    await recusa(UNICO, NOVA_COMPRA, 'co-2', 'CAIXA', null, 'r-1')
  })
})

describe('TB09: cupom uma vez por compra', () => {
  it('o mesmo cupom duas vezes na mesma compra é recusado', async () => {
    const usar = 'INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES (?1, ?2, 1000)'
    await aceita(usar, 'co-ana-1', 'cp-a-10')
    await recusa(UNICO, usar, 'co-ana-1', 'cp-a-10')
    await aceita(usar, 'co-ana-1', 'cp-shopping-20')
  })
})

describe('TB10: reembolso', () => {
  it('reembolso sem o uso do voucher na compra é recusado', async () => {
    await recusa(CHAVE_ESTRANGEIRA, NOVO_REEMBOLSO, 'rb-1', 'co-ana-1', 'cp-shopping-20', 'PENDENTE', null)
  })

  it('pago sem data, ou pendente com data, é recusado', async () => {
    await aceita(
      'INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES (?1, ?2, 2000)',
      'co-ana-1',
      'cp-shopping-20',
    )
    await recusa(CHECK, NOVO_REEMBOLSO, 'rb-1', 'co-ana-1', 'cp-shopping-20', 'PAGO', null)
    await recusa(CHECK, NOVO_REEMBOLSO, 'rb-2', 'co-ana-1', 'cp-shopping-20', 'PENDENTE', '2026-11-13T12:00:00Z')
    await aceita(NOVO_REEMBOLSO, 'rb-3', 'co-ana-1', 'cp-shopping-20', 'PAGO', '2026-11-13T12:00:00Z')
  })
})

describe('TB11: avaliação', () => {
  const avaliar = `INSERT INTO avaliacao (id, cliente_id, produto_id, compra_id, nota)
    VALUES (?1, 'c-ana', 'p-run', 'co-ana-1', ?2)`

  it('nota 6 é recusada', async () => {
    await recusa(CHECK, avaliar, 'av-1', 6)
    await recusa(CHECK, avaliar, 'av-2', 0)
  })

  it('a segunda avaliação do mesmo produto é recusada', async () => {
    await aceita(avaliar, 'av-1', 5)
    await recusa(UNICO, avaliar, 'av-2', 4)
  })
})

describe('TB12: colunas JSON', () => {
  it('JSON inválido em categorias, atributos e interesses é recusado', async () => {
    await recusa(CHECK, "UPDATE loja SET categorias = '[calcados' WHERE id = 'loja-a'")
    await recusa(CHECK, "UPDATE produto SET atributos = '{cor: preto}' WHERE id = 'p-run'")
    await recusa(CHECK, "UPDATE ficha SET interesses = 'tênis' WHERE cliente_id = 'c-ana'")
    await aceita('UPDATE produto SET atributos = \'{"cor":"preto"}\' WHERE id = \'p-run\'')
  })
})

describe('TB15: valor do cupom', () => {
  it('percentual fora de 1 a 100, ou valor em reais zerado, é recusado', async () => {
    await recusa(CHECK, NOVO_CUPOM, 'cp-1', 'PERCENTUAL', 0)
    await recusa(CHECK, NOVO_CUPOM, 'cp-2', 'PERCENTUAL', 101)
    await recusa(CHECK, NOVO_CUPOM, 'cp-3', 'VALOR', 0)
    await aceita(NOVO_CUPOM, 'cp-4', 'PERCENTUAL', 1)
    await aceita(NOVO_CUPOM, 'cp-5', 'PERCENTUAL', 100)
  })
})
