import { useNavigate } from 'react-router'
import { Button, formatarNumero, StatTile } from '../../../componentes'
import { Carregando, Esqueleto } from '../../../painel/comum/Estados'
import { formatarArea } from '../../../painel/comum/formatos'
import { listarLojas, useConsulta } from '../../api'
import { urlDaTela } from '../../enderecos'

const buscarTodas = (sinal: AbortSignal) => listarLojas({ tamanho: 200 }, sinal)

/** Quantas unidades funcionam, quantas estão vagas e quanta área vaga há para ocupar. */
export function ResumoDasUnidades() {
  const navegar = useNavigate()
  const consulta = useConsulta(buscarTodas)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando as unidades" className="flex flex-wrap gap-3">
        <Esqueleto className="h-[124px] w-[200px]" />
        <Esqueleto className="h-[124px] w-[200px]" />
      </Carregando>
    )
  }
  if (consulta.estado === 'erro') {
    return (
      <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
        Não deu para contar as unidades.
        <Button size="sm" variant="ghost" onClick={consulta.recarregar}>
          Tentar de novo
        </Button>
      </p>
    )
  }

  const { itens } = consulta.dados
  const vagas = itens.filter((l) => !l.ativa)
  const areaVaga = vagas.reduce((soma, l) => soma + (l.areaM2 ?? 0), 0)
  return (
    <>
      <StatTile rotulo="Lojas funcionando" valor={formatarNumero(itens.length - vagas.length)} nota={`de ${itens.length} unidades`} />
      <div className="flex flex-col gap-1">
        <StatTile rotulo="Unidades vagas" valor={formatarNumero(vagas.length)} nota={`${formatarArea(areaVaga)} para ocupar`} />
        {vagas.length > 0 && (
          <Button size="sm" variant="ghost" icon="seta" onClick={() => navegar(urlDaTela('vagas'))}>
            O que buscar para as vagas
          </Button>
        )}
      </div>
    </>
  )
}
