// Reservas (RF20): as reservas da loja por status, com confirmar, separar e cancelar.
// A retirada vai pelo Atendimento, lendo o QR do cliente, para somar os pontos dele.
//
//   TelaReservas         cabeçalho, filtro por status e a lista
//   └─ ListaDeReservas   GET /api/loja/reservas, os quatro estados e a paginação
//      └─ CartaoReserva  ReservaStatus + AcoesDaReserva (PATCH /api/loja/reservas/{id})
import { useState } from 'react'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { FILTROS, type IdFiltro } from './filtros'
import { ListaDeReservas } from './ListaDeReservas'

export function TelaReservas() {
  const ref = useEntrada<HTMLDivElement>()
  const [filtro, setFiltro] = useState<IdFiltro>('ativas')
  const [pagina, setPagina] = useState(1)

  function filtrar(novo: IdFiltro) {
    setFiltro(novo)
    setPagina(1)
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Reservas"
        descricao="As reservas da loja por status. Confirme, separe e acompanhe o prazo de cada uma."
      />
      <div data-anim>
        <Segmentos
          rotulo="Filtrar reservas por status"
          opcoes={FILTROS.map(({ id, rotulo }) => ({ valor: id, rotulo }))}
          valor={filtro}
          aoMudar={filtrar}
        />
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
