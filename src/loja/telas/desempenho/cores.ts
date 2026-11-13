// Cores dos gráficos do Desempenho, só de tokens (var(--...) troca sozinho no tema escuro).
// Validadas com o validate_palette.js da skill de dataviz, nos dois temas:
//
// - Rankings (série única): ouro. Contraste abaixo de 3:1 no tema claro (2,85), por isso
//   cada barra leva o valor escrito na ponta e o gráfico tem a tabela ao lado.
// - Reservas (estado de cada reserva): retiradas em cerrado (deu certo), em aberto em
//   line-strong (neutro), canceladas ou expiradas em perigo. Passa na separação para
//   daltonismo (ΔE 9,9 no pior par) e na visão normal (17,9), com 3:1 sobre a superfície.
//   Ficam fora das checagens de faixa de luz e croma, que são de paleta categórica: aqui é
//   estado, com nome na legenda e na tabela.

export const COR_DA_SERIE = 'var(--ouro)'
export const COR_DA_SERIE_EM_DESTAQUE = 'var(--ouro-ink)'

/** Texto escrito dentro dos blocos coloridos: contrasta com os três nos dois temas. */
export const TEXTO_NO_BLOCO = 'var(--surface-raised)'

/** O espaço de 2 px entre blocos é a própria superfície do cartão. */
export const SUPERFICIE = 'var(--surface-raised)'

export const PARTES_DAS_RESERVAS = [
  { chave: 'retiradas', nome: 'Retiradas', cor: 'var(--cerrado)', classe: 'bg-cerrado' },
  { chave: 'emAberto', nome: 'Em aberto', cor: 'var(--line-strong)', classe: 'bg-line-strong' },
  { chave: 'perdidas', nome: 'Canceladas ou expiradas', cor: 'var(--perigo)', classe: 'bg-perigo' },
] as const
