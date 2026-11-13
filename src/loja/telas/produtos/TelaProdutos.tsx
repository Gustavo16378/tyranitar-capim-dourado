// Produtos (RF21, RF22): o catálogo da loja, o cadastro com atributos por categoria e a
// importação por planilha CSV.
//
// Passo a passo: docs/como-fazer-uma-tela.md. Copie a estrutura de telas/atendimento/.
//
// Componentes (src/componentes): ProdutoCard (horizontal, na lista), Button (Novo produto
//   como primary; Importar planilha como secondary), Badge (estoque baixo, inativo).
//   Formulário: Campo e Opcao de src/loja/comum.
// Rotas (docs/api.md): ainda não existem no front. Para cada uma, nesta ordem:
//   1. tipos em src/tipos/loja.ts   2. função em src/loja/api/rotas.ts
//   3. mock em src/mocks/loja/ e uma linha em ROTAS_MOCKADAS (src/mocks/loja/index.ts)
//   GET  /api/loja/produtos                listar (paginado: { itens, total })
//   POST /api/loja/produtos                criar
//   PUT  /api/loja/produtos/{id}           editar
//   POST /api/loja/produtos/importar       CSV (text/csv): nome,descricao,categoria,preco,estoque,fotos,atributos
//                                          responde { importados, erros } por linha
// Regras: preço em centavos na API (lerValorEmCentavos em comum/formatos.ts); estoque nunca
//   negativo; atributos mudam por categoria (numeracao em calcados, ml em perfumaria...).
// Estados: carregando, vazio ("Nenhum produto ainda. Cadastre ou importe uma planilha."),
//   erro e com dados.
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../comum/CabecalhoTela'
import { EmMontagem } from '../../comum/EmMontagem'

export function TelaProdutos() {
  const ref = useEntrada<HTMLDivElement>()
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Produtos"
        descricao="O catálogo da loja. Cadastre, edite ou importe uma planilha."
      />
      <EmMontagem />
    </div>
  )
}
