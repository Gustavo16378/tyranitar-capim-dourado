// As unidades da planta e as lojas nelas (RF27): listar, ocupar uma vaga, editar, liberar a
// unidade e criar o acesso dos lojistas. Unidade vaga é uma loja com ativa = 0 e sem CNPJ.
import { gerarHashSenha } from '../auth/senha'
import { ErroApi } from '../erros'
import {
  buscarUnidade,
  cnpjEmUso,
  criarUnidade,
  liberarUnidade,
  listarUnidades,
  ocuparUnidade,
  unidadeExiste,
  unidadeParaApi,
  type DadosDaLoja,
} from '../repo/lojas'
import { buscarUsuarioPorEmail, criarLojista, lojistasDaLoja } from '../repo/usuarios'
import { ehCategoria } from '../regras/categorias'
import { normalizar } from '../texto'

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)
const NAO_EXISTE = 'Essa loja não existe.'

export interface FiltroDeUnidades {
  q?: string
  situacao?: 'ATIVA' | 'VAGA'
  inicio: number
  tamanho: number
}

/** ?situacao= da URL: ATIVA, VAGA ou nada (todas). */
export function lerSituacao(url: URL): FiltroDeUnidades['situacao'] {
  const situacao = url.searchParams.get('situacao')?.trim()
  if (!situacao) return undefined
  if (situacao !== 'ATIVA' && situacao !== 'VAGA') throw invalido('Use situacao ATIVA ou VAGA.')
  return situacao
}

/** Do térreo para o 2º piso, pelo número da unidade (48 antes de 48A, e os dois antes de 141). */
export async function listarLojasDoShopping(db: D1Database, filtro: FiltroDeUnidades) {
  const q = normalizar(filtro.q?.trim() ?? '')
  const unidades = (await listarUnidades(db))
    .map(unidadeParaApi)
    .filter((l) => !filtro.situacao || (filtro.situacao === 'ATIVA') === l.ativa)
    .filter((l) => !q || normalizar(`${l.nome} ${l.unidade}`).includes(q))
    .sort((a, b) => a.piso - b.piso || a.unidade.localeCompare(b.unidade, 'pt-BR', { numeric: true }))
  return { itens: unidades.slice(filtro.inicio, filtro.inicio + filtro.tamanho), total: unidades.length }
}

/**
 * O corpo do PUT: a loja que ocupa a unidade, ou null para liberar (ativa: false). Com ativa
 * true, nome (2 a 80) e CNPJ (14 dígitos, aceita pontuação) são obrigatórios.
 */
export function lerPedidoLoja(corpo: Record<string, unknown>): DadosDaLoja | null {
  if (typeof corpo.ativa !== 'boolean') throw invalido('Diga se a loja está funcionando (ativa).')
  if (!corpo.ativa) return null
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : ''
  if (nome.length < 2 || nome.length > 80 || normalizar(nome) === 'vaga') throw invalido('Escreva o nome da loja, de 2 a 80 caracteres.')
  const cnpj = typeof corpo.cnpj === 'string' ? corpo.cnpj.replace(/\D/g, '') : ''
  if (cnpj.length !== 14) throw invalido('O CNPJ precisa ter 14 dígitos.')
  if (corpo.tipo !== 'loja' && corpo.tipo !== 'alimentacao') throw invalido('O tipo é loja ou alimentacao.')
  const categorias = corpo.categorias ?? []
  if (!Array.isArray(categorias) || !categorias.every(ehCategoria)) throw invalido('Uma das categorias não existe.')
  return { nome, cnpj, tipo: corpo.tipo, categorias: [...new Set(categorias as string[])] }
}

async function garantirCnpjLivre(db: D1Database, cnpj: string, foraDe?: string) {
  if (await cnpjEmUso(db, cnpj, foraDe)) throw new ErroApi('CNPJ_EM_USO', 'Esse CNPJ já é de outra loja do shopping.')
}

