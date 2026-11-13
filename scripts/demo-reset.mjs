// Volta a demonstração ao começo, entre um ensaio e outro: cancela as reservas em aberto da
// Ana, apaga a conversa dela com a Capi e devolve o estoque do seed. O estoque volta rodando o
// seed de novo (scripts/gerar-seed.mjs), que também repõe os cupons, favoritos e compras da Ana.
//
//   npm run demo:reset                       no D1 de produção (não precisa de deploy)
//   node scripts/demo-reset.mjs --local      no D1 local
//
// Precisa das senhas do seed no .dev.vars (SEED_SENHA_*), como o npm run seed:remoto.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const destino = args.includes('--remoto') ? 'remoto' : args.includes('--local') ? 'local' : null

function falhar(mensagem) {
  console.error(`demo:reset: ${mensagem}`)
  process.exit(1)
}
if (!destino) falhar('diga onde: npm run demo:reset (produção) ou node scripts/demo-reset.mjs --local')

const DA_ANA = "(SELECT id FROM usuario WHERE email = 'ana.souza@demo.test')"
const EM_ABERTO = `cliente_id = ${DA_ANA} AND status IN ('PENDENTE', 'CONFIRMADA', 'SEPARADA')`
// As contagens vêm antes das mudanças: o D1 local não diz quantas linhas cada comando mudou.
const SQL = [
  `SELECT count(*) AS n FROM reserva WHERE ${EM_ABERTO}`,
  `SELECT count(*) AS n FROM mensagem WHERE cliente_id = ${DA_ANA}`,
  `UPDATE reserva SET status = 'CANCELADA', atualizado_em = datetime('now') WHERE ${EM_ABERTO}`,
  `DELETE FROM mensagem WHERE cliente_id = ${DA_ANA}`,
].join(';\n')

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

// 1. Reservas e conversa da Ana. As reservas são canceladas sem devolver o estoque um a um:
//    o passo 2 põe o estoque de volta no valor do seed.
const wrangler = join(dirname(createRequire(import.meta.url).resolve('wrangler/package.json')), 'bin', 'wrangler.js')
const saida = rodar(
  wrangler,
  ['d1', 'execute', 'tyranitar', destino === 'remoto' ? '--remote' : '--local', '--command', SQL, '--json', '--yes'],
  'o wrangler',
)
let canceladas = 0
let apagadas = 0
try {
  const resultados = JSON.parse(saida.slice(saida.indexOf('[')))
  canceladas = resultados[0].results[0].n
  apagadas = resultados[1].results[0].n
} catch {
  falhar(`não entendi a resposta do wrangler:\n${saida}`)
}

// 2. O seed devolve o estoque dos produtos da demo (e repõe o resto dos dados dela).
const seed = rodar(join(raiz, 'scripts', 'gerar-seed.mjs'), [destino === 'remoto' ? '--remoto' : '--local'], 'o seed')

console.log(seed.trim())
console.log(
  `demo:reset ${destino}: ${canceladas} reserva(s) da Ana cancelada(s), ${apagadas} mensagem(ns) dela com a Capi ` +
    'apagada(s) e o estoque do seed de volta.',
)
