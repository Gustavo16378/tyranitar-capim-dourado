// As partes da barra das reservas, com as cores de estado de painel/graficos/cores.ts:
// retiradas em cerrado (deu certo), em aberto em line-strong (neutro), recusadas pela loja em ink
// (a loja disse não: firme, sem ser alerta) e canceladas ou expiradas em perigo.
//
// Validadas com o validate_palette.js da skill de dataviz, nos dois temas, na ordem da barra
// (pares vizinhos), contra surface-raised:
// - Claro (cerrado, line-strong, ink, perigo): daltonismo ΔE 13,2 no pior par; visão normal 17,9.
// - Escuro: daltonismo ΔE 15,5 no pior par (ink e perigo); visão normal 18,0.
// - Contraste com a superfície: todas acima de 3:1. O ouro, o marrom e o aviso-ink ficaram
//   parecidos demais com o perigo para quem tem daltonismo (ΔE 2 a 5); o terra some no escuro.
// Como no resto do painel, ficam fora das checagens de faixa de luz e croma, que são de paleta
// categórica: aqui é estado, com o nome na legenda e na tabela. O texto dentro dos blocos é
// surface-raised, que contrasta com o ink nos dois temas.
export const PARTES_DAS_RESERVAS = [
  { chave: 'retiradas', nome: 'Retiradas', cor: 'var(--cerrado)', classe: 'bg-cerrado' },
  { chave: 'emAberto', nome: 'Em aberto', cor: 'var(--line-strong)', classe: 'bg-line-strong' },
  { chave: 'recusadas', nome: 'Recusadas pela loja', cor: 'var(--ink)', classe: 'bg-ink' },
  { chave: 'perdidas', nome: 'Canceladas ou expiradas', cor: 'var(--perigo)', classe: 'bg-perigo' },
] as const
