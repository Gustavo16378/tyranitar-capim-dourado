// GET /api/shopping/lojas, PUT /api/shopping/lojas/{id}, GET /api/shopping/lojas/{id}/lojistas
// e POST /api/shopping/lojistas (RF27).
import type { LojaDoShopping, LojistaCriado, Lista, PedidoLoja, TipoDeLoja } from '../../tipos/shopping'
import { CATEGORIAS_DO_SHOPPING } from '../../painel/comum/categorias'
import { dadosInvalidos, erro, naoEncontrado, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { exigirAdmin } from './auth'
import { banco, novoId, paraApi } from './dados'

const sem = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function listarLojas(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado

  const q = sem(pedido.busca.get('q')?.trim() ?? '')
  const situacao = pedido.busca.get('situacao')
  if (situacao && situacao !== 'ATIVA' && situacao !== 'VAGA') return dadosInvalidos('Use situacao ATIVA ou VAGA.')
  const pagina = Number(pedido.busca.get('pagina') ?? 1)
  const tamanho = Number(pedido.busca.get('tamanho') ?? 20)
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(tamanho) || tamanho < 1 || tamanho > 200) {
    return dadosInvalidos('Use pagina a partir de 1 e tamanho de 1 a 200.')
  }

  // Do térreo para o 2º piso, na ordem das unidades.
  const filtradas = banco.lojas
    .filter((l) => !situacao || (situacao === 'ATIVA') === l.ativa)
    .filter((l) => !q || sem(`${l.nome} ${l.unidade}`).includes(q))
    .sort((a, b) => a.piso - b.piso || a.unidade.localeCompare(b.unidade, 'pt-BR', { numeric: true }))
  const resposta: Lista<LojaDoShopping> = {
    itens: filtradas.slice((pagina - 1) * tamanho, pagina * tamanho).map(paraApi),
    total: filtradas.length,
  }
  return ok(resposta)
}

/** Valida como a API: devolve o pedido limpo ou a mensagem do primeiro problema. */
export function validarLoja(corpo: unknown): PedidoLoja | string {
  const l = objeto(corpo)
  if (!l) return 'Envie a loja em JSON.'
  if (typeof l.ativa !== 'boolean') return 'Diga se a loja está funcionando (ativa).'
  // Liberar a unidade: ela volta a ser vaga, sem nome, CNPJ nem categorias.
  if (!l.ativa) return { nome: 'Vaga', cnpj: null, tipo: l.tipo === 'alimentacao' ? 'alimentacao' : 'loja', categorias: [], ativa: false }
  const nome = typeof l.nome === 'string' ? l.nome.trim() : ''
  if (nome.length < 2 || nome.length > 80 || sem(nome) === 'vaga') return 'Escreva o nome da loja, de 2 a 80 caracteres.'
  const cnpj = typeof l.cnpj === 'string' ? l.cnpj.replace(/\D/g, '') : ''
  if (cnpj.length !== 14) return 'O CNPJ precisa ter 14 dígitos.'
  if (l.tipo !== 'loja' && l.tipo !== 'alimentacao') return 'O tipo é loja ou alimentacao.'
  const categorias = l.categorias ?? []
  if (!Array.isArray(categorias) || categorias.some((c) => !CATEGORIAS_DO_SHOPPING.some((d) => d.id === c))) {
    return 'Uma das categorias não existe.'
  }
  return { nome, cnpj, tipo: l.tipo as TipoDeLoja, categorias: [...new Set(categorias as string[])], ativa: true }
}

export function editarLoja(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const loja = banco.lojas.find((l) => l.id === pedido.params.id)
  if (!loja) return naoEncontrado('Essa loja não existe.')
  const dados = validarLoja(pedido.corpo)
  if (typeof dados === 'string') return dadosInvalidos(dados)
  if (dados.cnpj && banco.lojas.some((l) => l.id !== loja.id && l.cnpj === dados.cnpj)) {
    return erro(409, 'CNPJ_EM_USO', 'Esse CNPJ já é de outra loja do shopping.')
  }
  Object.assign(loja, dados)
  // A loja saiu: quem administrava perde o acesso.
  if (!dados.ativa) loja.lojistas = []
  return ok(paraApi(loja))
}

export function listarLojistas(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const loja = banco.lojas.find((l) => l.id === pedido.params.id)
  if (!loja) return naoEncontrado('Essa loja não existe.')
  return ok(loja.lojistas)
}

const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789'

function senhaProvisoria() {
  const numeros = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(numeros, (n) => LETRAS[n % LETRAS.length]).join('')
}

export function criarLojista(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const dados = objeto(pedido.corpo)
  const nome = typeof dados?.nome === 'string' ? dados.nome.trim() : ''
  const email = typeof dados?.email === 'string' ? dados.email.trim().toLowerCase() : ''
  if (nome.length < 3 || nome.length > 80) return dadosInvalidos('Escreva o nome do lojista, de 3 a 80 caracteres.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return dadosInvalidos('Escreva um e-mail válido.')
  const loja = banco.lojas.find((l) => l.id === dados?.lojaId)
  if (!loja) return naoEncontrado('Essa loja não existe.')
  if (!loja.ativa) return erro(422, 'LOJA_VAGA', 'A unidade está vaga. Cadastre a loja antes do lojista.')
  if (banco.lojas.some((l) => l.lojistas.some((u) => u.email === email))) {
    return erro(409, 'EMAIL_EM_USO', 'Esse e-mail já tem acesso a um painel.')
  }
  const lojista = { id: novoId('usuario-lojista-'), nome, email }
  loja.lojistas.push(lojista)
  const resposta: LojistaCriado = { ...lojista, lojaId: loja.id, senhaProvisoria: senhaProvisoria() }
  return ok(resposta, 201)
}
