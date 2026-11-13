// Dados da demo no D1: as lojas da planta, os produtos, cupons de exemplo, os usuários de teste
// e o histórico de compras da Ana. Não é migration: as migrations só têm o esquema.
//
//   npm run seed:local               aplica no D1 local (.wrangler/)
//   npm run seed:remoto              aplica no D1 de produção
//   ... -- --csv outra/pasta         lê lojas.csv e produtos.csv de outra pasta (padrão kit/seed)
//
// Idempotente: rodar de novo atualiza em vez de duplicar. Lojas por mapa_id, usuários por
// e-mail, produtos e cupons por id fixo (derivado dos dados). Produtos que saíram do CSV desde
// o último seed ficam inativos. Pontos, QR e consentimento de quem já existe não mudam.
//
// Senhas: SEED_SENHA_CLIENTE, SEED_SENHA_LOJISTA e SEED_SENHA_ADMIN no .dev.vars (fora do Git).
// Só os hashes vão para o banco; o SQL com eles fica num arquivo temporário apagado no fim.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hashSenha } from './lib/senha.mjs'

const raiz = new URL('../', import.meta.url)
const args = process.argv.slice(2)
const destino = args.includes('--remoto') ? 'remoto' : args.includes('--local') ? 'local' : null
const iCsv = args.indexOf('--csv')
const pastaCsv = pathToFileURL(`${resolve(fileURLToPath(raiz), iCsv >= 0 ? (args[iCsv + 1] ?? '') : 'kit/seed')}/`)

function falhar(mensagem) {
  console.error(`seed: ${mensagem}`)
  process.exit(1)
}
if (!destino) falhar('diga onde aplicar: npm run seed:local ou npm run seed:remoto')

// ---------- leitura ----------

/** CSV com aspas (RFC 4180). Devolve objetos pelo cabeçalho, com o número da linha. */
function lerCsv(nome) {
  const bruto = readFileSync(new URL(nome, pastaCsv), 'utf8')
  const texto = bruto.charCodeAt(0) === 0xfeff ? bruto.slice(1) : bruto // sem o BOM
  const linhas = []
  let linha = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') (campo += '"'), i++
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === ',') linha.push(campo), (campo = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo), linhas.push(linha), (linha = []), (campo = '')
    } else campo += c
  }
  if (campo || linha.length) linha.push(campo), linhas.push(linha)
  const [cabecalho, ...dados] = linhas
  return dados
    .map((valores, i) => ({ valores, numero: i + 2 }))
    .filter(({ valores }) => valores.some((v) => v.trim()))
    .map(({ valores, numero }) => ({
      numero,
      ...Object.fromEntries(cabecalho.map((coluna, j) => [coluna.trim(), (valores[j] ?? '').trim()])),
    }))
}

/** As senhas dos usuários de teste, do .dev.vars. */
function senhasDeTeste() {
  let texto = ''
  try {
    texto = readFileSync(new URL('.dev.vars', raiz), 'utf8')
  } catch {
    falhar('crie o .dev.vars a partir do .dev.vars.exemplo e preencha as senhas SEED_SENHA_*')
  }
  const ler = (chave) => {
    const valor = texto.match(new RegExp(`^${chave}=(.*)$`, 'm'))?.[1]?.trim()
    if (!valor || valor.length < 12) falhar(`defina ${chave} no .dev.vars, com 12 caracteres ou mais`)
    return valor
  }
  return { CLIENTE: ler('SEED_SENHA_CLIENTE'), LOJISTA: ler('SEED_SENHA_LOJISTA'), ADMIN_SHOPPING: ler('SEED_SENHA_ADMIN') }
}

// ---------- valores derivados ----------

const sha256 = (texto) => createHash('sha256').update(texto).digest()

