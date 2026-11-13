// Chamadas à API usadas pelas telas: import { obterCarteira, useDados } from '../api'
// Cada recurso vem do mock ou da API conforme src/api/fonte.ts.
export { ErroApi, comoErroApi } from './cliente'
export { useDados, type EstadoDados } from './useDados'
export { entrar, sair, usuarioAtual } from './auth'
export { listarProdutos, obterProduto } from './produtos'
export { listarOfertas } from './ofertas'
export { listarFavoritos } from './favoritos'
export { criarReserva, pagarReserva } from './reservas'
