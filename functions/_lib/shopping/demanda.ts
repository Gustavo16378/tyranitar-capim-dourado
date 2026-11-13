// A demanda do shopping (RF29) e o cruzamento dela com as lojas vagas (GET /api/shopping/vagas):
// o que os clientes procuraram e não acharam em nenhuma loja, por categoria, sem identificar
// ninguém (RN12), e que tipo de loja buscar para cada vaga (regras/vagas.ts).
import { buscasSemResultado, contarBuscasDesde, termosMaisBuscados } from '../repo/buscas'
import { listarUnidades, nomeDaUnidade } from '../repo/lojas'
import { ehCategoria } from '../regras/categorias'
import { paraSqlite } from '../regras/datas'
import { inicioDoPeriodo, type Periodo } from '../regras/periodo'
import { sugerirVagas, type DemandaDaCategoria, type VagaParaCruzar } from '../regras/vagas'

const MAIS_BUSCADOS = 8
const TERMOS_POR_CATEGORIA = 5

/** As buscas sem resultado do período, por categoria, da que mais falta para a que menos falta. */
async function semResultadoPorCategoria(db: D1Database, desde: string): Promise<DemandaDaCategoria[]> {
  const porCategoria = new Map<string, DemandaDaCategoria>()
  for (const linha of await buscasSemResultado(db, desde)) {
    if (!ehCategoria(linha.categoria)) continue
    const categoria = porCategoria.get(linha.categoria) ?? { categoria: linha.categoria, buscas: 0, termos: [] }
    categoria.buscas += linha.buscas
    categoria.termos.push({ termo: linha.termo, buscas: linha.buscas })
    porCategoria.set(linha.categoria, categoria)
  }
  return [...porCategoria.values()]
    .map((c) => ({ ...c, termos: c.termos.slice(0, TERMOS_POR_CATEGORIA) }))
    .sort((a, b) => b.buscas - a.buscas || a.categoria.localeCompare(b.categoria))
}

/** GET /api/shopping/demanda. */
export async function montarDemanda(db: D1Database, periodo: Periodo, agora = new Date()) {
  const desde = paraSqlite(inicioDoPeriodo(periodo, agora))
  const [buscas, maisBuscados, porCategoria] = await Promise.all([
    contarBuscasDesde(db, desde),
    termosMaisBuscados(db, desde, MAIS_BUSCADOS),
    semResultadoPorCategoria(db, desde),
  ])
  return {
    periodo,
    buscas,
    semResultado: porCategoria.reduce((soma, c) => soma + c.buscas, 0),
    maisBuscados,
    semResultadoPorCategoria: porCategoria,
  }
}

/**
 * GET /api/shopping/vagas: as unidades vagas que têm área, cruzadas com as buscas sem
 * resultado do período. Uma unidade ocupada na tela de Lojas sai daqui na hora.
 */
export async function montarVagas(db: D1Database, periodo: Periodo, agora = new Date()) {
  const desde = paraSqlite(inicioDoPeriodo(periodo, agora))
  const [unidades, demanda] = await Promise.all([listarUnidades(db), semResultadoPorCategoria(db, desde)])
  const vagas: VagaParaCruzar[] = unidades
    .filter((u) => u.ativa === 0 && u.area_m2 !== null)
    .map((u) => ({ id: u.id, unidade: nomeDaUnidade(u.numero), piso: u.piso, areaM2: u.area_m2, mapaId: u.mapa_id }))
  const cruzamento = sugerirVagas(vagas, demanda)
  return {
    periodo,
    resumo: {
      vagas: vagas.length,
      areaTotalM2: Math.round(vagas.reduce((soma, v) => soma + (v.areaM2 ?? 0), 0) * 100) / 100,
      buscasSemResultado: demanda.reduce((soma, d) => soma + d.buscas, 0),
      buscasComVaga: cruzamento.demanda.filter((d) => d.vagas.length > 0).reduce((soma, d) => soma + d.buscas, 0),
    },
    ...cruzamento,
  }
}
