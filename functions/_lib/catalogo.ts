// Busca no catálogo, usada pela rota GET /api/produtos e pelas ferramentas da Capi.
import { registrarBusca } from './repo/buscas'
import { listarProdutosAtivos, type ProdutoLinha } from './repo/produtos'
import { lerJson, normalizar, termosDaBusca, textosDoJson } from './texto'

export interface FiltrosDaBusca {
  texto?: string
  categoria?: string
  lojaId?: string
  precoMin?: number
  precoMax?: number
}

/** Relevância do produto para os termos: 0 se algum termo não aparece; nome vale mais. */
function relevancia(p: ProdutoLinha, termos: string[]) {
  const nome = normalizar(p.nome)
  const resto = normalizar([p.descricao, p.categoria, p.loja_nome, ...textosDoJson(lerJson(p.atributos, {}))].join(' '))
  let pontos = 0
  for (const termo of termos) {
    if (nome.includes(termo)) pontos += 2
    else if (resto.includes(termo)) pontos += 1
    else return 0
  }
  return pontos
}

/** Produtos ativos que atendem aos filtros, os mais relevantes para o texto primeiro. */
export async function buscarNoCatalogo(db: D1Database, filtros: FiltrosDaBusca): Promise<ProdutoLinha[]> {
  const produtos = await listarProdutosAtivos(db, filtros)
  const termos = termosDaBusca(filtros.texto ?? '')
  if (!termos.length) return produtos
  return produtos
    .map((p) => ({ p, nota: relevancia(p, termos) }))
    .filter(({ nota }) => nota > 0)
    .sort((a, b) => b.nota - a.nota || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
    .map(({ p }) => p)
}

/** RN12: registra a busca (com ou sem resultado) para os relatórios de demanda. Nunca falha a busca. */
export function registrarResultado(
  db: D1Database,
  busca: { clienteId: string | null; termo: string; categoria?: string | null; encontrados: ProdutoLinha[] },
) {
  return registrarBusca(db, {
    clienteId: busca.clienteId,
    termo: busca.termo.trim().replace(/\s+/g, ' ').slice(0, 200).toLowerCase(),
    categoria: busca.categoria ?? busca.encontrados[0]?.categoria ?? null,
    encontrou: busca.encontrados.length > 0,
  }).catch((erro) => console.error('Não deu para registrar a busca:', erro))
}
