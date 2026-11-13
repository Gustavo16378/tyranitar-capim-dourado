// Desempenho (RF24, RF25): mais vendidos, mais buscados, buscados e não encontrados,
// produtos parados, picos, cupons, ticket médio e o extrato da loja.
//
// Passo a passo: docs/como-fazer-uma-tela.md. Copie a estrutura de telas/atendimento/.
//
// Componentes (src/componentes): StatTile (um número por bloco: "Buscado e não achado",
//   "Ticket médio com ficha"...), Button para trocar o período (7d, 30d, 90d).
//   Gráficos: recharts (está no SPEC, ainda não instalado). Cores só dos tokens.
// Rotas (docs/api.md): ainda não existem no front. Para cada uma, nesta ordem:
//   1. tipos em src/tipos/loja.ts   2. função em src/loja/api/rotas.ts
//   3. mock em src/mocks/loja/ e uma linha em ROTAS_MOCKADAS (src/mocks/loja/index.ts)
//   GET /api/loja/relatorios?periodo=7d|30d|90d   maisVendidos, maisBuscados, naoEncontrados,
//       parados, picos, cupons, ticketMedio (com e sem ficha), comparativoCategoria
//   GET /api/loja/extrato    vendas pela plataforma, desconto em cupons e reembolsos a receber
// Regras: RN13 (comparativoCategoria só vem com 3 lojas ou mais na categoria; se não vier,
//   não mostre o bloco). Números em text-metric, com formatarNumero e formatarPreco.
// Estados: carregando, vazio ("Ainda não há vendas neste período."), erro e com dados.
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../comum/CabecalhoTela'
import { EmMontagem } from '../../comum/EmMontagem'

export function TelaDesempenho() {
  const ref = useEntrada<HTMLDivElement>()
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Desempenho"
        descricao="O que vende, o que os clientes procuram e não acham, e quando a loja enche."
      />
      <EmMontagem />
    </div>
  )
}
