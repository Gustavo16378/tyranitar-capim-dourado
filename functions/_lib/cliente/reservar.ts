// O que o cliente escolhe ao reservar (RF08, RF09, RN15): o tamanho e a cor, das opções do produto,
// e um dos cupons dele que valem para aquele produto. O preço da reserva (e o do Pix) já sai com o
// desconto, e o cupom fica preso à reserva até a retirada.
import { ErroApi } from '../erros'
import { cuponsVigentesNaLoja, paraRegra, paraVisibilidade, usosDoCliente } from '../repo/cupons'
import { nivelDoCliente } from '../repo/fidelidade'
import { categoriasDaFicha } from '../repo/fichas'
import type { ProdutoLinha } from '../repo/produtos'
import { aplicarCupons, clienteVeCupom, itemAceitaCupom, paraQueVale } from '../regras/cupons'
import { dataEmPalmas } from '../regras/datas'
import { lerJson } from '../texto'

/** Os tamanhos (ou a numeração) e as cores do produto, dos atributos dele. */
export function opcoesDoProduto(produto: Pick<ProdutoLinha, 'atributos'>) {
  const atributos = lerJson<Record<string, unknown>>(produto.atributos, {})
  const lista = (valor: unknown) =>
    (Array.isArray(valor) ? valor : typeof valor === 'string' || typeof valor === 'number' ? [valor] : []).map(String)
  return { tamanhos: lista(atributos.numeracao ?? atributos.tamanhos ?? atributos.tamanho), cores: lista(atributos.cor ?? atributos.cores) }
}

/**
 * O tamanho e a cor da reserva. Tamanho fora das opções: 400 (sem ele, o balcão combina). A cor
 * única do produto entra sozinha; com várias, a escolhida precisa ser uma delas.
 */
export function lerEscolhas(produto: Pick<ProdutoLinha, 'atributos'>, tamanho: unknown, cor: unknown) {
  const opcoes = opcoesDoProduto(produto)
  const escolhido = (valor: unknown, entre: string[], nome: string) => {
    if (valor === undefined || valor === null || valor === '') return entre.length === 1 ? entre[0] : null
    const texto = String(valor).trim()
    if (entre.length && !entre.includes(texto)) {
      throw new ErroApi('DADOS_INVALIDOS', `Esse ${nome} não existe para este produto. Escolha entre: ${entre.join(', ')}.`)
    }
    return texto.slice(0, 20)
  }
  return { tamanho: escolhido(tamanho, opcoes.tamanhos, 'tamanho'), cor: escolhido(cor, opcoes.cores, 'cor') }
}

export interface CupomParaOProduto {
  id: string
  titulo: string
  origem: 'LOJA' | 'SHOPPING'
  /** A loja do cupom; null no voucher do shopping. */
  loja: string | null
  /** A categoria em que ele desconta ("Calçados"); null: a loja toda, ou qualquer loja. */
  categoria: string | null
  descontoCentavos: number
}

/**
 * Os cupons do cliente que valem para o produto agora: os da loja dele (sem categoria, ou da
 * categoria do produto) e os vouchers do shopping, no nível do cliente, dentro do limite (o cupom
 * preso noutra reserva conta como usado) e na validade. Brinde não entra (não desconta). Cada um
 * vem com o desconto que daria na reserva desta quantidade.
 */
export async function cuponsParaOProduto(
  db: D1Database,
  clienteId: string,
  produto: Pick<ProdutoLinha, 'loja_id' | 'categoria' | 'preco_centavos'>,
  quantidade = 1,
  agora = new Date(),
): Promise<CupomParaOProduto[]> {
  const [vigentes, usos, { nivel }, ficha] = await Promise.all([
    cuponsVigentesNaLoja(db, produto.loja_id, dataEmPalmas(agora)),
    usosDoCliente(db, clienteId),
    nivelDoCliente(db, clienteId, agora),
    categoriasDaFicha(db, clienteId),
  ])
  // Quem reserva um produto tem interesse na categoria dele, mesmo sem ela na ficha.
  const categorias = [...ficha, produto.categoria]
  const ctx = { lojaId: produto.loja_id, nivelCliente: nivel, usosDoCliente: usos, agora }
  const total = produto.preco_centavos * quantidade
  return vigentes
    .filter((c) => c.tipo !== 'BRINDE' && clienteVeCupom(paraVisibilidade(c), { nivel, usos, categorias }))
    .filter((c) => itemAceitaCupom({ categoria: produto.categoria }, paraRegra(c)))
    .flatMap((c) => {
      try {
        const [desconto] = aplicarCupons(total, [paraRegra(c)], ctx, produto.categoria).descontos
        return desconto.centavos > 0
          ? [
              {
                id: c.id,
                titulo: c.titulo,
                origem: c.loja_id === null ? ('SHOPPING' as const) : ('LOJA' as const),
                loja: c.loja_id === null ? null : c.loja_nome,
                categoria: paraQueVale(paraRegra(c)),
                descontoCentavos: desconto.centavos,
              },
            ]
          : []
      } catch {
        return []
      }
    })
}

/** O cupom escolhido ao reservar, conferido: precisa ser um dos que valem para o produto. */
export async function cupomDaReserva(
  db: D1Database,
  clienteId: string,
  produto: Pick<ProdutoLinha, 'loja_id' | 'categoria' | 'preco_centavos'>,
  quantidade: number,
  cupomId: unknown,
  agora = new Date(),
) {
  if (cupomId === undefined || cupomId === null || cupomId === '') return null
  if (typeof cupomId !== 'string') throw new ErroApi('DADOS_INVALIDOS', 'O cupom veio em formato errado.')
  const valem = await cuponsParaOProduto(db, clienteId, produto, quantidade, agora)
  const escolhido = valem.find((c) => c.id === cupomId)
  if (!escolhido) throw new ErroApi('CUPOM_INVALIDO', 'Esse cupom não vale para este produto agora. Escolha outro ou reserve sem cupom.')
  return { id: escolhido.id, descontoCentavos: escolhido.descontoCentavos }
}
