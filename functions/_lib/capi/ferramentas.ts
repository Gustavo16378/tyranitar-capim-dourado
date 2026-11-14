// As cinco ferramentas da Capi: o que o Claude vê (definições) e o que o servidor faz no D1.
// O servidor valida tudo o que o modelo manda; erro de entrada volta como tool_result com is_error.
import type Anthropic from '@anthropic-ai/sdk'
import { buscarNoCatalogo, registrarResultado } from '../catalogo'
import { ErroApi } from '../erros'
import { formatarPreco, nomeDoPiso } from '../formatar'
import { acrescentarInteresses } from '../repo/fichas'
import { buscarLojaAtiva, lojasDaCategoria } from '../repo/lojas'
import { buscarProdutoAtivo, categoriasComProduto, listarProdutosAtivos, type ProdutoLinha } from '../repo/produtos'
import { criarReserva, type ReservaCriada } from '../repo/reservas'
import { lerEscolhas } from '../cliente/reservar'
import { CATEGORIAS_DO_SHOPPING, ehCategoria } from '../regras/categorias'
import type { Interesse } from '../regras/ficha'
import { lerJson, normalizar, termosDaBusca, textosDoJson } from '../texto'
import { clienteConfirmou } from './confirmacao'

export const FERRAMENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'buscar_produtos',
    description:
      'Busca produtos ativos nas lojas do shopping por texto, categoria, preço máximo e loja. Devolve até 8 produtos, ' +
      'os mais relevantes primeiro, com id, nome, preço, estoque, loja e piso. Use antes de falar de qualquer produto. ' +
      'Sem resultado, devolve as lojas da categoria informada (lojasDaCategoria), onde esse tipo de item costuma ser vendido.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'O que o cliente procura, em poucas palavras: "tênis de corrida preto 42".' },
        categoria: {
          type: 'string',
          description:
            'Categoria em minúsculas e sem acento, como "calcados", "roupas" ou "perfumaria". Informe quando souber: ' +
            'sem resultado, ela diz que lojas costumam vender esse tipo de item.',
        },
        preco_max_centavos: { type: 'integer', description: 'Preço máximo em centavos (R$ 400,00 = 40000).' },
        loja_id: { type: 'string', description: 'Id de uma loja, para buscar só nela.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'buscar_similares',
    description:
      'Lista candidatos da mesma categoria para comparar com um item que o cliente mostrou (foto, print ou link) ou ' +
      'descreveu. Os que combinam com cor, marca e estilo vêm primeiro; você escolhe os mais parecidos. Se a ' +
      'categoria não tiver produto, devolve as lojas dela (lojasDaCategoria).',
    input_schema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', description: 'Categoria em minúsculas e sem acento, como "calcados".' },
        descricao: { type: 'string', description: 'O que o item é, em poucas palavras: "tênis de corrida".' },
        cor: { type: 'string' },
        marca: { type: 'string' },
        estilo: { type: 'string', description: 'Estilo ou uso: "esportivo", "social", "casual".' },
      },
      required: ['categoria', 'descricao'],
      additionalProperties: false,
    },
  },
  {
    name: 'reservar',
    description:
      'Reserva um produto para o cliente retirar na loja. Só use depois que o cliente confirmar, na conversa, o ' +
      'produto e a forma de pagamento. A loja confirma a reserva e avisa no app a partir de que horas fica pronta; ' +
      'daí, PIX (pago agora) fica separado por 48 horas e NA_LOJA (paga na retirada), por 4 horas.',
    input_schema: {
      type: 'object',
      properties: {
        produto_id: { type: 'string' },
        forma_pagamento: { type: 'string', enum: ['PIX', 'NA_LOJA'] },
        quantidade: { type: 'integer', minimum: 1, maximum: 5, description: 'Padrão 1.' },
        tamanho: {
          type: 'string',
          description: 'O tamanho ou o número que o cliente disse ("42", "M"), se o produto tiver. Sem ele, a loja combina no balcão.',
        },
      },
      required: ['produto_id', 'forma_pagamento'],
      additionalProperties: false,
    },
  },
  {
    name: 'rota_na_loja',
    description:
      'Mostra no mapa do app o caminho até a loja de um produto, ou até uma loja. Devolve o nome da loja, o piso e o ' +
      'id no mapa. Informe produto_id ou loja_id.',
    input_schema: {
      type: 'object',
      properties: {
        produto_id: { type: 'string' },
        loja_id: { type: 'string', description: 'O lojaId de um produto ou de uma das lojasDaCategoria.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'gerar_ficha',
    description:
      'Guarda preferências duradouras do cliente (número, tamanho, cor, faixa de preço, estilo), em frases curtas ' +
      'por categoria, para as lojas atenderem melhor. Só grava se o cliente autorizou no app.',
    input_schema: {
      type: 'object',
      properties: {
        interesses: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              categoria: { type: 'string', description: 'Em minúsculas e sem acento: "calcados".' },
              detalhe: { type: 'string', description: 'Frase curta: "Tênis de corrida, número 42, até R$ 400".' },
            },
            required: ['categoria', 'detalhe'],
            additionalProperties: false,
          },
        },
      },
      required: ['interesses'],
      additionalProperties: false,
    },
  },
]

