// O painel da loja, montado em /loja/* pelo App (carregado sob demanda: quem abre o app do
// cliente não baixa o painel). Guarda de perfil, barra lateral e rotas vêm do
// RotasDoPainel; aqui fica só o que é da loja, como o aviso de reserva nova (o Vigia).
import { RotasDoPainel } from '../painel/RotasDoPainel'
import type { ConfigDoPainel } from '../painel/painel'
import { sessao } from './api'
import { AvisoDeReservas } from './avisos/AvisoDeReservas'
import { BASE_DA_LOJA } from './enderecos'
import { TELAS_DA_LOJA } from './navegacao'

const PAINEL_DA_LOJA: ConfigDoPainel = {
  nome: 'Painel da loja',
  base: BASE_DA_LOJA,
  perfil: 'LOJISTA',
  telas: TELAS_DA_LOJA,
  sessao,
  Vigia: AvisoDeReservas,
}

export default function RotasLoja() {
  return <RotasDoPainel painel={PAINEL_DA_LOJA} />
}
