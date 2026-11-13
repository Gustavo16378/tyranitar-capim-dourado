// Cupons (RF23): criar cupons da loja e acompanhar o uso.
//
// Passo a passo: docs/como-fazer-uma-tela.md. Copie a estrutura de telas/atendimento/.
//
// Componentes (src/componentes): CupomTicket (origem="loja", um por cupom, com desconto
//   "10%" ou "R$ 20", validade "31/12" e nivel mínimo), Button (Novo cupom como primary),
//   StatTile (usos e desconto concedido). Formulário: Campo e Opcao de src/loja/comum.
// Rotas (docs/api.md): ainda não existem no front. Para cada uma, nesta ordem:
//   1. tipos em src/tipos/loja.ts   2. função em src/loja/api/rotas.ts
//   3. mock em src/mocks/loja/ e uma linha em ROTAS_MOCKADAS (src/mocks/loja/index.ts)
//   GET  /api/loja/cupons    os cupons da loja e o uso de cada um
//   POST /api/loja/cupons    criar
// Regras (docs/requisitos.md): RN05 (um cupom da loja por compra, junto com o voucher do
//   shopping), RN06 (limite de usos por cliente e validade). Tipos de cupom da tabela cupom:
//   PERCENTUAL (1 a 100), VALOR (centavos) e BRINDE; nivel_minimo de SEMENTE a DOURADO.
// Estados: carregando, vazio ("A loja ainda não tem cupons. Crie o primeiro."), erro e
//   com dados.
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../comum/CabecalhoTela'
import { EmMontagem } from '../../comum/EmMontagem'

export function TelaCupons() {
  const ref = useEntrada<HTMLDivElement>()
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela titulo="Cupons" descricao="Os cupons da loja e quantas vezes cada um foi usado." />
      <EmMontagem />
    </div>
  )
}
