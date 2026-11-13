// O painel da loja, montado em /loja/* pelo App (carregado sob demanda: quem abre o app do
// cliente não baixa o painel). Login, guarda de perfil, barra lateral e rotas vêm do
// RotasDoPainel; aqui fica só o que é da loja.
import { RotasDoPainel } from '../painel/RotasDoPainel'
import type { ConfigDoPainel } from '../painel/painel'
import { entrar, MOCKS_LIGADOS, sessao } from './api'
import { BASE_DA_LOJA } from './enderecos'
import { TELAS_DA_LOJA } from './navegacao'

const PAINEL_DA_LOJA: ConfigDoPainel = {
  nome: 'Painel da loja',
  base: BASE_DA_LOJA,
  perfil: 'LOJISTA',
  telas: TELAS_DA_LOJA,
  sessao,
  entrar,
  mocksLigados: MOCKS_LIGADOS,
  chamadaDoLogin: 'Entre com o e-mail e a senha da sua loja.',
  dicaComMocks: (
    <>
      Com os dados de exemplo, entre com qualquer e-mail no formato{' '}
      <strong className="font-semibold text-ink">lojista.loja-19@demo.test</strong> e uma senha de 8 caracteres ou
      mais.
    </>
  ),
}

export default function RotasLoja() {
  return <RotasDoPainel painel={PAINEL_DA_LOJA} />
}
