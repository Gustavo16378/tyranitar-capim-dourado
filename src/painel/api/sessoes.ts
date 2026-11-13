// As sessões dos dois painéis, num lugar só. O login é um só (/entrar, src/app/Entrar.tsx): ele
// grava a sessão do perfil do token aqui, e cada painel lê a sua (src/<painel>/api/cliente.ts).
// O cliente fica na sessão do app (src/api/sessao.ts). Separadas, dá para ter o app numa aba,
// o painel da loja em outra e o do shopping numa terceira.
import { criarSessao } from './sessao'

export const sessaoDaLoja = criarSessao('loja.sessao')
export const sessaoDoShopping = criarSessao('shopping.sessao')
