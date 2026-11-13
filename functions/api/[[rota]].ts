// Qualquer /api que não tenha rota própria: 404 no formato da API (e não a página do app).
import type { Rota } from '../_lib/contexto'
import { ErroApi } from '../_lib/erros'

export const onRequest: Rota = () => {
  throw new ErroApi('NAO_ENCONTRADO', 'Essa rota não existe na API.')
}
