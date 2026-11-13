// As partes da barra das reservas, com as cores de estado de painel/graficos/cores.ts:
// retiradas em cerrado (deu certo), em aberto em line-strong (neutro), canceladas ou
// expiradas em perigo.
export const PARTES_DAS_RESERVAS = [
  { chave: 'retiradas', nome: 'Retiradas', cor: 'var(--cerrado)', classe: 'bg-cerrado' },
  { chave: 'emAberto', nome: 'Em aberto', cor: 'var(--line-strong)', classe: 'bg-line-strong' },
  { chave: 'perdidas', nome: 'Canceladas ou expiradas', cor: 'var(--perigo)', classe: 'bg-perigo' },
] as const
