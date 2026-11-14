// Sobe o site para os testes no navegador (npm run test:e2e e test:a11y chamam pelo
// playwright.config.ts): o front com o modo demonstração ligado, as Functions e um D1 local só
// dos testes, apagado e preenchido de novo a cada vez.
//
// O banco é o tests/seed.sql (o mesmo dos testes de API) com estes ajustes para a jornada:
// - a Ana com o e-mail da conta de demonstração (POST /api/auth/demo procura por ele) e o QR
//   fixo da demonstração (o mesmo do botão "Simular leitura" do painel da loja);
// - o lojista da Loja A e a administração com senhas de verdade, para entrar pelo login;
// - a Carla, cliente com seis interesses na ficha, para a Minha conta apagar um (TE14), e doze
//   compras, uma por dia, para Minhas compras (TE34): passam de uma página da lista inteira;
// - a Loja A numa loja que existe na planta, para o mapa desenhar a rota;
// - buscas recentes nas categorias da Loja A, para o Desempenho (TX07) ter o que mostrar.
// Sem ANTHROPIC_API_KEY: a Capi responde com as respostas salvas (CAPI_MODO_DEMO=1) e, fora do
// roteiro, como indisponível, e o app cai na busca comum. Nada sai para a internet.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashSenha } from '../../scripts/lib/senha.mjs'

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const dados = JSON.parse(readFileSync(new URL('./dados.json', import.meta.url), 'utf8'))
// A mesma porta que o playwright.config.ts usa (tests/e2e/dados.ts).
if (process.env.E2E_PORTA) dados.porta = Number(process.env.E2E_PORTA)
const BANCO = '.wrangler/e2e'
const SITE = 'dist-e2e'
const requerer = createRequire(import.meta.url)
const wrangler = join(dirname(requerer.resolve('wrangler/package.json')), 'bin', 'wrangler.js')
const vite = join(dirname(requerer.resolve('vite/package.json')), 'bin', 'vite.js')
// CI=1: o wrangler não pergunta nada (aplicar migrations, por exemplo).
const ambiente = { ...process.env, CI: '1' }

function rodar(passo, comando, args, extra = {}) {
  console.log(`e2e: ${passo}`)
  const r = spawnSync(process.execPath, [comando, ...args], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...ambiente, ...extra },
  })
  if (r.status !== 0) {
    console.error(`e2e: falhou em "${passo}" (código ${r.status})`)
    process.exit(1)
  }
}

const aspas = (texto) => `'${String(texto).replaceAll("'", "''")}'`

// As compras da Carla (TE34, TX15): a mais nova, ontem na Loja A, com o cupom da loja e o voucher
// do shopping; as outras, sem cupom, uma por dia antes dela, alternando a Loja A e a Loja B.
const comprasDaCarla = Array.from({ length: 12 }, (_, i) => {
  const valor = i === 0 ? 12391 : 5000 + i * 1000
  const loja = i % 2 === 0 ? 'loja-a' : 'loja-b'
  return `('co-carla-${String(i + 1).padStart(2, '0')}', 'c-carla', '${loja}', ${valor}, 'CAIXA', ${Math.floor(valor / 100)}, datetime('now', '-${i + 1} days'))`
}).join(',\n  ')

// 1. O front com o modo demonstração (a Capi abre tocando o roteiro), numa pasta só dos testes.
rodar('tokens do design system', 'scripts/gerar-tokens.mjs', [])
rodar('build do front com VITE_MODO_DEMO=1', vite, ['build', '--outDir', SITE, '--emptyOutDir'], {
  VITE_MODO_DEMO: '1',
})

