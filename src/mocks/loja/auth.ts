// POST /api/auth/login de mentira, só para lojista, e a conferência do token nas rotas /api/loja.
import type { PedidoLogin, RespostaLogin } from '../../tipos/loja'
import { dadosInvalidos, erro, objeto, ok, type PedidoMock, type RespostaMock } from '../comum/resposta'
import { criarTokenFalso, exigirPerfil } from '../comum/token'
import { EMAIL_DO_LOJISTA, LOJISTA } from './dados'

export function entrar({ corpo }: PedidoMock): RespostaMock {
  const dados = objeto(corpo) as Partial<PedidoLogin> | null
  if (typeof dados?.email !== 'string' || typeof dados.senha !== 'string') {
    return dadosInvalidos('Informe o e-mail e a senha.')
  }
  // Mesma mensagem para e-mail desconhecido e senha errada, como a API real.
  if (!EMAIL_DO_LOJISTA.test(dados.email.trim().toLowerCase()) || dados.senha.length < 8) {
    return erro(401, 'NAO_AUTENTICADO', 'E-mail ou senha incorretos.')
  }
  const resposta: RespostaLogin = {
    token: criarTokenFalso({ sub: LOJISTA.id, perfil: LOJISTA.perfil, lojaId: LOJISTA.lojaId }),
    usuario: LOJISTA,
  }
  return ok(resposta)
}

export function exigirLojista(pedido: PedidoMock): RespostaMock | null {
  return exigirPerfil(pedido, 'LOJISTA', 'painel da loja')
}
