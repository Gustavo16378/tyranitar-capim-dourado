// As categorias de loja e de produto do shopping. A busca, a ficha (RN04), os cupons, a
// demanda e as vagas usam o mesmo id. O front tem a mesma lista com os mesmos nomes
// (src/painel/comum/categorias.ts); tests/unidade/shopping-vagas.test.ts confere que batem.

export const CATEGORIAS_DO_SHOPPING = [
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
] as const

export type Categoria = (typeof CATEGORIAS_DO_SHOPPING)[number]['id']

export function ehCategoria(id: unknown): id is Categoria {
  return CATEGORIAS_DO_SHOPPING.some((c) => c.id === id)
}

/** 'infantil' → 'Bebê e brinquedos'. Id desconhecido volta como veio. */
export function rotuloDaCategoria(id: string) {
  return CATEGORIAS_DO_SHOPPING.find((c) => c.id === id)?.rotulo ?? id
}
