// Endereços das telas do app que várias telas abrem.

/** A página da loja no app. /loja/* é o painel do lojista: por isso o plural. */
export const caminhoDaLoja = (lojaId: string) => `/lojas/${encodeURIComponent(lojaId)}`

export const caminhoDoProduto = (produtoId: string) => `/produto/${encodeURIComponent(produtoId)}`

/** "Como chegar": o mapa com a rota até a loja. */
export const caminhoAteALoja = (mapaId: string) => `/mapa?loja=${encodeURIComponent(mapaId)}`

/** Salvos para provar: os produtos com o coração, por loja. */
export const CAMINHO_DOS_SALVOS = '/salvos'

/** A lista inteira de Minhas compras (a Carteira mostra as últimas). */
export const CAMINHO_DAS_COMPRAS = '/carteira/compras'
