// GET /api/shopping/vagas?periodo=: as lojas vagas da planta cruzadas com as buscas sem
// resultado do período (a mesma base da Demanda), com a sugestão de loja para cada vaga.
// Ocupar uma vaga na tela de Lojas tira ela daqui na hora.
import type { VagasEDemanda } from '../../tipos/shopping'
import { dadosInvalidos, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { exigirAdmin } from './auth'
import { banco } from './dados'
import { lerPeriodo, semResultadoPorCategoria } from './demanda'
import { sugerirVagas } from './sugerirVagas'

export function buscarVagas(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const periodo = lerPeriodo(pedido)
  if (!periodo) return dadosInvalidos('Use periodo 7d, 30d ou 90d.')

  const vagas = banco.lojas
    .filter((l) => !l.ativa)
    .map(({ id, unidade, piso, areaM2, mapaId }) => ({ id, unidade, piso, areaM2, mapaId }))
  const demanda = semResultadoPorCategoria(periodo)
  const cruzamento = sugerirVagas(vagas, demanda)

  const comVaga = cruzamento.demanda.filter((d) => d.vagas.length > 0)
  const resposta: VagasEDemanda = {
    periodo,
    resumo: {
      vagas: vagas.length,
      areaTotalM2: Math.round(vagas.reduce((soma, v) => soma + (v.areaM2 ?? 0), 0) * 100) / 100,
      buscasSemResultado: demanda.reduce((soma, d) => soma + d.buscas, 0),
      buscasComVaga: comVaga.reduce((soma, d) => soma + d.buscas, 0),
    },
    ...cruzamento,
  }
  return ok(resposta)
}
