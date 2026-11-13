// Reservas (RF20): as reservas da loja por status, com confirmar, separar, retirar e cancelar.
//
// Passo a passo: docs/como-fazer-uma-tela.md. Copie a estrutura de telas/atendimento/.
//
// Componentes (src/componentes): ReservaStatus (uma por reserva), Badge (status em
//   palavra: ROTULO_DO_STATUS), Button (as ações da reserva; primary no máximo uma vez).
// Rotas: já prontas em src/loja/api/rotas.ts, com mock em src/mocks/loja/reservas.ts.
//   GET   /api/loja/reservas        listarReservas({ status, pagina, tamanho }, sinal)
//   PATCH /api/loja/reservas/{id}   mudarStatusReserva(id, 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA')
// Regras: TRANSICOES_DA_LOJA em src/loja/comum/reserva.ts diz quais botões mostrar em cada
//   status. Prazo correndo (expiraEm) vai num Badge tone="aviso" com o ícone relogio.
//   Cancelar usa Button variant="danger".
// Estados: carregando (esqueleto da lista), vazio ("Nenhuma reserva ativa agora."),
//   erro (Erro com Tentar de novo) e com dados.
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../comum/CabecalhoTela'
import { EmMontagem } from '../../comum/EmMontagem'

export function TelaReservas() {
  const ref = useEntrada<HTMLDivElement>()
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Reservas"
        descricao="As reservas da loja por status. Confirme, separe e marque a retirada."
      />
      <EmMontagem />
    </div>
  )
}