export type Acao =
  | { tipo: 'RESERVAR'; produtoId: string }
  | { tipo: 'ROTA'; lojaId: string; mapaId: string; piso: number }
  | { tipo: 'RESERVA_CRIADA'; reserva: ReservaCriada }

export interface ContextoDasFerramentas {
  db: D1Database
  clienteId: string
  /** A mensagem do cliente desta vez: a reserva só sai se ela for uma confirmação. */
  mensagemDoCliente: string
  agora: Date
  /** Reservas já criadas nesta mensagem (no máximo uma). */
  reservasFeitas: number
}

export interface ResultadoDaFerramenta {
  /** Vai para o modelo como JSON no tool_result. */
  conteudo: unknown
  erro?: boolean
  /** Produtos que o modelo viu; só estes podem virar cartão (RN14). */
  produtos?: ProdutoLinha[]
  /** true quando os produtos vêm de uma busca por relevância (podem aparecer mesmo sem citação). */
  relevantes?: boolean
  acao?: Acao
}

class EntradaInvalida extends Error {}

function texto(entrada: Record<string, unknown>, campo: string, { obrigatorio = false, max = 200 } = {}) {
  const valor = entrada[campo]
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) throw new EntradaInvalida(`falta ${campo}`)
    return undefined
  }
  if (typeof valor !== 'string' || valor.length > max) throw new EntradaInvalida(`${campo} precisa ser um texto de até ${max} caracteres`)
  return valor.trim()
}

function inteiro(entrada: Record<string, unknown>, campo: string, min: number, max: number) {
  const valor = entrada[campo]
  if (valor === undefined || valor === null) return undefined
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < min || valor > max) {
    throw new EntradaInvalida(`${campo} precisa ser um inteiro de ${min} a ${max}`)
  }
  return valor
}

/** Produto como o modelo vê: o id para citar e o que ele precisa para falar dele. */
export function paraOModelo(p: ProdutoLinha) {
  return {
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    preco: formatarPreco(p.preco_centavos),
    estoque: p.estoque,
    loja: p.loja_nome,
    lojaId: p.loja_id,
    piso: nomeDoPiso(p.loja_piso),
    descricao: p.descricao,
    atributos: lerJson<Record<string, unknown>>(p.atributos, {}),
  }
}

/**
 * Resultado sem produto. Com a categoria do item, leva as lojas ativas dela (lojasDaCategoria):
 * a Capi diz onde esse tipo de item costuma ser vendido e oferece a rota, sem afirmar que elas têm
 * o item (RN14: o catálogo não mostra). Sem categoria, pede para buscar de novo com ela.
 */
