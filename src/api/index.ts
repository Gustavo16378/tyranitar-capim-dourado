// Chamadas à API usadas pelas telas: import { obterCarteira, useDados } from '../api'
// Cada recurso vem do mock ou da API conforme src/api/fonte.ts.
export { ErroApi, comoErroApi } from './cliente'
export { useDados, type EstadoDados } from './useDados'
export { cadastrar, contasDeDemonstracao, entrar, entrarComDemo, sair, usuarioAtual } from './auth'
export { useSessao } from './sessao'
export { listarProdutos, obterProduto } from './produtos'
export { listarOfertas } from './ofertas'
export { listarFavoritos, salvarFavorito, tirarFavorito } from './favoritos'
export { listarLojas, obterLoja } from './lojas'
export { listarCompras } from './compras'
export { cancelarReserva, criarReserva, obterReserva, opcoesDaReserva, pagarReserva } from './reservas'
export { assinarAvisos, atualizarAvisos, avisosAtuais, esquecerAvisos, marcarAvisosComoLidos } from './avisos'
export { obterCarteira } from './carteira'
export {
  apagarInteresse,
  excluirConta,
  mudarConsentimento,
  mudarNome,
  obterConta,
  obterFicha,
  obterMeusDados,
  trocarSenha,
} from './conta'
export { apagarConversa, enviarMensagem, obterConversa, PERGUNTA_DEMO } from './chat'
export { IMAGEM_MAXIMA_BYTES, tamanhoDoBase64, TEXTO_MAXIMO, TIPOS_DE_IMAGEM } from './limites'
export { linkValido, separarLink, termosDoLink } from './link'