/** PUT /api/shopping/lojas/{id}: ocupa a vaga, edita a loja ou libera a unidade. */
export async function salvarLoja(db: D1Database, id: string, corpo: Record<string, unknown>) {
  if (!(await buscarUnidade(db, id))) throw new ErroApi('NAO_ENCONTRADO', NAO_EXISTE)
  const loja = lerPedidoLoja(corpo)
  if (loja) {
    await garantirCnpjLivre(db, loja.cnpj, id)
    await ocuparUnidade(db, id, loja)
  } else {
    await liberarUnidade(db, id)
  }
  return unidadeParaApi((await buscarUnidade(db, id))!)
}

/** POST /api/shopping/lojas: uma unidade nova na planta, vaga ou já com a loja. */
export async function novaUnidade(db: D1Database, corpo: Record<string, unknown>) {
  const numero = typeof corpo.unidade === 'string' ? corpo.unidade.replace(/^LOJA\s+/i, '').trim().toUpperCase() : ''
  if (numero.length < 1 || numero.length > 20) throw invalido('Escreva o número da unidade, como na planta: "LOJA 150".')
  const piso = corpo.piso
  if (piso !== 1 && piso !== 2) throw invalido('O piso é 1 (térreo) ou 2 (praça de alimentação).')
  const areaM2 = corpo.areaM2 ?? null
  if (areaM2 !== null && (typeof areaM2 !== 'number' || !(areaM2 > 0 && areaM2 <= 10_000))) {
    throw invalido('A área vai em m², maior que zero.')
  }
  const mapaId = typeof corpo.mapaId === 'string' ? corpo.mapaId.trim() : ''
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(mapaId)) throw invalido('O mapaId é o id do polígono na planta, como "loja-150".')
  const loja = lerPedidoLoja(corpo)
  if (await unidadeExiste(db, numero, mapaId)) throw invalido('Essa unidade já está na planta.')
  if (loja) await garantirCnpjLivre(db, loja.cnpj)
  const id = await criarUnidade(db, {
    numero,
    piso,
    areaM2,
    mapaId,
    tipo: piso === 2 ? 'alimentacao' : 'loja',
    loja,
  })
  return unidadeParaApi((await buscarUnidade(db, id))!)
}

/** GET /api/shopping/lojas/{id}/lojistas. */
export async function lojistasDaUnidade(db: D1Database, id: string) {
  if (!(await buscarUnidade(db, id))) throw new ErroApi('NAO_ENCONTRADO', NAO_EXISTE)
  return lojistasDaLoja(db, id)
}

const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789'

/** 10 letras e números sem os que se confundem (l, i, o, 0, 1). */
function senhaProvisoria() {
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => LETRAS[n % LETRAS.length]).join('')
}

/**
 * POST /api/shopping/lojistas: o acesso de um lojista ao painel da loja, com uma senha
 * provisória que só aparece nesta resposta (o banco guarda o hash).
 */
export async function novoLojista(db: D1Database, corpo: Record<string, unknown>) {
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : ''
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : ''
  if (nome.length < 3 || nome.length > 80) throw invalido('Escreva o nome do lojista, de 3 a 80 caracteres.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalido('Escreva um e-mail válido.')
  const lojaId = typeof corpo.lojaId === 'string' ? corpo.lojaId : ''
  const loja = lojaId ? await buscarUnidade(db, lojaId) : null
  if (!loja) throw new ErroApi('NAO_ENCONTRADO', NAO_EXISTE)
  if (loja.ativa !== 1) throw new ErroApi('LOJA_VAGA', 'A unidade está vaga. Cadastre a loja antes do lojista.')
  if (await buscarUsuarioPorEmail(db, email)) throw new ErroApi('EMAIL_EM_USO', 'Esse e-mail já tem uma conta.')
  const senha = senhaProvisoria()
  const lojista = { id: crypto.randomUUID(), nome, email, lojaId: loja.id }
  try {
    await criarLojista(db, { ...lojista, senhaHash: await gerarHashSenha(senha) })
  } catch (erro) {
    // Dois pedidos com o mesmo e-mail ao mesmo tempo: o UNIQUE segura o segundo.
    if (String(erro).includes('UNIQUE')) throw new ErroApi('EMAIL_EM_USO', 'Esse e-mail já tem uma conta.')
    throw erro
  }
  return { ...lojista, senhaProvisoria: senha }
}
