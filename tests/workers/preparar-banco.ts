// Roda em cada arquivo de teste no runtime do Workers: aplica as migrations no D1 do Miniflare
// e, antes de cada teste, apaga os dados e carrega tests/seed.sql de novo. Assim nenhum teste
// depende do que outro gravou.
import { applyD1Migrations, env } from 'cloudflare:test'
import { beforeEach } from 'vitest'

await applyD1Migrations(env.DB, env.MIGRATIONS)

// Filhas antes das mães, por causa das chaves estrangeiras. A configuração fica (vem da migration).
const TABELAS = [
  'reembolso', 'uso_cupom', 'avaliacao', 'compra', 'reserva', 'favorito', 'notificacao',
  'busca', 'mensagem', 'ficha', 'cupom', 'produto', 'usuario', 'loja',
]

const comandosDoSeed = env.SEED_DE_TESTE.split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')
  .split(/;\s*(?:\n|$)/)
  .map((comando) => comando.trim())
  .filter(Boolean)

beforeEach(async () => {
  await env.DB.batch([
    ...TABELAS.map((tabela) => env.DB.prepare(`DELETE FROM ${tabela}`)),
    ...comandosDoSeed.map((comando) => env.DB.prepare(comando)),
  ])
})
