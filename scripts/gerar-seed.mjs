// Dados da demo no D1: as lojas da planta (com número e área da unidade), os produtos, cupons de
// exemplo, os usuários de teste, o histórico de compras da Ana e as buscas da demonstração.
// Não é migration: as migrations só têm o esquema.
//
//   npm run seed:local               aplica no D1 local (.wrangler/)
//   npm run seed:remoto              aplica no D1 de produção
//   ... -- --csv outra/pasta         lê lojas.csv e produtos.csv de outra pasta (padrão seed/)
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
import { categoriaDaMarca } from './categorias-das-marcas.mjs'
import { EMAIL_DA_ANA, HISTORICO_DA_ANA, idDoCupom, PONTOS_DA_ANA, uuid } from './lib/ids-do-seed.mjs'
import { hashSenha } from './lib/senha.mjs'

const raiz = new URL('../', import.meta.url)
const args = process.argv.slice(2)
const destino = args.includes('--remoto') ? 'remoto' : args.includes('--local') ? 'local' : null
const iCsv = args.indexOf('--csv')
const pastaCsv = pathToFileURL(`${resolve(fileURLToPath(raiz), iCsv >= 0 ? (args[iCsv + 1] ?? '') : 'seed')}/`)

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
/** Área da planilha: "116,1" ou "58.81" (m²); vazia vira null. */
function areaEmM2(texto, linha) {
  if (!texto) return null
  const area = Number(texto.replace(',', '.'))
  return Number.isFinite(area) && area > 0 ? area : falhar(`lojas.csv linha ${linha}: área "${texto}"`)
}

/** "LOJA 48A" → "48A", sem observação entre parênteses ("LOJA 109 (segunda, repetida na planta)"). */
const rotuloDaUnidade = (l) => l.loja.replace(/^LOJA\s+/i, '').replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase()
const linhasDasLojas = lerCsv('lojas.csv')
const vezesDoRotulo = new Map()
for (const l of linhasDasLojas) vezesDoRotulo.set(rotuloDaUnidade(l), (vezesDoRotulo.get(rotuloDaUnidade(l)) ?? 0) + 1)
/** O número da unidade é único: um número repetido na planta usa o do mapa_id ("loja-109-b" → "109-B"). */
const numeroDaUnidade = (l) =>
  vezesDoRotulo.get(rotuloDaUnidade(l)) > 1 ? l.id_mapa.replace(/^loja-/i, '').toUpperCase() : rotuloDaUnidade(l)

// Lojas ativas com marca que ficou sem categoria (a capa e o filtro da ficha dependem dela).
const marcasSemCategoria = []

