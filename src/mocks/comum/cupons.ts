// A validação de um cupom novo, igual para o da loja (POST /api/loja/cupons) e o voucher do
// shopping (POST /api/shopping/cupons).
import type { NivelApi, PedidoCupom, TipoCupom } from '../../tipos/painel'
import { hojeEmPalmas } from '../../painel/comum/formatos'
import { objeto } from './resposta'

const TIPOS: readonly TipoCupom[] = ['PERCENTUAL', 'VALOR', 'BRINDE']
const NIVEIS: readonly NivelApi[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']

/**
 * Valida um cupom da loja ou um voucher do shopping como a API (tabela cupom e RN06): devolve
 * o pedido limpo ou a mensagem do primeiro problema. categorias: as que o cupom pode mirar.
 */
export function validarCupom(corpo: unknown, categorias: readonly string[]): PedidoCupom | string {
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
  if (categoriaAlvo !== null && (typeof categoriaAlvo !== 'string' || !categorias.includes(categoriaAlvo))) {
    return 'Categoria desconhecida.'
  }
  if (!NIVEIS.includes(c.nivelMinimo as NivelApi)) return 'O nível mínimo vai de SEMENTE a DOURADO.'
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
