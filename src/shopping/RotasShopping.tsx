// O painel do shopping, montado em /shopping/* pelo App (carregado sob demanda). Guarda de
// perfil, barra lateral e rotas vêm do RotasDoPainel; aqui fica só o que é do shopping.
import { RotasDoPainel } from '../painel/RotasDoPainel'
import type { ConfigDoPainel } from '../painel/painel'
import { sessao } from './api'
import { BASE_DO_SHOPPING } from './enderecos'
import { TELAS_DO_SHOPPING } from './navegacao'

const PAINEL_DO_SHOPPING: ConfigDoPainel = {
  nome: 'Painel do shopping',
  base: BASE_DO_SHOPPING,
  perfil: 'ADMIN_SHOPPING',
  telas: TELAS_DO_SHOPPING,
  sessao,
}

export default function RotasShopping() {
  return <RotasDoPainel painel={PAINEL_DO_SHOPPING} />
}