/** UUID v5 (determinístico) a partir de um nome, no espaço de nomes do projeto. */
function uuid(nome) {
  const espaco = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex') // namespace URL da RFC 4122
  const bytes = createHash('sha1').update(espaco).update(`tyranitar:${nome}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** CNPJ fictício (raiz começando em 8) estável por loja, com dígitos verificadores válidos. */
function cnpjFicticio(mapaId, usados) {
  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const resto = [...base].reduce((soma, d, i) => soma + Number(d) * pesos[i], 0) % 11
    return resto < 2 ? 0 : 11 - resto
  }
  let n = sha256(`cnpj:${mapaId}`).readUInt32BE(0) % 10_000_000
  let cnpj
  do {
    const raiz12 = `8${String(n).padStart(7, '0')}0001`
    const d1 = digito(raiz12)
    cnpj = `${raiz12}${d1}${digito(raiz12 + d1)}`
    n = (n + 1) % 10_000_000
  } while (usados.has(cnpj))
  usados.add(cnpj)
  return cnpj
}

function precoEmCentavos(texto, numero) {
  const normal = texto.replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) falhar(`produtos.csv linha ${numero}: preço "${texto}" inválido`)
  return Math.round(Number(normal) * 100)
}

function json(texto, padrao, onde) {
  if (!texto) return padrao
  try {
    return JSON.parse(texto)
  } catch {
    return falhar(`${onde}: JSON inválido (${texto})`)
  }
}

// ---------- SQL ----------

const v = (valor) =>
  valor === null || valor === undefined ? 'NULL' : typeof valor === 'number' ? String(valor) : `'${String(valor).replaceAll("'", "''")}'`
const lista = (valores) => valores.map(v).join(', ')
const idDaLoja = (mapaId) => `(SELECT id FROM loja WHERE mapa_id = ${v(mapaId)})`

// ---------- lojas ----------

const PLACEHOLDER = 'LOJA 000'
const cnpjs = new Set()
const lojas = lerCsv('lojas.csv').map((l) => {
  const piso = /t[ée]rreo/i.test(l.piso) ? 1 : /2/.test(l.piso) ? 2 : falhar(`lojas.csv linha ${l.numero}: piso "${l.piso}"`)
  const cnpj = /^\d{14}$/.test(l.cnpj ?? '') ? l.cnpj : null
  return {
    codigo: l.loja,
    id: uuid(`loja:${l.loja}`),
    nome: l.nome_da_marca || l.loja.replace(/^LOJA\b/i, 'Loja'),
    cnpj: cnpj ?? cnpjFicticio(l.id_mapa, cnpjs),
    piso,
    tipo: piso === 2 ? 'alimentacao' : 'loja',
    categorias: [],
    mapaId: l.id_mapa,
    ativa: l.situacao.toUpperCase() === 'VAGA' ? 0 : 1,
  }
})
const lojaPorCodigo = new Map(lojas.map((l) => [l.codigo.toUpperCase(), l]))

// ---------- produtos ----------

// Produtos ainda com "LOJA 000" (o modelo do kit) vão para lojas ativas do térreo, uma por
// categoria, até alguém preencher produtos.csv com o número real da loja.
const avisos = []
const lojaDaCategoria = new Map()
const livres = lojas.filter((l) => l.ativa && l.piso === 1)
function lojaDoProduto(p) {
  if (p.loja.toUpperCase() !== PLACEHOLDER) {
    return lojaPorCodigo.get(p.loja.toUpperCase()) ?? falhar(`produtos.csv linha ${p.numero}: loja "${p.loja}" não está em lojas.csv`)
  }
  if (!lojaDaCategoria.has(p.categoria)) {
    const loja = livres.shift() ?? falhar('não há lojas ativas livres para os produtos de exemplo')
    lojaDaCategoria.set(p.categoria, loja)
    avisos.push(`"${PLACEHOLDER}" na categoria ${p.categoria}: produtos foram para ${loja.codigo}`)
  }
  return lojaDaCategoria.get(p.categoria)
}

const produtos = lerCsv('produtos.csv').map((p) => {
  const loja = lojaDoProduto(p)
  if (!loja.ativa) falhar(`produtos.csv linha ${p.numero}: a loja ${loja.codigo} está vaga`)
  if (!loja.categorias.includes(p.categoria)) loja.categorias.push(p.categoria)
  const fotos = p.fotos.startsWith('[') ? json(p.fotos, [], `produtos.csv linha ${p.numero}`) : p.fotos.split('|').filter(Boolean)
  return {
    id: uuid(`produto:${loja.codigo}:${p.nome}`),
    mapaId: loja.mapaId,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    preco: precoEmCentavos(p.preco, p.numero),
    estoque: Number.parseInt(p.estoque || '0', 10),
    fotos: JSON.stringify(fotos),
    atributos: JSON.stringify(json(p.atributos, {}, `produtos.csv linha ${p.numero}`)),
  }
})
const lojasComProduto = lojas.filter((l) => l.categorias.length > 0)

// ---------- usuários ----------

const senhas = senhasDeTeste()
const ANA = 'ana.souza@demo.test'
const usuarios = [
  { id: uuid('usuario:ana.souza'), nome: 'Ana Souza', email: ANA, perfil: 'CLIENTE', mapaId: null },
  ...lojasComProduto.map((l) => ({
    id: uuid(`usuario:lojista:${l.codigo}`),
    nome: `Equipe da ${l.nome}`,
    email: `lojista.${l.mapaId}@demo.test`,
    perfil: 'LOJISTA',
    mapaId: l.mapaId,
  })),
  { id: uuid('usuario:admin'), nome: 'Administração do shopping', email: 'admin@demo.test', perfil: 'ADMIN_SHOPPING', mapaId: null },
]
for (const u of usuarios) u.senhaHash = await hashSenha(senhas[u.perfil])

/** QR do cliente: estável pelo e-mail. O da Ana (q-9aa3272102ed0fa6e570fe54) é o do botão
 *  "Simular leitura" do painel da loja: não mude a regra sem mudar lá. */
const qrDoCliente = (email) => `q-${sha256(`qr:${email.split('@')[0]}`).toString('hex').slice(0, 24)}`

// ---------- cupons ----------

const lojaCalcados = lojasComProduto.find((l) => l.categorias.includes('calcados')) ?? lojasComProduto[0]
const cupons = [
  lojaCalcados && { id: uuid('cupom:10-calcados'), mapaId: lojaCalcados.mapaId, titulo: '10% em calçados', tipo: 'PERCENTUAL', valor: 10, nivel: 'SEMENTE', limite: 1, validade: '2026-12-31' },
  // Segundo cupom da mesma loja: não combina com o de 10% na mesma compra (RN05).
  lojaCalcados && { id: uuid('cupom:15-camisetas'), mapaId: lojaCalcados.mapaId, titulo: 'R$ 15 em camisetas', tipo: 'VALOR', valor: 1500, nivel: 'SEMENTE', limite: 1, validade: '2026-12-31' },
  { id: uuid('cupom:20-reais-shopping'), mapaId: null, titulo: 'R$ 20 em qualquer loja', tipo: 'VALOR', valor: 2000, nivel: 'SEMENTE', limite: 1, validade: '2026-12-15' },
  { id: uuid('cupom:estacionamento'), mapaId: null, titulo: 'Estacionamento grátis por 2 h', tipo: 'BRINDE', valor: 0, nivel: 'CAPIM', limite: 2, validade: '2026-11-30' },
].filter(Boolean)

// ---------- histórico da Ana ----------

// Compras no caixa em lojas diferentes nos últimos 12 meses, somando os 2.140 pontos do saldo
// dela (RN07: 1 ponto por real). Alimentam o nível (RN08) e os relatórios.
const lojasDoHistorico = [...lojasComProduto, ...livres].slice(0, 6)
const compras = [
  { dias: 300, valor: 45980, comFicha: 0 },
  { dias: 240, valor: 18990, comFicha: 0 },
  { dias: 170, valor: 24900, comFicha: 1 },
  { dias: 95, valor: 39990, comFicha: 1 },
  { dias: 40, valor: 52000, comFicha: 0 },
  { dias: 12, valor: 32400, comFicha: 1 },
].map((c, i) => ({ ...c, id: uuid(`compra:ana:${i + 1}`), mapaId: lojasDoHistorico[i % lojasDoHistorico.length].mapaId, pontos: Math.floor(c.valor / 100) }))
const pontosDaAna = compras.reduce((soma, c) => soma + c.pontos, 0)

// ---------- SQL ----------

const sql = [
  '-- Seed da demo (scripts/gerar-seed.mjs). Arquivo temporário: contém hashes de senha.',
  'PRAGMA defer_foreign_keys = true;',

  `INSERT INTO loja (id, nome, cnpj, piso, tipo, categorias, mapa_id, ativa) VALUES\n${lojas
    .map((l) => `  (${lista([l.id, l.nome, l.cnpj, l.piso, l.tipo, JSON.stringify(l.categorias), l.mapaId, l.ativa])})`)
    .join(',\n')}
ON CONFLICT (mapa_id) DO UPDATE SET
  nome = excluded.nome, piso = excluded.piso, tipo = excluded.tipo, ativa = excluded.ativa,
  categorias = CASE WHEN excluded.categorias <> '[]' THEN excluded.categorias ELSE loja.categorias END;`,

  ...produtos.map(
    (p) => `INSERT INTO produto (id, loja_id, nome, descricao, categoria, preco_centavos, estoque, fotos, atributos, ativo)
SELECT ${lista([p.id])}, l.id, ${lista([p.nome, p.descricao, p.categoria, p.preco, p.estoque, p.fotos, p.atributos])}, 1
FROM loja l WHERE l.mapa_id = ${v(p.mapaId)}
ON CONFLICT (id) DO UPDATE SET
  loja_id = excluded.loja_id, nome = excluded.nome, descricao = excluded.descricao, categoria = excluded.categoria,
  preco_centavos = excluded.preco_centavos, estoque = excluded.estoque, fotos = excluded.fotos,
  atributos = excluded.atributos, ativo = 1, atualizado_em = datetime('now');`,
  ),

  // Produtos do seed anterior que saíram do CSV ficam inativos (podem ter reservas: não são apagados).
  `UPDATE produto SET ativo = 0, atualizado_em = datetime('now')
WHERE id IN (SELECT value FROM json_each(COALESCE((SELECT valor FROM configuracao WHERE chave = 'seed_produtos'), '[]')))
  AND id NOT IN (SELECT value FROM json_each(${v(JSON.stringify(produtos.map((p) => p.id)))}));`,
  `INSERT INTO configuracao (chave, valor) VALUES ('seed_produtos', ${v(JSON.stringify(produtos.map((p) => p.id)))})
ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor;`,

  ...usuarios.map(
    (u) => `INSERT INTO usuario (id, nome, email, senha_hash, perfil, loja_id, qr_token, pontos, consentimento_ficha)
SELECT ${lista([u.id, u.nome, u.email, u.senhaHash, u.perfil])}, ${u.mapaId ? 'l.id' : 'NULL'}, ${
      u.perfil === 'CLIENTE' ? v(qrDoCliente(u.email)) : 'NULL'
    }, ${u.email === ANA ? pontosDaAna : 0}, ${u.email === ANA ? 1 : 0}
FROM ${u.mapaId ? `loja l WHERE l.mapa_id = ${v(u.mapaId)}` : '(SELECT 1) WHERE true'}
ON CONFLICT (email) DO UPDATE SET
  nome = excluded.nome, senha_hash = excluded.senha_hash, perfil = excluded.perfil, loja_id = excluded.loja_id;`,
  ),

  // Ficha da Ana (só se o consentimento dela continuar dado).
  `INSERT OR IGNORE INTO ficha (cliente_id, interesses)
SELECT id, ${v(
    JSON.stringify([
      { categoria: 'calcados', detalhe: 'Tênis de corrida, número 42, até R$ 400' },
      { categoria: 'calcados', detalhe: 'Prefere preto' },
      { categoria: 'roupas', detalhe: 'Camisetas dry-fit' },
    ]),
  )}
FROM usuario WHERE email = ${v(ANA)} AND consentimento_ficha = 1;`,

  ...cupons.map(
    (c) => `INSERT INTO cupom (id, loja_id, titulo, tipo, valor, nivel_minimo, limite_por_cliente, validade)
SELECT ${lista([c.id])}, ${c.mapaId ? 'l.id' : 'NULL'}, ${lista([c.titulo, c.tipo, c.valor, c.nivel, c.limite, c.validade])}
FROM ${c.mapaId ? `loja l WHERE l.mapa_id = ${v(c.mapaId)}` : '(SELECT 1) WHERE true'}
ON CONFLICT (id) DO UPDATE SET
  loja_id = excluded.loja_id, titulo = excluded.titulo, tipo = excluded.tipo, valor = excluded.valor,
  nivel_minimo = excluded.nivel_minimo, limite_por_cliente = excluded.limite_por_cliente, validade = excluded.validade;`,
  ),

  // Favoritos da Ana ("Você salvou" no Início): os produtos da demo, se ainda não estiverem.
  ...produtos.slice(0, 3).map(
    (p, i) => `INSERT OR IGNORE INTO favorito (cliente_id, produto_id, criado_em)
SELECT u.id, ${v(p.id)}, datetime('now', ${v(`-${i} hours`)}) FROM usuario u WHERE u.email = ${v(ANA)};`,
  ),

  // Histórico da Ana: entra uma vez (as datas contam a partir do primeiro seed).
  ...compras.map(
    (c) => `INSERT OR IGNORE INTO compra (id, cliente_id, loja_id, valor_centavos, origem, pontos_gerados, com_ficha, criado_em)
SELECT ${v(c.id)}, u.id, ${idDaLoja(c.mapaId)}, ${c.valor}, 'CAIXA', ${c.pontos}, ${c.comFicha}, datetime('now', ${v(`-${c.dias} days`)})
FROM usuario u WHERE u.email = ${v(ANA)};`,
  ),

  'PRAGMA defer_foreign_keys = false;',
  '',
].join('\n\n')

// ---------- aplica ----------

const pasta = mkdtempSync(join(tmpdir(), 'tyranitar-seed-'))
const arquivo = join(pasta, 'seed.sql')
try {
  writeFileSync(arquivo, sql)
  const wrangler = join(dirname(createRequire(import.meta.url).resolve('wrangler/package.json')), 'bin', 'wrangler.js')
  const resultado = spawnSync(
    process.execPath,
    [wrangler, 'd1', 'execute', 'tyranitar', destino === 'remoto' ? '--remote' : '--local', '--file', arquivo, '--yes'],
    { cwd: fileURLToPath(raiz), stdio: ['inherit', 'pipe', 'inherit'], env: { ...process.env, CI: '1' }, encoding: 'utf8' },
  )
  if (resultado.status !== 0) {
    console.error(resultado.stdout)
    falhar(`o wrangler terminou com erro (código ${resultado.status})`)
  }
} finally {
  rmSync(pasta, { recursive: true, force: true })
}

for (const aviso of avisos) console.warn(`aviso: ${aviso}`)
console.log(
  `seed ${destino}: ${lojas.length} lojas (${lojas.filter((l) => !l.ativa).length} vagas), ${produtos.length} produtos, ` +
    `${cupons.length} cupons, ${usuarios.length} usuários e ${compras.length} compras da Ana (${pontosDaAna} pontos).`,
)
