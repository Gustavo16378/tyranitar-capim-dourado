// Cupons (RF23): criar, editar, desativar e excluir cupons da loja e acompanhar o uso.
//
//   TelaCupons          cabeçalho e o modo da tela: lista, novo cupom ou editando um
//   ├─ ListaDeCupons    GET /api/loja/cupons: números do uso e os cupons (CupomTicket), cada um
//   │                   com Editar, Desativar ou Reativar e Excluir (PUT e DELETE /api/loja/cupons/{id})
//   └─ FormularioCupom  POST /api/loja/cupons ou, editando, PUT /api/loja/cupons/{id}, com a prévia
import { useState } from 'react'
import { Button } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { FormularioCupom } from '../../../painel/cupons/FormularioCupom'
import type { CupomDaLoja, PedidoCupom } from '../../../tipos/loja'
import { criarCupom, editarCupom } from '../../api'
import { CATEGORIAS } from '../produtos/categorias'
import { ListaDeCupons } from './ListaDeCupons'

type Modo = { tipo: 'lista' } | { tipo: 'novo' } | { tipo: 'editando'; cupom: CupomDaLoja }

export function TelaCupons() {
  const ref = useEntrada<HTMLDivElement>()
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' })
  const [aviso, setAviso] = useState('')
  const editando = modo.tipo === 'editando' ? modo.cupom : undefined

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Cupons"
        descricao="Os cupons da loja, quantas vezes cada um foi usado e quanto deram de desconto."
      >
        {modo.tipo === 'lista' && (
          <Button variant="primary" onClick={() => setModo({ tipo: 'novo' })}>
            Novo cupom
          </Button>
        )}
      </CabecalhoTela>

      <div data-anim>
        {modo.tipo === 'lista' ? (
          <ListaDeCupons aviso={aviso} aoEditar={(cupom) => setModo({ tipo: 'editando', cupom })} />
        ) : (
          <FormularioCupom
            // Um formulário novo para cada cupom editado: o estado começa com os dados dele.
            key={editando?.id ?? 'novo'}
            origem="loja"
            criar={editando ? (pedido: PedidoCupom) => editarCupom(editando.id, pedido) : criarCupom}
            categorias={CATEGORIAS}
            cupom={editando}
            aoCriar={(cupom) => {
              setAviso(
                editando
                  ? `Cupom salvo: ${cupom.titulo}.`
                  : `Cupom criado: ${cupom.titulo}. Ele já aparece para os clientes no atendimento.`,
              )
              setModo({ tipo: 'lista' })
            }}
            aoVoltar={() => setModo({ tipo: 'lista' })}
          />
        )}
      </div>
    </div>
  )
}
