import { useCallback } from 'react'
import { Button, FichaCliente, ReservaStatus, type ReservaStatusProps } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import type { Atendimento, ReservaDoCliente } from '../../../tipos/loja'
import { buscarAtendimento, useConsulta } from '../../api'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { paraNivel } from '../../../painel/comum/formatos'
import { STATUS_ATIVOS } from '../../comum/reserva'
import type { Leitura } from './LeitorQR'
import { RegistrarCompra } from './RegistrarCompra'

interface ClienteLidoProps {
  leitura: Leitura
  /** Uma compra foi registrada (o topo da tela atualiza as reservas). */
  aoRegistrar: () => void
  /** Volta para o leitor, para o próximo cliente. */
  aoTerminar: () => void
}

/** Depois da leitura: busca o atendimento do QR e mostra cada um dos quatro estados. */
export function ClienteLido({ leitura, aoRegistrar, aoTerminar }: ClienteLidoProps) {
  const buscar = useCallback((sinal: AbortSignal) => buscarAtendimento(leitura.qr, sinal), [leitura.qr])
  const consulta = useConsulta(buscar)

  if (consulta.estado === 'carregando') return <EsqueletoDoAtendimento />

  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return (
      <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined}>
        <Button size="sm" variant="ghost" onClick={aoTerminar}>
          Ler outro QR
        </Button>
      </Erro>
    )
  }

  return (
    <AtendimentoDoCliente
      atendimento={consulta.dados}
      leitura={leitura}
      aoRegistrar={aoRegistrar}
      aoTerminar={aoTerminar}
    />
  )
}

function EsqueletoDoAtendimento() {
  return (
    <Carregando rotulo="Carregando a ficha do cliente" className="grid items-start gap-5 lg:grid-cols-2">
      <Esqueleto className="h-[220px]" />
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-[150px]" />
        <Esqueleto className="h-[320px]" />
      </div>
    </Carregando>
  )
}

interface AtendimentoDoClienteProps extends ClienteLidoProps {
  atendimento: Atendimento
}

/** Com dados: a ficha à esquerda; as reservas e o caixa à direita. Entra em cascata. */
function AtendimentoDoCliente({ atendimento, leitura, aoRegistrar, aoTerminar }: AtendimentoDoClienteProps) {
  const ref = useEntrada<HTMLDivElement>()
  const { cliente, ficha } = atendimento
  const reservas = atendimento.reservas.filter(ativa)

  return (
    <div ref={ref} className="grid items-start gap-5 lg:grid-cols-2">
      <div data-anim>
        <h2 className="sr-only">Ficha do cliente</h2>
        <FichaCliente
          nome={cliente.nome}
          nivel={paraNivel(cliente.nivel)}
          interesses={ficha}
          acoes={
            <div>
              <Button size="sm" variant="ghost" onClick={aoTerminar}>
                Ler outro cliente
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-col gap-4">
        <section data-anim aria-label="Reservas nesta loja" className="flex flex-col gap-3">
          <h2 className="text-title-sm">Reservas nesta loja</h2>
          {reservas.length === 0 ? (
            <Vazio ilustracao="sacola" compacto>{cliente.nome} não tem reservas nesta loja.</Vazio>
          ) : (
            reservas.map((r) => (
              <ReservaStatus key={r.id} produto={r.produto} foto={r.foto} loja={situacao(r)} status={r.status} pago={r.pago} />
            ))
          )}
        </section>

        <div data-anim>
          <RegistrarCompra atendimento={atendimento} leitura={leitura} aoRegistrar={aoRegistrar} aoTerminar={aoTerminar} />
        </div>
      </div>
    </div>
  )
}

type ReservaAtiva = ReservaDoCliente & { status: ReservaStatusProps['status'] }

function ativa(r: ReservaDoCliente): r is ReservaAtiva {
  return STATUS_ATIVOS.includes(r.status)
}

/** A linha embaixo do produto: o que o vendedor faz com a reserva. */
function situacao({ status, pago }: ReservaDoCliente) {
  if (status === 'SEPARADA') return pago ? 'Paga com Pix · retirar agora' : 'Separada · cobrar no caixa'
  if (status === 'CONFIRMADA') return 'Confirmada · falta separar'
  return 'Nova · separe antes de entregar'
}
