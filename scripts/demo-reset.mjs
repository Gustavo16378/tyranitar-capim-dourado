// Volta a demonstração ao começo, entre um ensaio e outro. Só mexe na conta da Ana (a cliente
// da demonstração): as contas de outras pessoas ficam como estão.
//
// 1. Limpa o que os ensaios deixaram na conta dela (scripts/lib/demo-reset.mjs): as compras no
//    balcão que não são do seed, com os usos de cupom, o reembolso do voucher, as avaliações e o
//    aviso dos pontos; as reservas; a conversa com a Capi, as buscas e a ficha.
// 2. Roda o seed de novo (scripts/gerar-seed.mjs): o estoque, a ficha do roteiro, os cupons e
//    uma compra do histórico que falte voltam ao que eram.
// 3. Recalcula o saldo pelas 6 compras do seed (2.140 pontos) e mostra o que a carteira da Ana e
//    o extrato da loja da demonstração vão mostrar.
//
//   npm run demo:reset                       no D1 de produção (não precisa de deploy)
//   node scripts/demo-reset.mjs --local      no D1 local
//
// Precisa das senhas do seed no .dev.vars (SEED_SENHA_*), como o npm run seed:remoto.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resumoDoReset, sqlDaLimpeza, sqlDoResumo, sqlDoSaldo } from './lib/demo-reset.mjs'
import { CUPONS_DO_SEED, EMAIL_DA_ANA, HISTORICO_DA_ANA, idDoCupom, PONTOS_DA_ANA } from './lib/ids-do-seed.mjs'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const destino = args.includes('--remoto') ? 'remoto' : args.includes('--local') ? 'local' : null

function falhar(mensagem) {
  console.error(`demo:reset: ${mensagem}`)
  process.exit(1)
}
if (!destino) falhar('diga onde: npm run demo:reset (produção) ou node scripts/demo-reset.mjs --local')

const conta = {
  email: EMAIL_DA_ANA,
  comprasDoSeed: HISTORICO_DA_ANA.map((c) => c.id),
  cuponsDoSeed: CUPONS_DO_SEED.map(idDoCupom),
}

/** Roda um script com o node atual, na raiz do projeto, e devolve o que ele escreveu. */
function rodar(script, argumentos, nome) {
  const r = spawnSync(process.execPath, [script, ...argumentos], {
    cwd: raiz,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, CI: '1' },
  })
  if (r.status !== 0) {
    console.error(r.stdout)
    falhar(`${nome} terminou com erro (código ${r.status})`)
  }
  return r.stdout
}

const wrangler = join(dirname(createRequire(import.meta.url).resolve('wrangler/package.json')), 'bin', 'wrangler.js')

/** Roda os comandos SQL de uma vez (o D1 aplica numa transação) e devolve as linhas de cada um. */
function sql(comandos) {
  const saida = rodar(
    wrangler,
    ['d1', 'execute', 'tyranitar', destino === 'remoto' ? '--remote' : '--local', '--command', comandos.join(';\n'), '--json', '--yes'],
    'o wrangler',
  )
  try {
    return JSON.parse(saida.slice(saida.indexOf('['))).map((r) => r.results)
  } catch {
    return falhar(`não entendi a resposta do wrangler:\n${saida}`)
  }
}

// 1. A limpeza, com a contagem antes (o D1 local não diz quantas linhas cada comando mudou).
const limpeza = sqlDaLimpeza(conta)
const [[antes]] = sql([limpeza.contagem, ...limpeza.comandos])

// 2. O seed devolve o estoque dos produtos da demo, a ficha do roteiro e os cupons.
const seed = rodar(join(raiz, 'scripts', 'gerar-seed.mjs'), [destino === 'remoto' ? '--remoto' : '--local'], 'o seed')
console.log(seed.trim())

// 3. O saldo pelas compras que ficaram, e o resumo. O lojista da demo é o que o seed gravou.
const [, [lojista]] = sql([sqlDoSaldo(conta.email), "SELECT json_extract(valor, '$') AS email FROM configuracao WHERE chave = 'conta_demo_lojista'"])
const resumo = resumoDoReset(sql(sqlDoResumo({ ...conta, emailDoLojista: lojista?.email ?? '' })))

const n = (valor) => Number(valor).toLocaleString('pt-BR')
console.log(
  `demo:reset ${destino}: apagadas da Ana ${n(antes.compras)} compra(s) de ensaio (${n(antes.pontos)} pontos), ` +
    `${n(antes.usos_de_cupom)} uso(s) de cupom, ${n(antes.reembolsos)} reembolso(s), ${n(antes.reservas)} reserva(s), ` +
    `${n(antes.avisos)} aviso(s), ${n(antes.mensagens)} mensagem(ns) com a Capi e ${n(antes.buscas)} busca(s).`,
)
console.log(
  `Ana agora: ${n(resumo.pontos)} pontos em ${resumo.compras} compras, nível ${resumo.nivel}, ` +
    `${resumo.cupons.length} cupom(ns) na carteira (${resumo.cupons.join(', ')}).`,
)
const { extrato } = resumo
console.log(
  `Extrato da ${extrato.loja ?? 'loja da demo'} (30 dias): ${extrato.compras} compra(s) no caixa, ${extrato.doSeed} do seed` +
    (extrato.deOutrosClientes ? `, ${extrato.deOutrosClientes} de outras contas (o reset não mexe nelas)` : '') +
    `; ${extrato.reembolsos} reembolso(s) da loja.`,
)
if (resumo.pontos !== PONTOS_DA_ANA) {
  falhar(`a Ana ficou com ${n(resumo.pontos)} pontos, e o seed tem ${n(PONTOS_DA_ANA)}. Confira as compras dela.`)
}
