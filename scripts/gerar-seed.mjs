// Gera migrations/0002_seed.sql com os dados da demo: as lojas da planta, os produtos,
// cupons de exemplo e os usuários de teste.
//
//   npm run seed                 lê kit/seed/lojas.csv e kit/seed/produtos.csv
//   npm run seed -- outra/pasta  lê os CSVs de outra pasta
//
// A saída é a mesma a cada execução (ids e sais derivados dos dados), para todo mundo ter o
// mesmo banco. A senha dos usuários de teste vem de SENHA_TESTE no .dev.vars.exemplo.
import { createHash, webcrypto } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const raiz = new URL('../', import.meta.url)
const pastaCsv = new URL(`${(process.argv[2] ?? 'kit/seed').replace(/\/?$/, '/')}`, raiz)
const saida = new URL('migrations/0002_seed.sql', raiz)

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

function falhar(mensagem) {
  console.error(`gerar-seed: ${mensagem}`)
  process.exit(1)
}

function senhaDeTeste() {
  const exemplo = readFileSync(new URL('.dev.vars.exemplo', raiz), 'utf8')
  const senha = exemplo.match(/^SENHA_TESTE=(.+)$/m)?.[1]?.trim()
  if (!senha || senha.length < 8) falhar('defina SENHA_TESTE (8 caracteres ou mais) no .dev.vars.exemplo')
  return senha
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

/** CNPJ fictício (raiz começando em 9) com dígitos verificadores válidos. */
function cnpjFicticio(indice) {
  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const resto = [...base].reduce((soma, d, i) => soma + Number(d) * pesos[i], 0) % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const raiz12 = `9${String(indice).padStart(7, '0')}0001`
  const d1 = digito(raiz12)
  return `${raiz12}${d1}${digito(raiz12 + d1)}`
}

/** Mesmo formato de functions/_lib/auth/senha.ts: pbkdf2_sha256$iterações$sal$hash (base64). */
async function hashSenha(senha, email) {
  const iteracoes = 100_000
  const sal = sha256(`tyranitar-seed:${email}`).subarray(0, 16)
  const chave = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, 256)
  return `pbkdf2_sha256$${iteracoes}$${sal.toString('base64')}$${Buffer.from(bits).toString('base64')}`
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

const valorSql = (v) =>
  v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`

function inserir(tabela, linhas) {
  if (linhas.length === 0) return `-- ${tabela}: nada para inserir`
  const colunas = Object.keys(linhas[0])
  const valores = linhas.map((l) => `  (${colunas.map((c) => valorSql(l[c])).join(', ')})`)
  return `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES\n${valores.join(',\n')};`
}

// ---------- lojas ----------

const PLACEHOLDER = 'LOJA 000'
const lojasCsv = lerCsv('lojas.csv')
const lojas = lojasCsv.map((l, i) => {
  const piso = /t[ée]rreo/i.test(l.piso) ? 1 : /2/.test(l.piso) ? 2 : falhar(`lojas.csv linha ${l.numero}: piso "${l.piso}"`)
  return {
    codigo: l.loja,
    linha: {
      id: uuid(`loja:${l.loja}`),
      nome: l.nome_da_marca || l.loja.replace(/^LOJA\b/i, 'Loja'),
      cnpj: cnpjFicticio(i + 1),
      piso,
      tipo: piso === 2 ? 'alimentacao' : 'loja',
      categorias: [],
      mapa_id: l.id_mapa,
      ativa: l.situacao.toUpperCase() === 'VAGA' ? 0 : 1,
    },
  }
})
const lojaPorCodigo = new Map(lojas.map((l) => [l.codigo.toUpperCase(), l]))

// ---------- produtos ----------

// Produtos ainda com "LOJA 000" (o modelo do kit) vão para lojas ativas do térreo, uma por
// categoria, até alguém preencher produtos.csv com o número real da loja.
const avisos = []
const reservaPorCategoria = new Map()
const livres = lojas.filter((l) => l.linha.ativa && l.linha.piso === 1)
function lojaDoProduto(p) {
  if (p.loja.toUpperCase() !== PLACEHOLDER) {
    return lojaPorCodigo.get(p.loja.toUpperCase()) ?? falhar(`produtos.csv linha ${p.numero}: loja "${p.loja}" não está em lojas.csv`)
  }
  if (!reservaPorCategoria.has(p.categoria)) {
    const loja = livres.shift() ?? falhar('não há lojas ativas livres para os produtos de exemplo')
    reservaPorCategoria.set(p.categoria, loja)
    avisos.push(`"${PLACEHOLDER}" na categoria ${p.categoria}: produtos foram para ${loja.codigo}`)
  }
  return reservaPorCategoria.get(p.categoria)
}

const produtos = lerCsv('produtos.csv').map((p) => {
  const loja = lojaDoProduto(p)
  if (!loja.linha.ativa) falhar(`produtos.csv linha ${p.numero}: a loja ${loja.codigo} está vaga`)
  if (!loja.linha.categorias.includes(p.categoria)) loja.linha.categorias.push(p.categoria)
  const fotos = p.fotos.startsWith('[') ? json(p.fotos, [], `produtos.csv linha ${p.numero}`) : p.fotos.split('|').filter(Boolean)
  return {
    id: uuid(`produto:${loja.codigo}:${p.nome}`),
    loja_id: loja.linha.id,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    preco_centavos: precoEmCentavos(p.preco, p.numero),
    estoque: Number.parseInt(p.estoque || '0', 10),
    fotos: JSON.stringify(fotos),
    atributos: JSON.stringify(json(p.atributos, {}, `produtos.csv linha ${p.numero}`)),
  }
})

// ---------- usuários ----------

const senha = senhaDeTeste()
const lojasComProduto = lojas.filter((l) => l.linha.categorias.length > 0)
const ana = { email: 'ana.souza@demo.test', id: uuid('usuario:ana.souza') }
const usuarios = [
  {
    id: ana.id,
    nome: 'Ana Souza',
    email: ana.email,
    perfil: 'CLIENTE',
    loja_id: null,
    qr_token: `q-${sha256('qr:ana.souza').toString('hex').slice(0, 24)}`,
    pontos: 2140,
    consentimento_ficha: 1,
  },
  ...lojasComProduto.map((l) => ({
    id: uuid(`usuario:lojista:${l.codigo}`),
    nome: `Equipe da ${l.linha.nome}`,
    email: `lojista.${l.linha.mapa_id}@demo.test`,
    perfil: 'LOJISTA',
    loja_id: l.linha.id,
    qr_token: null,
    pontos: 0,
    consentimento_ficha: 0,
  })),
  {
    id: uuid('usuario:admin'),
    nome: 'Administração do shopping',
    email: 'admin@demo.test',
    perfil: 'ADMIN_SHOPPING',
    loja_id: null,
    qr_token: null,
    pontos: 0,
    consentimento_ficha: 0,
  },
]
for (const u of usuarios) u.senha_hash = await hashSenha(senha, u.email)

// Ficha da Ana (ela deu consentimento): interesses por categoria, em frases curtas.
const ficha = {
  cliente_id: ana.id,
  interesses: JSON.stringify([
    { categoria: 'calcados', detalhe: 'Tênis de corrida, número 42, até R$ 400' },
    { categoria: 'calcados', detalhe: 'Prefere preto' },
    { categoria: 'roupas', detalhe: 'Camisetas dry-fit' },
  ]),
}

// ---------- cupons ----------

const lojaCalcados = lojasComProduto.find((l) => l.linha.categorias.includes('calcados')) ?? lojasComProduto[0]
const cupons = [
  lojaCalcados && {
    id: uuid('cupom:10-calcados'),
    loja_id: lojaCalcados.linha.id,
    titulo: '10% em calçados',
    tipo: 'PERCENTUAL',
    valor: 10,
    categoria_alvo: null,
    nivel_minimo: 'SEMENTE',
    limite_por_cliente: 1,
    validade: '2026-12-31',
  },
  {
    id: uuid('cupom:20-reais-shopping'),
    loja_id: null,
    titulo: 'R$ 20 em qualquer loja',
    tipo: 'VALOR',
    valor: 2000,
    categoria_alvo: null,
    nivel_minimo: 'SEMENTE',
    limite_por_cliente: 1,
    validade: '2026-12-15',
  },
  {
    id: uuid('cupom:estacionamento'),
    loja_id: null,
    titulo: 'Estacionamento grátis por 2 h',
    tipo: 'BRINDE',
    valor: 0,
    categoria_alvo: null,
    nivel_minimo: 'CAPIM',
    limite_por_cliente: 2,
    validade: '2026-11-30',
  },
].filter(Boolean)

// ---------- saída ----------

const sql = [
  '-- Migration 0002: dados da demo. Gerado por scripts/gerar-seed.mjs; não edite à mão (npm run seed).',
  `-- ${lojas.length} lojas da planta (${lojas.filter((l) => !l.linha.ativa).length} vagas, inativas), ${produtos.length} produtos, ${cupons.length} cupons e ${usuarios.length} usuários de teste.`,
  '-- CNPJs fictícios. A senha dos usuários de teste está em SENHA_TESTE no .dev.vars.exemplo.',
  '',
  inserir('loja', lojas.map((l) => ({ ...l.linha, categorias: JSON.stringify(l.linha.categorias) }))),
  '',
  inserir('produto', produtos),
  '',
  inserir('usuario', usuarios),
  '',
  inserir('ficha', [ficha]),
  '',
  inserir('cupom', cupons),
  '',
].join('\n')

writeFileSync(saida, sql)
for (const aviso of avisos) console.warn(`aviso: ${aviso}`)
console.log(
  `0002_seed.sql gerado: ${lojas.length} lojas, ${produtos.length} produtos, ${cupons.length} cupons, ${usuarios.length} usuários.`,
)
