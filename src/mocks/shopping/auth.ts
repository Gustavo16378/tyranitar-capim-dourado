// POST /api/auth/login de mentira, só para o administrador, e a conferência do token nas
// rotas /api/shopping.
import type { PedidoLogin, RespostaLogin } from '../../tipos/shopping'
import { dadosInvalidos, erro, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { criarTokenFalso, exigirPerfil } from '../comum/token'
import { ADMIN, EMAIL_DO_ADMIN } from './dados'

export function entrar({ corpo }: PedidoMock): RespostaMock {
  const dados = objeto(corpo) as Partial<PedidoLogin> | null
  if (typeof dados?.email !== 'string' || typeof dados.senha !== 'string') {
    return dadosInvalidos('Informe o e-mail e a senha.')
  }
  // Mesma mensagem para e-mail desconhecido e senha errada, como a API real.
  if (dados.email.trim().toLowerCase() !== EMAIL_DO_ADMIN || dados.senha.length < 8) {
    return erro(401, 'NAO_AUTENTICADO', 'E-mail ou senha incorretos.')
  }
  const resposta: RespostaLogin = {
    token: criarTokenFalso({ sub: ADMIN.id, perfil: ADMIN.perfil, lojaId: null }),
    usuario: ADMIN,
  }
  return ok(resposta)
}

export function exigirAdmin(pedido: PedidoMock): RespostaMock | null {
  return exigirPerfil(pedido, 'ADMIN_SHOPPING', 'painel do shopping')
}
