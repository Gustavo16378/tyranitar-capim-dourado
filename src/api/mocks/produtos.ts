// Mock de GET /api/produtos e GET /api/produtos/{id}, no formato das rotas de functions/api/produtos.
// As lojas e os mapaId são de exemplo: o mapa de verdade usa as lojas do seed (GET /api/lojas).
import type { FiltroProdutos, Lista, LojaDoProduto, ProdutoDetalhe, ProdutoResumo } from '../../tipos'
import { falhar, responder } from './atraso'

const LOJAS = {
  esportes: { id: 'l-esportes', nome: 'Loja de esportes', piso: 1, mapaId: 'loja-esportes' },
  calcados: { id: 'l-calcados', nome: 'Calçados', piso: 1, mapaId: 'loja-calcados' },
  perfumaria: { id: 'l-perfumaria', nome: 'Perfumaria', piso: 1, mapaId: 'loja-perfumaria' },
  moda: { id: 'l-moda', nome: 'Moda masculina', piso: 1, mapaId: 'loja-moda' },
  eletronicos: { id: 'l-eletronicos', nome: 'Eletrônicos', piso: 1, mapaId: 'loja-eletronicos' },
} satisfies Record<string, LojaDoProduto>

type ProdutoMock = Omit<ProdutoDetalhe, 'outrasLojas'> & { parecidos: string[] }

function produto(
  dados: Omit<ProdutoMock, 'foto' | 'fotos' | 'avaliacao' | 'avaliacoes'> & Partial<ProdutoMock>,
): ProdutoMock {
  return { foto: null, fotos: [], avaliacao: { media: null, total: 0 }, avaliacoes: [], ...dados }
}

/** O catálogo do mock. O estoque muda com as reservas (RN03). */
export const CATALOGO: ProdutoMock[] = [
  produto({
    id: 'p-pulse',
    nome: 'Tênis de corrida Pulse',
    categoria: 'calcados',
    precoCentavos: 39990,
    estoque: 2,
    loja: LOJAS.esportes,
    descricao: 'Tênis de corrida com amortecimento leve, cabedal em tela respirável.',
    atributos: { numeracao: [38, 39, 40, 41, 42, 43], cor: 'preto' },
    avaliacao: { media: 5, total: 1 },
    avaliacoes: [
      {
        nota: 5,
        comentario: 'Leve e confortável desde o primeiro treino.',
        criadoEm: '2026-10-28T14:00:00Z',
        autor: 'Carla',
      },
    ],
    parecidos: ['p-run'],
  }),
  produto({
    id: 'p-run',
    nome: 'Tênis Run 2 preto',
    categoria: 'calcados',
    precoCentavos: 34990,
    estoque: 5,
    loja: LOJAS.calcados,
    descricao: 'Tênis de corrida para o dia a dia, solado de borracha.',
    atributos: { numeracao: [37, 38, 39, 40, 41, 42], cor: 'preto' },
    parecidos: ['p-pulse'],
  }),
  produto({
    id: 'p-perfume',
    nome: 'Perfume Cerrado 100 ml',
    categoria: 'perfumaria',
    precoCentavos: 24900,
    estoque: 8,
    loja: LOJAS.perfumaria,
    descricao: 'Perfume amadeirado com notas de pequi e baru.',
    atributos: { ml: 100, familia: 'amadeirado' },
    parecidos: [],
  }),
  produto({
    id: 'p-jaqueta',
    nome: 'Jaqueta corta-vento',
    categoria: 'roupas',
    precoCentavos: 18990,
    estoque: 3,
    loja: LOJAS.moda,
    descricao: 'Jaqueta leve, dobrável, com capuz.',
    atributos: { tamanhos: ['P', 'M', 'G'], cor: 'verde' },
    parecidos: [],
  }),
  produto({
    id: 'p-camiseta',
    nome: 'Camiseta dry-fit',
    categoria: 'roupas',
    precoCentavos: 7990,
    estoque: 12,
    loja: LOJAS.esportes,
    descricao: 'Camiseta de treino que seca rápido.',
    atributos: { tamanhos: ['P', 'M', 'G', 'GG'], cor: 'preto' },
    parecidos: [],
  }),
  produto({
    id: 'p-fone',
    nome: 'Fone sem fio Onda',
    categoria: 'eletronicos',
    precoCentavos: 29990,
    estoque: 0,
    loja: LOJAS.eletronicos,
    descricao: 'Fone com cancelamento de ruído e 30 h de bateria.',
    atributos: { cor: 'branco' },
    parecidos: [],
  }),
]

export function resumo({ id, nome, categoria, precoCentavos, estoque, foto, loja }: ProdutoMock): ProdutoResumo {
  return { id, nome, categoria, precoCentavos, estoque, foto, loja }
}

export function acharProduto(id: string) {
  return CATALOGO.find((p) => p.id === id)
}

/** Busca sem acento e sem diferença de maiúsculas, em nome, categoria, descrição e loja. */
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function combina(p: ProdutoMock, q: string) {
  const alvo = normalizar([p.nome, p.categoria, p.descricao, p.loja.nome].join(' '))
  return normalizar(q)
    .split(/\s+/)
    .filter((palavra) => palavra.length > 2)
    .some((palavra) => alvo.includes(palavra))
}

export function buscar(filtro: FiltroProdutos = {}): Lista<ProdutoResumo> {
  const { q, categoria, loja, precoMin, precoMax, pagina = 1, tamanho = 20 } = filtro
  const achados = CATALOGO.filter(
    (p) =>
      (!q || combina(p, q)) &&
      (!categoria || p.categoria === categoria) &&
      (!loja || p.loja.id === loja) &&
      (precoMin == null || p.precoCentavos >= precoMin) &&
      (precoMax == null || p.precoCentavos <= precoMax),
  )
  const inicio = (pagina - 1) * tamanho
  return { itens: achados.slice(inicio, inicio + tamanho).map(resumo), total: achados.length }
}

export function listarProdutos(filtro?: FiltroProdutos): Promise<Lista<ProdutoResumo>> {
  return responder(buscar(filtro))
}

export function obterProduto(id: string): Promise<ProdutoDetalhe> {
  const achado = acharProduto(id)
  if (!achado) return falhar(404, 'NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
  const { parecidos, ...detalhe } = achado
  const outrasLojas = parecidos.flatMap((idParecido) => {
    const outro = acharProduto(idParecido)
    return outro ? [resumo(outro)] : []
  })
  return responder({ ...detalhe, outrasLojas })
}
