// GET e POST /api/loja/cupons (RF23): os cupons da loja, com uso, e a criação de um cupom
// com as regras da tabela cupom (docs/banco.md) e o limite e a validade de RN06.
import type { CupomDaLoja, Lista } from '../../tipos/loja'
import { hojeEmPalmas } from '../../painel/comum/formatos'
import { CATEGORIAS } from '../../loja/telas/produtos/categorias'
import { validarCupom } from '../comum/cupons'
import { dadosInvalidos, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { usosDoCupom } from './atendimento'
import { exigirLojista } from './auth'
import { banco, novoId, type CupomMock } from './dados'

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
  const resposta: Lista<CupomDaLoja> = { itens: daLoja.map(paraLoja), total: daLoja.length }
  return ok(resposta)
}

export function criarCupom(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  // As mesmas categorias que o formulário da loja oferece.
  const cupom = validarCupom(pedido.corpo, CATEGORIAS.map((c) => c.id))
  if (typeof cupom === 'string') return dadosInvalidos(cupom)
  // Já vale no atendimento: aparece para os clientes do nível e no prazo.
  const criado: CupomMock = { id: novoId('cp'), origem: 'LOJA', ativo: true, ...cupom }
  banco.cupons.push(criado)
  return ok(paraLoja(criado), 201)
}
