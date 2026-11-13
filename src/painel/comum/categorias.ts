// As categorias de loja e de produto do shopping, com o nome que aparece na tela. A busca, a
// ficha, os cupons e a demanda usam o mesmo id. O cadastro de produto da loja usa as quatro
// primeiras, com atributos (src/loja/telas/produtos/categorias.ts).

export interface CategoriaDoShopping {
  id: string
  rotulo: string
}

export const CATEGORIAS_DO_SHOPPING: readonly CategoriaDoShopping[] = [
  { id: 'calcados', rotulo: 'Calçados' },
  { id: 'roupas', rotulo: 'Roupas' },
  { id: 'acessorios', rotulo: 'Acessórios' },
  { id: 'perfumaria', rotulo: 'Perfumaria' },
  { id: 'eletronicos', rotulo: 'Eletrônicos' },
  { id: 'infantil', rotulo: 'Bebê e brinquedos' },
  { id: 'alimentacao', rotulo: 'Alimentação' },
  { id: 'pet', rotulo: 'Pet shop' },
  { id: 'casa', rotulo: 'Casa e decoração' },
  { id: 'otica', rotulo: 'Ótica' },
  { id: 'livraria', rotulo: 'Livraria e papelaria' },
  { id: 'esportes', rotulo: 'Artigos esportivos' },
  { id: 'joias', rotulo: 'Joias e relógios' },
  { id: 'beleza', rotulo: 'Beleza e saúde' },
  { id: 'lazer', rotulo: 'Lazer e entretenimento' },
  { id: 'servicos', rotulo: 'Serviços' },
]

/** O nome de uma categoria: 'infantil' → 'Bebê e brinquedos'. Id desconhecido volta como veio. */
export function rotuloDaCategoria(id: string) {
  return CATEGORIAS_DO_SHOPPING.find((c) => c.id === id)?.rotulo ?? id
}
