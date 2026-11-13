// Cores dos gráficos dos painéis, só de tokens (var(--...) troca sozinho no tema escuro).
// Validadas com o validate_palette.js da skill de dataviz, nos dois temas:
//
// - Série única: ouro. Contraste abaixo de 3:1 no tema claro (2,85), por isso cada barra
//   leva o valor escrito na ponta e todo gráfico tem a tabela ao lado.
// - Destaque contra contexto (uma parte é o assunto, o resto é fundo): ouro contra line,
//   o neutro claro. Separam bem nos dois temas (ΔE 22,7 no claro, 45,8 no escuro); line-strong
//   ficaria parecido demais com o ouro no tema claro (10,4). O contexto fica discreto de
//   propósito, então toda barra leva o número escrito.
// - Estados (retirada, em aberto, perdida): cerrado, line-strong e perigo. Passam na
//   separação para daltonismo (ΔE 9,9 no pior par) e na visão normal (17,9). Ficam fora das
//   checagens de faixa de luz e croma, que são de paleta categórica: aqui é estado, com nome
//   na legenda e na tabela.

export const COR_DA_SERIE = 'var(--ouro)'
export const COR_DA_SERIE_EM_DESTAQUE = 'var(--ouro-ink)'

/** O que não é o assunto do gráfico, ao lado do destaque. */
export const COR_DE_CONTEXTO = 'var(--line)'

/** Texto escrito dentro de blocos coloridos: contrasta com os blocos nos dois temas. */
export const TEXTO_NO_BLOCO = 'var(--surface-raised)'

/** O espaço de 2 px entre blocos é a própria superfície do cartão. */
export const SUPERFICIE = 'var(--surface-raised)'
