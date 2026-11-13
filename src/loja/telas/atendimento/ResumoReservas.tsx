import { Button, formatarNumero, StatTile } from '../../../componentes'
import { listarReservas, useConsulta } from '../../api'
import { Carregando, Esqueleto } from '../../comum/Estados'
import { STATUS_ATIVOS } from '../../comum/reserva'

// Fora do componente, a função não muda a cada render e o useConsulta busca uma vez só.
const buscarAtivas = (sinal: AbortSignal) => listarReservas({ status: [...STATUS_ATIVOS], tamanho: 100 }, sinal)

/** Os números do topo do Atendimento, das reservas que ainda vão passar pelo balcão. */
export function ResumoReservas() {
  const consulta = useConsulta(buscarAtivas)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando as reservas" className="flex flex-wrap gap-3">
        <Esqueleto className="h-[124px] w-[200px]" />
        <Esqueleto className="h-[124px] w-[200px]" />
      </Carregando>
    )
  }

  if (consulta.estado === 'erro') {
    return (
      <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
        Não deu para carregar as reservas.
        <Button size="sm" variant="ghost" onClick={consulta.recarregar}>
          Tentar de novo
        </Button>
      </p>
    )
  }

  const { itens, total } = consulta.dados
  const pagas = itens.filter((r) => r.pago).length
  const prontas = itens.filter((r) => r.status === 'SEPARADA').length
  return (
    <>
      <StatTile
        rotulo="Reservas ativas"
        valor={formatarNumero(total)}
        nota={pagas === 1 ? '1 paga com Pix' : `${formatarNumero(pagas)} pagas com Pix`}
      />
      <StatTile rotulo="Prontas para retirar" valor={formatarNumero(prontas)} nota="já separadas no balcão" />
    </>
  )
}
