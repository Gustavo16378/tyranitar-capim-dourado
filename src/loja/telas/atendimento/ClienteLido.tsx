import { useCallback, useState } from 'react'
import { Button, FichaCliente } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import type { Atendimento } from '../../../tipos/loja'
import { buscarAtendimento, listarReservas, useConsulta } from '../../api'
import { Carregando, Erro, Esqueleto } from '../../../painel/comum/Estados'
import { paraNivel } from '../../../painel/comum/formatos'
import { STATUS_ATIVOS } from '../../comum/reserva'
import {
  chaveDoItem,
  completarOrigens,
  faltaOrigem,
  comProduto,
  comReserva,
  descricaoDoItem,
  semItem,
  type CarrinhoDoCaixa,
  type ItemNoCarrinho,
  type ProdutoNoCarrinho,
} from './carrinho'
import type { Leitura } from './LeitorQR'
import { RegistrarCompra } from './RegistrarCompra'
import { ReservasDoCliente } from './ReservasDoCliente'

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
  // A origem do cupom de cada reserva (loja ou shopping) vem da lista de reservas da loja quando o
  // atendimento não manda; com ela no atendimento, esta busca nem acontece.
  const semOrigem = consulta.estado === 'pronto' && faltaOrigem(consulta.dados.reservas)
  const buscarOrigens = useCallback(
    (sinal: AbortSignal) =>
      semOrigem ? listarReservas({ status: [...STATUS_ATIVOS], tamanho: 100 }, sinal) : Promise.resolve(null),
    [semOrigem],
  )
  const origens = useConsulta(buscarOrigens)

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
      atendimento={{
        ...consulta.dados,
        reservas: completarOrigens(consulta.dados.reservas, origens.estado === 'pronto' ? origens.dados?.itens : null),
      }}
      atualizando={consulta.atualizando}
      leitura={leitura}
      aoRecarregar={consulta.recarregar}
      aoRegistrar={aoRegistrar}
      aoTerminar={aoTerminar}
    />
  )
}

function EsqueletoDoAtendimento() {
  return (
    <Carregando rotulo="Carregando a ficha do cliente" className="grid items-start gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-[220px]" />
        <Esqueleto className="h-[150px]" />
      </div>
      <Esqueleto className="h-[420px]" />
    </Carregando>
  )
}

interface AtendimentoDoClienteProps extends ClienteLidoProps {
  atendimento: Atendimento
  atualizando: boolean
  /** Busca o atendimento de novo (depois de confirmar uma reserva, ou de registrar a compra). */
  aoRecarregar: () => void
}

/**
 * Com dados: à esquerda, a ficha e as reservas dela nesta loja ("Retirar" põe a reserva na
 * compra); à direita, o caixa. O carrinho fica aqui, porque as duas colunas mexem nele. Entra em
 * cascata.
 */
function AtendimentoDoCliente({ atendimento, atualizando, leitura, aoRecarregar, aoRegistrar, aoTerminar }: AtendimentoDoClienteProps) {
  const ref = useEntrada<HTMLDivElement>()
  const { cliente, ficha } = atendimento
  const [carrinho, setCarrinho] = useState<ItemNoCarrinho[]>([])
  const [registrada, setRegistrada] = useState(false)
  // O que mudou no carrinho, para o leitor de tela: "Camiseta dry-fit entrou na compra."
  const [anuncio, setAnuncio] = useState('')

  function mudarCarrinho(novo: ItemNoCarrinho[], frase: string) {
    setCarrinho(novo)
    setAnuncio(frase)
  }

  const carrinhoComMudancas: CarrinhoDoCaixa = {
    itens: carrinho,
    retirar: (reservaId: string) => {
      const reserva = atendimento.reservas.find((r) => r.id === reservaId)
      if (reserva) mudarCarrinho(comReserva(carrinho, reserva), `${reserva.produto} entrou na compra.`)
    },
    adicionar: (produto: ProdutoNoCarrinho) => mudarCarrinho(comProduto(carrinho, produto), `${produto.nome} entrou na compra.`),
    tirar: (chave: string) => {
      const item = carrinho.find((i) => chaveDoItem(i) === chave)
      if (item) mudarCarrinho(semItem(carrinho, chave), `${descricaoDoItem(item)} saiu da compra.`)
    },
    trocar: (novo: ItemNoCarrinho[], frase: string) => mudarCarrinho(novo, frase),
  }

  function registrou() {
    setRegistrada(true)
    // As reservas que saíram somem da lista da esquerda.
    aoRecarregar()
    aoRegistrar()
  }

  return (
    <div ref={ref} className="grid items-start gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
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
        <div data-anim>
          <ReservasDoCliente
            atendimento={atendimento}
            atualizando={atualizando}
            carrinho={carrinho}
            registrada={registrada}
            aoRetirar={carrinhoComMudancas.retirar}
            aoConfirmar={aoRecarregar}
          />
        </div>
      </div>

      <div data-anim>
        <RegistrarCompra
          atendimento={atendimento}
          leitura={leitura}
          carrinho={carrinhoComMudancas}
          aoRegistrar={registrou}
          aoTerminar={aoTerminar}
        />
      </div>
      <p role="status" className="sr-only">
        {anuncio}
      </p>
    </div>
  )
}
