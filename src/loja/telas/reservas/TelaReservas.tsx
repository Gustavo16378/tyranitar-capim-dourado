// Reservas (RF20): as reservas da loja por status. A loja confirma dizendo a partir de que horas
// fica pronta, separa ou recusa com o motivo. A retirada vai pelo Atendimento, lendo o QR do
// cliente, para somar os pontos dele. As reservas novas também chegam pelo aviso do painel
// (src/loja/avisos): o selo no menu, o som (que a loja desliga aqui) e a lista atualizada.
//
//   TelaReservas         cabeçalho (com o som de reserva nova), filtro por status e a lista
//   └─ ListaDeReservas   GET /api/loja/reservas, os quatro estados e a paginação
//      └─ CartaoReserva  detalhes + ações (PATCH /api/loja/reservas/{id}): confirmar com a
//                        hora, separar, recusar com o motivo
import { useState } from 'react'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { Opcao } from '../../../painel/comum/Opcao'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { useAvisoDeReservas } from '../../avisos/contexto'
import { FILTROS, type IdFiltro } from './filtros'
import { ListaDeReservas } from './ListaDeReservas'

export function TelaReservas() {
  const ref = useEntrada<HTMLDivElement>()
  const [filtro, setFiltro] = useState<IdFiltro>('ativas')
  const [pagina, setPagina] = useState(1)
  const { pendentes, som, mudarSom } = useAvisoDeReservas()

  function filtrar(novo: IdFiltro) {
    setFiltro(novo)
    setPagina(1)
  }

  // Na aba Novas, quantas esperam resposta: o mesmo número do selo do menu.
  const opcoes = FILTROS.map(({ id, rotulo }) => ({
    valor: id,
    rotulo: id === 'novas' && pendentes ? `${rotulo} (${pendentes})` : rotulo,
  }))

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Reservas"
        descricao="As reservas da loja por status. Confirme dizendo a partir de que horas fica pronta, separe ou recuse com o motivo, e acompanhe o prazo de cada uma."
      >
        <Opcao tipo="checkbox" checked={som} onChange={(e) => mudarSom(e.target.checked)}>
          Som de reserva nova
        </Opcao>
      </CabecalhoTela>
      <div data-anim>
        <Segmentos rotulo="Filtrar reservas por status" opcoes={opcoes} valor={filtro} aoMudar={filtrar} />
      </div>
      <div data-anim>
        <ListaDeReservas
          filtro={FILTROS.find((f) => f.id === filtro) ?? FILTROS[0]}
          pagina={pagina}
          aoMudarPagina={setPagina}
        />
      </div>
    </div>
  )
}
