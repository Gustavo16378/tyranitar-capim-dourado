// Tudo que as telas do painel da loja precisam para falar com a API:
// import { buscarAtendimento, useConsulta, useAcao, ErroApi } from '../../api'
export { ErroApi, paraErroApi } from '../../painel/api/http'
export { useAcao } from '../../painel/api/useAcao'
export { useConsulta, type Consulta } from '../../painel/api/useConsulta'
export { MOCKS_LIGADOS, requisitar, sessao } from './cliente'
export * from './rotas'
