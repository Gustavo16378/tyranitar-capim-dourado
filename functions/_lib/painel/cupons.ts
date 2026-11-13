// O corpo de um cupom novo, igual no cupom da loja (POST /api/loja/cupons) e no voucher do
// shopping (POST /api/shopping/cupons). As regras são as da tabela cupom e da RN06.
import { ErroApi } from '../erros'
import type { NovoCupom } from '../repo/cupons'
import { ORDEM_NIVEIS, type NivelFidelidade } from '../regras/niveis'

const TIPOS = ['PERCENTUAL', 'VALOR', 'BRINDE'] as const

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)

/** Valida o corpo; categorias são as que o cupom pode mirar. hoje: a data em Palmas. */
export function lerPedidoCupom(corpo: Record<string, unknown>, categorias: readonly string[], hoje: string): NovoCupom {
  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : ''
  if (titulo.length < 3 || titulo.length > 60) throw invalido('O título precisa ter de 3 a 60 caracteres.')
  const tipo = corpo.tipo as NovoCupom['tipo']
  if (!TIPOS.includes(tipo)) throw invalido('O tipo é PERCENTUAL, VALOR ou BRINDE.')
  const valor = corpo.valor
  if (typeof valor !== 'number' || !Number.isInteger(valor)) throw invalido('O valor do desconto precisa ser um número inteiro.')
  if (tipo === 'PERCENTUAL' && (valor < 1 || valor > 100)) throw invalido('O desconto em porcentagem vai de 1 a 100.')
  if (tipo === 'VALOR' && valor <= 0) throw invalido('O desconto em reais precisa ser maior que zero.')
  if (tipo === 'BRINDE' && valor !== 0) throw invalido('Cupom de brinde não tem valor de desconto.')
  const categoriaAlvo = corpo.categoriaAlvo ?? null
  if (categoriaAlvo !== null && (typeof categoriaAlvo !== 'string' || !categorias.includes(categoriaAlvo))) {
    throw invalido('Categoria desconhecida.')
  }
  const nivelMinimo = corpo.nivelMinimo as NivelFidelidade
  if (!ORDEM_NIVEIS.includes(nivelMinimo)) throw invalido('O nível mínimo vai de SEMENTE a DOURADO.')
  const limite = corpo.limitePorCliente
  if (typeof limite !== 'number' || !Number.isInteger(limite) || limite < 1 || limite > 99) {
    throw invalido('O limite por cliente vai de 1 a 99 usos.')
  }
  const validade = corpo.validade
  if (typeof validade !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(validade)) throw invalido('A validade vai como "2026-12-31".')
  if (validade < hoje) throw invalido('A validade não pode ser antes de hoje.')
  return { titulo, tipo, valor, categoriaAlvo, nivelMinimo, limitePorCliente: limite, validade }
}
