// GET e POST /api/loja/cupons (RF23): os cupons da loja, com uso, e a criação de um cupom
// com as regras da tabela cupom (docs/banco.md) e o limite e a validade de RN06.
import type { CupomDaLoja, NivelApi, Pagina, PedidoCupom, TipoCupom } from '../../tipos/loja'
import { hojeEmPalmas } from '../../painel/comum/formatos'
import { categoria } from '../../loja/telas/produtos/categorias'
import { usosDoCupom } from './atendimento'
import { exigirLojista } from './auth'
import { banco, novoId, ORDEM_DOS_NIVEIS, type CupomMock } from './dados'
import { dadosInvalidos, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'

const TIPOS: readonly TipoCupom[] = ['PERCENTUAL', 'VALOR', 'BRINDE']

function paraLoja(cupom: CupomMock): CupomDaLoja {
  const usos = usosDoCupom(cupom)
  const { id, titulo, tipo, valor, categoriaAlvo, nivelMinimo, limitePorCliente, validade, ativo } = cupom
  return {
    id,
    titulo,
    tipo,
    valor,
    categoriaAlvo,
    nivelMinimo,
    limitePorCliente,
    validade,
    ativo,
    usos: usos.length,
    descontoCentavos: usos.reduce((soma, u) => soma + u.centavos, 0),
  }
}

export function listarCupons(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const hoje = hojeEmPalmas()
  const valendo = (c: CupomMock) => c.ativo && c.validade >= hoje
  // Os que valem primeiro, os que vencem antes no topo; depois vencidos e inativos.
  const daLoja = banco.cupons
    .filter((c) => c.origem === 'LOJA')
    .sort((a, b) => Number(valendo(b)) - Number(valendo(a)) || a.validade.localeCompare(b.validade))
  const resposta: Pagina<CupomDaLoja> = { itens: daLoja.map(paraLoja), total: daLoja.length }
  return ok(resposta)
}

/** Valida como a API: devolve o pedido limpo ou a mensagem do primeiro problema. */
export function validarCupom(corpo: unknown): PedidoCupom | string {
  const c = objeto(corpo)
  if (!c) return 'Envie o cupom em JSON.'
  const titulo = typeof c.titulo === 'string' ? c.titulo.trim() : ''
  if (titulo.length < 3 || titulo.length > 60) return 'O título precisa ter de 3 a 60 caracteres.'
  if (!TIPOS.includes(c.tipo as TipoCupom)) return 'O tipo é PERCENTUAL, VALOR ou BRINDE.'
  const tipo = c.tipo as TipoCupom
  const valor = c.valor
  if (typeof valor !== 'number' || !Number.isInteger(valor)) return 'O valor do desconto precisa ser um número inteiro.'
  if (tipo === 'PERCENTUAL' && (valor < 1 || valor > 100)) return 'O desconto em porcentagem vai de 1 a 100.'
  if (tipo === 'VALOR' && valor <= 0) return 'O desconto em reais precisa ser maior que zero.'
  if (tipo === 'BRINDE' && valor !== 0) return 'Cupom de brinde não tem valor de desconto.'
  const categoriaAlvo = c.categoriaAlvo ?? null
  if (categoriaAlvo !== null && (typeof categoriaAlvo !== 'string' || !categoria(categoriaAlvo))) {
    return 'Categoria desconhecida.'
  }
  if (!ORDEM_DOS_NIVEIS.includes(c.nivelMinimo as NivelApi)) return 'O nível mínimo vai de SEMENTE a DOURADO.'
  const limite = c.limitePorCliente
  if (typeof limite !== 'number' || !Number.isInteger(limite) || limite < 1 || limite > 99) {
    return 'O limite por cliente vai de 1 a 99 usos.'
  }
  if (typeof c.validade !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.validade)) return 'A validade vai como "2026-12-31".'
  if (c.validade < hojeEmPalmas()) return 'A validade não pode ser antes de hoje.'
  return {
    titulo,
    tipo,
    valor,
    categoriaAlvo,
    nivelMinimo: c.nivelMinimo as NivelApi,
    limitePorCliente: limite,
    validade: c.validade,
  }
}

export function criarCupom(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const cupom = validarCupom(pedido.corpo)
  if (typeof cupom === 'string') return dadosInvalidos(cupom)
  // Já vale no atendimento: aparece para os clientes do nível e no prazo.
  const criado: CupomMock = { id: novoId('cp'), origem: 'LOJA', ativo: true, ...cupom }
  banco.cupons.push(criado)
  return ok(paraLoja(criado), 201)
}