// 2. O banco: do zero, com as migrations, o seed de teste e os ajustes da jornada.
rmSync(join(raiz, BANCO), { recursive: true, force: true })
rodar('migrations no D1 dos testes', wrangler, [
  'd1',
  'migrations',
  'apply',
  'tyranitar',
  '--local',
  '--persist-to',
  BANCO,
])
const ajustes = `
UPDATE usuario SET email = ${aspas(dados.ana.email)}, qr_token = ${aspas(dados.ana.qrToken)} WHERE id = 'c-ana';
UPDATE usuario SET senha_hash = ${aspas(await hashSenha(dados.lojista.senha))} WHERE email = ${aspas(dados.lojista.email)};
UPDATE usuario SET senha_hash = ${aspas(await hashSenha(dados.admin.senha))} WHERE email = ${aspas(dados.admin.email)};
INSERT INTO usuario (id, nome, email, senha_hash, perfil, qr_token, consentimento_ficha) VALUES
  ('c-carla', 'Carla Dias', ${aspas(dados.carla.email)}, ${aspas(await hashSenha(dados.carla.senha))}, 'CLIENTE', ${aspas(dados.carla.qrToken)}, 1);
INSERT INTO ficha (cliente_id, interesses) VALUES ('c-carla', ${aspas(JSON.stringify([
  { categoria: 'calcados', detalhe: 'Tênis de trilha, número 38' },
  { categoria: 'calcados', detalhe: 'Sandália rasteira caramelo' },
  { categoria: 'roupas', detalhe: 'Jaqueta corta-vento, tamanho M' },
  { categoria: 'roupas', detalhe: 'Prefere cores neutras' },
  { categoria: 'perfumaria', detalhe: 'Perfume floral suave' },
  { categoria: 'calcados', detalhe: 'Meia de compressão' },
]))});
INSERT INTO compra (id, cliente_id, loja_id, valor_centavos, origem, pontos_gerados, criado_em) VALUES
  ${comprasDaCarla};
INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES
  ('co-carla-01', 'cp-a-10', 1599),
  ('co-carla-01', 'cp-shopping-20', 2000);
UPDATE loja SET mapa_id = ${aspas(dados.mapaDaLojaA)} WHERE id = 'loja-a';
INSERT INTO busca (id, termo, categoria, encontrou, criado_em) VALUES
  ('b-e2e-1', 'tênis de trilha', 'calcados', 0, datetime('now', '-1 days')),
  ('b-e2e-2', 'tênis de trilha', 'calcados', 0, datetime('now', '-2 days')),
  ('b-e2e-3', 'chuteira society', 'calcados', 0, datetime('now', '-3 days')),
  ('b-e2e-4', 'tênis de corrida', 'calcados', 1, datetime('now', '-1 days'));
`
const pasta = mkdtempSync(join(tmpdir(), 'e2e-seed-'))
const arquivo = join(pasta, 'seed.sql')
writeFileSync(arquivo, `${readFileSync(join(raiz, 'tests/seed.sql'), 'utf8')}\n${ajustes}`)
try {
  rodar('seed de teste', wrangler, [
    'd1',
    'execute',
    'tyranitar',
    '--local',
    '--persist-to',
    BANCO,
    '--file',
    arquivo,
    '--yes',
  ])
} finally {
  rmSync(pasta, { recursive: true, force: true })
}

// 3. O site: front e Functions juntos, como no Cloudflare Pages.
console.log(`e2e: site em http://localhost:${dados.porta}`)
const site = spawn(
  process.execPath,
  [
    wrangler,
    'pages',
    'dev',
    SITE,
    '--port',
    String(dados.porta),
    '--persist-to',
    BANCO,
    '--binding',
    `JWT_SECRET=${dados.jwtSecret}`,
    '--binding',
    'DEMO=1',
    '--binding',
    'CAPI_MODO_DEMO=1',
    // Vazia de propósito: os testes nunca chamam o Claude, mesmo com um .dev.vars na máquina.
    '--binding',
    'ANTHROPIC_API_KEY=',
  ],
  { cwd: raiz, stdio: 'inherit', env: ambiente },
)
site.on('exit', (codigo) => process.exit(codigo ?? 0))
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => site.kill(sinal))