async function nadaEncontrado(db: D1Database, aviso: string, categoria?: string) {
  const resultado = { produtos: [], aviso, categoriasDisponiveis: await categoriasComProduto(db) }
  if (!categoria) {
    return { ...resultado, aviso: `${aviso} Busque de novo com a categoria do item para eu dizer que lojas costumam vender esse tipo de produto.` }
  }
  if (!ehCategoria(categoria)) {
    const todas = CATEGORIAS_DO_SHOPPING.map((c) => c.id).join(', ')
    return { ...resultado, aviso: `${aviso} "${categoria}" não é uma categoria do shopping; as categorias são: ${todas}.` }
  }
  const lojas = await lojasDaCategoria(db, categoria)
  if (!lojas.length) return { ...resultado, aviso: `${aviso} Nenhuma loja do shopping é da categoria "${categoria}".` }
  return {
    ...resultado,
    aviso:
      `${aviso} As lojasDaCategoria são lojas do shopping da categoria "${categoria}": costumam vender esse tipo de ` +
      'produto, mas o catálogo do app não mostra o item nelas. Não diga que elas têm o item, nem preço ou estoque.',
    lojasDaCategoria: lojas.map((l) => ({ lojaId: l.id, nome: l.nome, piso: nomeDoPiso(l.piso), mapaId: l.mapa_id })),
  }
}

