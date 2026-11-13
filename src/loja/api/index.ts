// Tudo que as telas do painel precisam para falar com a API:
// import { buscarAtendimento, useConsulta, useAcao, ErroApi } from '../../api'
export { ErroApi, MOCKS_LIGADOS, paraErroApi, requisitar } from './http'
export * from './rotas'
export { apagarSessao, gravarSessao, lerSessao, useSessao, type Sessao } from './sessao'
export { useAcao } from './useAcao'
export { useConsulta, type Consulta } from './useConsulta'
