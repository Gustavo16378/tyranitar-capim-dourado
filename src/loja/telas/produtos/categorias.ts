// As categorias que o painel oferece no cadastro e os atributos de cada uma (RF21). A API
// ainda não tem uma rota com essa lista; quando tiver, troque esta constante pela consulta.
// Os atributos seguem o formato de docs/banco.md: { numeracao: [40, 41], cor: 'preto' }.

export type TipoDeAtributo = 'texto' | 'numero' | 'lista' | 'lista-numeros'

export interface CampoDeAtributo {
  chave: string
  rotulo: string
  tipo: TipoDeAtributo
  dica?: string
}

export interface Categoria {
  id: string
  rotulo: string
  atributos: readonly CampoDeAtributo[]
}

const COR: CampoDeAtributo = { chave: 'cor', rotulo: 'Cor', tipo: 'texto' }

export const CATEGORIAS: readonly Categoria[] = [
  {
    id: 'calcados',
    rotulo: 'Calçados',
    atributos: [{ chave: 'numeracao', rotulo: 'Numeração', tipo: 'lista-numeros', dica: 'Separe por vírgula: 38, 39, 40' }, COR],
  },
  {
    id: 'roupas',
    rotulo: 'Roupas',
    atributos: [{ chave: 'tamanhos', rotulo: 'Tamanhos', tipo: 'lista', dica: 'Separe por vírgula: P, M, G' }, COR],
  },
  {
    id: 'acessorios',
    rotulo: 'Acessórios',
    atributos: [COR, { chave: 'material', rotulo: 'Material', tipo: 'texto' }],
  },
  {
    id: 'perfumaria',
    rotulo: 'Perfumaria',
    atributos: [
      { chave: 'ml', rotulo: 'Volume em ml', tipo: 'numero' },
      { chave: 'familia', rotulo: 'Família olfativa', tipo: 'texto', dica: 'amadeirado, floral, cítrico' },
    ],
  },
]

export function categoria(id: string) {
  return CATEGORIAS.find((c) => c.id === id)
}

export function rotuloDaCategoria(id: string) {
  return categoria(id)?.rotulo ?? id
}

/** Os atributos como o formulário mostra: listas viram "38, 39, 40". */
export function atributosParaTexto(atributos: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(atributos).map(([chave, valor]) => [chave, Array.isArray(valor) ? valor.join(', ') : String(valor)]),
  )
}

/**
 * O que foi digitado vira o JSON da API, conforme o tipo de cada campo da categoria.
 * Campos vazios ficam de fora. Devolve o erro do primeiro campo que não deu para ler.
 */
export function textoParaAtributos(
  campos: readonly CampoDeAtributo[],
  texto: Record<string, string>,
): { atributos: Record<string, unknown> } | { erro: string; chave: string } {
  const atributos: Record<string, unknown> = {}
  for (const campo of campos) {
    const valor = (texto[campo.chave] ?? '').trim()
    if (!valor) continue
    if (campo.tipo === 'texto') atributos[campo.chave] = valor
    else if (campo.tipo === 'numero') {
      const numero = Number(valor.replace(',', '.'))
      if (!Number.isFinite(numero) || numero <= 0) return { erro: `${campo.rotulo}: use um número, como 100.`, chave: campo.chave }
      atributos[campo.chave] = numero
    } else {
      const itens = valor.split(',').map((item) => item.trim()).filter(Boolean)
      if (campo.tipo === 'lista') atributos[campo.chave] = itens
      else {
        const numeros = itens.map(Number)
        if (numeros.some((n) => !Number.isInteger(n) || n <= 0)) {
          return { erro: `${campo.rotulo}: use números separados por vírgula, como 38, 39, 40.`, chave: campo.chave }
        }
        atributos[campo.chave] = numeros
      }
    }
  }
  return { atributos }
}

/** Uma linha com os atributos, para a lista: "38, 39, 40 · preto". */
export function resumoDosAtributos(atributos: Record<string, unknown>) {
  return Object.values(atributosParaTexto(atributos)).filter(Boolean).join(' · ')
}