const lojas = linhasDasLojas.map((l) => {
  const piso = /t[ée]rreo/i.test(l.piso) ? 1 : /2/.test(l.piso) ? 2 : falhar(`lojas.csv linha ${l.numero}: piso "${l.piso}"`)
  const vaga = l.situacao.toUpperCase() === 'VAGA'
  const cnpj = /^\d{14}$/.test(l.cnpj ?? '') ? l.cnpj : null
  // A categoria da marca vem primeiro (a capa no painel do shopping); a dos produtos entra depois.
  const categoria = vaga ? null : l.categoria?.trim() || categoriaDaMarca(l.nome_da_marca)
  if (!vaga && l.nome_da_marca && !categoria) marcasSemCategoria.push(l.nome_da_marca)
  return {
    codigo: l.loja,
    id: uuid(`loja:${l.loja}`),
    nome: l.nome_da_marca || (vaga ? 'Vaga' : l.loja.replace(/^LOJA\b/i, 'Loja')),
    // O número da unidade na planta: as telas mostram "LOJA 48A".
    numero: numeroDaUnidade(l),
    areaM2: areaEmM2(l.area_m2, l.numero),
    // Unidade vaga não tem CNPJ (migration 0003).
    cnpj: vaga ? null : (cnpj ?? cnpjFicticio(l.id_mapa, cnpjs)),
    piso,
    tipo: piso === 2 ? 'alimentacao' : 'loja',
    categorias: categoria ? [categoria] : [],
    mapaId: l.id_mapa,
    ativa: vaga ? 0 : 1,
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
const comProduto = new Set(produtos.map((p) => p.mapaId))
const lojasComProduto = lojas.filter((l) => comProduto.has(l.mapaId))

// ---------- usuários ----------

const senhas = senhasDeTeste()
const ANA = EMAIL_DA_ANA
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

/** QR do cliente: estável pelo e-mail inteiro. O da Ana (q-e08f6d74302d293349fda714) é o do botão
 *  "Simular leitura" do painel da loja (QR_DA_ANA, branch fase-4): não mude a regra sem mudar lá. */
const qrDoCliente = (email) => `q-${sha256(`qr:${email}`).toString('hex').slice(0, 24)}`

// ---------- cupons ----------

// A loja da demonstração é a do primeiro produto do produtos.csv (o tênis do roteiro): o lojista
// dela é a conta de demonstração do painel (functions/api/auth/demo.ts lê de configuracao).
const lojaDaDemo = lojas.find((l) => l.mapaId === produtos[0]?.mapaId)
// Os cupons da loja vão para a loja do primeiro calçado, para valerem no roteiro.
const primeiroCalcado = produtos.find((p) => p.categoria === 'calcados')
const lojaCalcados = lojas.find((l) => l.mapaId === primeiroCalcado?.mapaId) ?? lojasComProduto[0]
const cupons = [
  // categoria: o cupom da loja só desconta nos itens dela (RN15); null, na loja toda.
  lojaCalcados && { id: idDoCupom('10-calcados'), mapaId: lojaCalcados.mapaId, titulo: '10% em calçados', tipo: 'PERCENTUAL', valor: 10, categoria: 'calcados', nivel: 'SEMENTE', limite: 1, validade: '2026-12-31' },
  // Segundo cupom da mesma loja: não combina com o de 10% na mesma compra (RN05).
  lojaCalcados && { id: idDoCupom('15-camisetas'), mapaId: lojaCalcados.mapaId, titulo: 'R$ 15 em camisetas', tipo: 'VALOR', valor: 1500, categoria: 'roupas', nivel: 'SEMENTE', limite: 1, validade: '2026-12-31' },
  { id: idDoCupom('20-reais-shopping'), mapaId: null, titulo: 'R$ 20 em qualquer loja', tipo: 'VALOR', valor: 2000, nivel: 'SEMENTE', limite: 1, validade: '2026-12-15' },
  { id: idDoCupom('estacionamento'), mapaId: null, titulo: 'Estacionamento grátis por 2 h', tipo: 'BRINDE', valor: 0, nivel: 'CAPIM', limite: 2, validade: '2026-11-30' },
].filter(Boolean)

// ---------- histórico da Ana ----------

// As compras do histórico (scripts/lib/ids-do-seed.mjs), cada uma numa loja diferente. As lojas
// são fixas (as seis primeiras com produto quando o catálogo tinha 12 itens): com o catálogo
// maior, a ordem das lojas com produto mudaria e, num banco novo, as compras iriam para outras.
const LOJAS_DO_HISTORICO = ['loja-38', 'loja-36', 'loja-29', 'loja-73', 'loja-53', 'loja-ancora-01']
const fixas = LOJAS_DO_HISTORICO.flatMap((mapaId) => lojasComProduto.filter((l) => l.mapaId === mapaId))
const lojasDoHistorico = [...new Set([...fixas, ...lojasComProduto, ...livres])].slice(0, 6)
const compras = HISTORICO_DA_ANA.map((c, i) => ({ ...c, mapaId: lojasDoHistorico[i % lojasDoHistorico.length].mapaId }))
const pontosDaAna = PONTOS_DA_ANA

// ---------- buscas da demonstração ----------

// O que os clientes buscaram no app e com a Capi, sem identificar ninguém (RN12), para a
// Demanda e as Lojas vagas do painel do shopping terem o que mostrar antes do uso de verdade.
// [termo, categoria, buscas em 30 dias]; elas se repetem iguais pelos 90 dias anteriores ao
// primeiro seed. As sem resultado são o que falta no shopping: a base do cruzamento com as vagas.
const BUSCAS_SEM_RESULTADO = [
  ['fone bluetooth', 'eletronicos', 96], ['carregador turbo', 'eletronicos', 71], ['smartwatch', 'eletronicos', 58], ['caixa de som', 'eletronicos', 44],
  ['roupa de bebê', 'infantil', 88], ['carrinho de bebê', 'infantil', 52], ['brinquedo educativo', 'infantil', 47],
  ['tênis de trilha', 'calcados', 120], ['chuteira society', 'calcados', 39], ['bota de couro', 'calcados', 22],
  ['comida árabe', 'alimentacao', 64], ['açaí', 'alimentacao', 58], ['poke', 'alimentacao', 33], ['comida vegana', 'alimentacao', 21],
  ['ração', 'pet', 61], ['petshop', 'pet', 49], ['coleira', 'pet', 20],
  ['bicicleta', 'esportes', 41], ['raquete de beach tennis', 'esportes', 34], ['halteres', 'esportes', 26],
  ['jogo de cama', 'casa', 37], ['panela elétrica', 'casa', 29], ['luminária', 'casa', 18],
  ['luva de academia', 'acessorios', 31], ['tornozeleira', 'acessorios', 22], ['viseira', 'acessorios', 15],
  ['lente de contato', 'otica', 34], ['óculos de grau', 'otica', 21],
  ['livro infantil', 'livraria', 28], ['material escolar', 'livraria', 25],
  ['legging feminina', 'roupas', 47],
  ['perfume importado', 'perfumaria', 24], ['maquiagem profissional', 'perfumaria', 18],
  ['aliança de prata', 'joias', 12], ['piercing', 'joias', 7],
]
const BUSCAS_COM_RESULTADO = [
  ['tênis de corrida', 'calcados', 214], ['camiseta dry-fit', 'roupas', 156], ['perfume', 'perfumaria', 133],
  ['hambúrguer', 'alimentacao', 118], ['garrafa térmica', 'esportes', 88], ['sandália', 'calcados', 84],
  ['calça jeans', 'roupas', 82], ['café', 'alimentacao', 80], ['mochila', 'acessorios', 78], ['hidratante', 'perfumaria', 75],
  ['jaqueta', 'roupas', 72], ['pizza', 'alimentacao', 70], ['tênis branco', 'calcados', 68], ['protetor solar', 'perfumaria', 64],
  ['boné', 'acessorios', 62], ['sorvete', 'alimentacao', 60], ['vestido', 'roupas', 58], ['óculos de sol', 'acessorios', 55],
  ['chinelo', 'calcados', 52], ['batom', 'perfumaria', 50], ['camisa polo', 'roupas', 48], ['pastel', 'alimentacao', 45],
  ['presente', null, 70],
]
const buscas = [
  ...BUSCAS_SEM_RESULTADO.map(([termo, categoria, em30]) => ({ termo, categoria, em30, encontrou: 0 })),
  ...BUSCAS_COM_RESULTADO.map(([termo, categoria, em30]) => ({ termo, categoria, em30, encontrou: 1 })),
].map((b) => ({ ...b, chave: sha256(`busca:${b.termo}:${b.encontrou}`).toString('hex').slice(0, 12) }))

// ---------- SQL ----------

const sql = [
  '-- Seed da demo (scripts/gerar-seed.mjs). Arquivo temporário: contém hashes de senha.',
  'PRAGMA defer_foreign_keys = true;',

  // A unidade que o seed deixa vaga perde o CNPJ; a que fica ativa mantém o que já tinha.
  `INSERT INTO loja (id, nome, numero, area_m2, cnpj, piso, tipo, categorias, mapa_id, ativa) VALUES\n${lojas
    .map((l) => `  (${lista([l.id, l.nome, l.numero, l.areaM2, l.cnpj, l.piso, l.tipo, JSON.stringify(l.categorias), l.mapaId, l.ativa])})`)
    .join(',\n')}
ON CONFLICT (mapa_id) DO UPDATE SET
  nome = excluded.nome, numero = excluded.numero, area_m2 = excluded.area_m2, piso = excluded.piso,
  tipo = excluded.tipo, ativa = excluded.ativa,
  cnpj = CASE WHEN excluded.ativa = 1 THEN COALESCE(loja.cnpj, excluded.cnpj) END,
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
  ...(lojaDaDemo
    ? [
        `INSERT INTO configuracao (chave, valor) VALUES ('conta_demo_lojista', ${v(JSON.stringify(`lojista.${lojaDaDemo.mapaId}@demo.test`))})
ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor;`,
      ]
    : []),

  ...usuarios.map(
    (u) => `INSERT INTO usuario (id, nome, email, senha_hash, perfil, loja_id, qr_token, pontos, consentimento_ficha)
SELECT ${lista([u.id, u.nome, u.email, u.senhaHash, u.perfil])}, ${u.mapaId ? 'l.id' : 'NULL'}, ${
      u.perfil === 'CLIENTE' ? v(qrDoCliente(u.email)) : 'NULL'
    }, ${u.email === ANA ? pontosDaAna : 0}, ${u.email === ANA ? 1 : 0}
FROM ${u.mapaId ? `loja l WHERE l.mapa_id = ${v(u.mapaId)}` : '(SELECT 1) WHERE true'}
ON CONFLICT (email) DO UPDATE SET
  nome = excluded.nome, senha_hash = excluded.senha_hash, perfil = excluded.perfil, loja_id = excluded.loja_id,
  qr_token = excluded.qr_token;`,
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
    (c) => `INSERT INTO cupom (id, loja_id, titulo, tipo, valor, categoria_alvo, nivel_minimo, limite_por_cliente, validade)
SELECT ${lista([c.id])}, ${c.mapaId ? 'l.id' : 'NULL'}, ${lista([c.titulo, c.tipo, c.valor])}, ${c.categoria ? v(c.categoria) : 'NULL'}, ${lista([c.nivel, c.limite, c.validade])}
FROM ${c.mapaId ? `loja l WHERE l.mapa_id = ${v(c.mapaId)}` : '(SELECT 1) WHERE true'}
ON CONFLICT (id) DO UPDATE SET
  loja_id = excluded.loja_id, titulo = excluded.titulo, tipo = excluded.tipo, valor = excluded.valor,
  categoria_alvo = excluded.categoria_alvo, nivel_minimo = excluded.nivel_minimo,
  limite_por_cliente = excluded.limite_por_cliente, validade = excluded.validade;`,
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
  // Cada compra do histórico com o item dela ("Outros": o histórico não diz o produto).
  ...compras.map(
    (c) => `INSERT OR IGNORE INTO compra_item (id, compra_id, descricao, quantidade, preco_centavos)
SELECT ${v(`${c.id}-1`)}, ${v(c.id)}, 'Outros', 1, ${c.valor} WHERE EXISTS (SELECT 1 FROM compra WHERE id = ${v(c.id)});`,
  ),

  // Buscas da demonstração: entram uma vez, com id fixo, espalhadas pelos 90 dias (3 × as de 30).
  ...buscas.map(
    (b) => `INSERT OR IGNORE INTO busca (id, cliente_id, termo, categoria, encontrou, criado_em)
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < ${b.em30 * 3 - 1})
SELECT ${v(`seed-busca-${b.chave}-`)} || i, NULL, ${lista([b.termo, b.categoria, b.encontrou])},
       datetime('now', printf('-%.4f days', (i + ${(parseInt(b.chave.slice(0, 4), 16) / 0x10000).toFixed(3)}) * 30.0 / ${b.em30}))
FROM n;`,
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
if (marcasSemCategoria.length) {
  console.warn(`aviso: marcas sem categoria (scripts/categorias-das-marcas.mjs): ${marcasSemCategoria.join(', ')}`)
}
console.log(
  `seed ${destino}: ${lojas.length} lojas (${lojas.filter((l) => !l.ativa).length} vagas), ${produtos.length} produtos, ` +
    `${cupons.length} cupons, ${usuarios.length} usuários e ${compras.length} compras da Ana (${pontosDaAna} pontos), ` +
    `${buscas.reduce((soma, b) => soma + b.em30 * 3, 0)} buscas da demonstração em 90 dias.`,
)