const executores: Record<string, (entrada: Record<string, unknown>, ctx: ContextoDasFerramentas) => Promise<ResultadoDaFerramenta>> = {
  async buscar_produtos(entrada, ctx) {
    const filtros = {
      texto: texto(entrada, 'texto'),
      categoria: texto(entrada, 'categoria', { max: 40 })?.toLowerCase(),
      precoMax: inteiro(entrada, 'preco_max_centavos', 1, 100_000_000),
      lojaId: texto(entrada, 'loja_id', { max: 64 }),
    }
    const encontrados = (await buscarNoCatalogo(ctx.db, filtros)).slice(0, 8)
    if (filtros.texto || filtros.categoria) {
      await registrarResultado(ctx.db, {
        clienteId: ctx.clienteId,
        termo: filtros.texto ?? filtros.categoria ?? '',
        categoria: filtros.categoria,
        encontrados,
      })
    }
    if (!encontrados.length) {
      return { conteudo: await nadaEncontrado(ctx.db, 'Nenhum produto ativo com esses filtros.', filtros.categoria) }
    }
    return { conteudo: { produtos: encontrados.map(paraOModelo) }, produtos: encontrados, relevantes: true }
  },

  async buscar_similares(entrada, ctx) {
    const categoria = texto(entrada, 'categoria', { obrigatorio: true, max: 40 })!.toLowerCase()
    const descricao = texto(entrada, 'descricao', { obrigatorio: true })!
    const detalhes = ['cor', 'marca', 'estilo'].map((c) => texto(entrada, c, { max: 60 })).filter(Boolean) as string[]
    const termos = termosDaBusca([descricao, ...detalhes].join(' '))
    // Ordena pelos termos que batem (sem exigir todos): o modelo decide o que é parecido.
    const candidatos = (await listarProdutosAtivos(ctx.db, { categoria }))
      .map((p) => {
        const alvo = normalizar([p.nome, p.descricao, ...textosDoJson(lerJson(p.atributos, {}))].join(' '))
        return { p, nota: termos.filter((t) => alvo.includes(t)).length }
      })
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 12)
      .map(({ p }) => p)
    await registrarResultado(ctx.db, {
      clienteId: ctx.clienteId,
      termo: [descricao, ...detalhes].join(' '),
      categoria,
      encontrados: candidatos,
    })
    if (!candidatos.length) {
      return { conteudo: await nadaEncontrado(ctx.db, `Não há produtos ativos na categoria "${categoria}".`, categoria) }
    }
    return { conteudo: { candidatos: candidatos.map(paraOModelo) }, produtos: candidatos }
  },

  async reservar(entrada, ctx) {
    const produtoId = texto(entrada, 'produto_id', { obrigatorio: true, max: 64 })!
    const forma = entrada.forma_pagamento
    if (forma !== 'PIX' && forma !== 'NA_LOJA') throw new EntradaInvalida('forma_pagamento é PIX ou NA_LOJA')
    const quantidade = inteiro(entrada, 'quantidade', 1, 5) ?? 1
    if (!clienteConfirmou(ctx.mensagemDoCliente)) {
      return {
        erro: true,
        conteudo: { erro: 'O cliente ainda não confirmou. Confirme o produto e a forma de pagamento com ele antes de reservar.' },
      }
    }
    if (ctx.reservasFeitas > 0) {
      return { erro: true, conteudo: { erro: 'Já fiz uma reserva nesta mensagem. Para outra, confirme de novo com o cliente.' } }
    }
    try {
      const produto = await buscarProdutoAtivo(ctx.db, produtoId)
      const { tamanho, cor } = produto ? lerEscolhas(produto, entrada.tamanho, undefined) : { tamanho: null, cor: null }
      const reserva = await criarReserva(ctx.db, {
        clienteId: ctx.clienteId,
        produtoId,
        quantidade,
        formaPagamento: forma,
        tamanho,
        cor,
        agora: ctx.agora,
      })
      ctx.reservasFeitas++
      return {
        conteudo: {
          reservada: true,
          reservaId: reserva.id,
          formaPagamento: reserva.formaPagamento,
          expiraEm: reserva.expiraEm,
          observacao:
            (forma === 'PIX' ? 'O app abre o Pix para o cliente pagar. ' : 'O cliente paga na retirada. ') +
            'A loja confirma e avisa no app a partir de que horas fica pronto.',
        },
        acao: { tipo: 'RESERVA_CRIADA', reserva },
      }
    } catch (erro) {
      if (erro instanceof ErroApi) return { erro: true, conteudo: { erro: erro.codigo, mensagem: erro.message } }
      throw erro
    }
  },

  async rota_na_loja(entrada, ctx) {
    const produtoId = texto(entrada, 'produto_id', { max: 64 })
    const lojaId = texto(entrada, 'loja_id', { max: 64 })
    let loja: { id: string; nome: string; piso: number; mapaId: string } | null = null
    if (produtoId) {
      const p = await buscarProdutoAtivo(ctx.db, produtoId)
      if (p) loja = { id: p.loja_id, nome: p.loja_nome, piso: p.loja_piso, mapaId: p.loja_mapa_id }
    } else if (lojaId) {
      const l = await buscarLojaAtiva(ctx.db, lojaId)
      if (l) loja = { id: l.id, nome: l.nome, piso: l.piso, mapaId: l.mapa_id }
    } else {
      throw new EntradaInvalida('informe produto_id ou loja_id')
    }
    if (!loja) return { erro: true, conteudo: { erro: 'Não achei essa loja ou produto.' } }
    return {
      conteudo: { loja: loja.nome, piso: nomeDoPiso(loja.piso), mapaId: loja.mapaId, mostradoNoMapa: true },
      acao: { tipo: 'ROTA', lojaId: loja.id, mapaId: loja.mapaId, piso: loja.piso },
    }
  },

  async gerar_ficha(entrada, ctx) {
    const lista = entrada.interesses
    if (!Array.isArray(lista) || lista.length < 1 || lista.length > 5) throw new EntradaInvalida('interesses: de 1 a 5 itens')
    const interesses: Interesse[] = lista.map((item) => {
      if (!item || typeof item !== 'object') throw new EntradaInvalida('cada interesse tem categoria e detalhe')
      const i = item as Record<string, unknown>
      return {
        categoria: texto(i, 'categoria', { obrigatorio: true, max: 40 })!.toLowerCase(),
        detalhe: texto(i, 'detalhe', { obrigatorio: true, max: 120 })!,
      }
    })
    const salvo = await acrescentarInteresses(ctx.db, ctx.clienteId, interesses)
    return { conteudo: { salvo } }
  },
}

/** Executa uma ferramenta pedida pelo modelo. Nunca lança por entrada ruim: devolve erro para o modelo corrigir. */
export async function executarFerramenta(
  nome: string,
  entrada: unknown,
  ctx: ContextoDasFerramentas,
): Promise<ResultadoDaFerramenta> {
  const executor = executores[nome]
  if (!executor) return { erro: true, conteudo: { erro: `Ferramenta desconhecida: ${nome}` } }
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { erro: true, conteudo: { erro: 'Parâmetros inválidos: envie um objeto.' } }
  }
  try {
    return await executor(entrada as Record<string, unknown>, ctx)
  } catch (erro) {
    if (erro instanceof EntradaInvalida) return { erro: true, conteudo: { erro: `Parâmetros inválidos: ${erro.message}.` } }
    throw erro
  }
}
