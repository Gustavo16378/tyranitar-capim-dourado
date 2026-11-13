// Produtos (RF21, RF22): o catálogo da loja, o cadastro com atributos por categoria e a
// importação por planilha CSV.
//
//   TelaProdutos          cabeçalho e o modo da tela: catálogo, formulário ou importação
//   ├─ ListaDeProdutos    GET /api/loja/produtos com busca, os quatro estados e a paginação
//   ├─ FormularioProduto  POST /api/loja/produtos ou PUT /api/loja/produtos/{id}
//   └─ ImportarPlanilha   POST /api/loja/produtos/importar (text/csv)
import { useState } from 'react'
import { Button } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import type { ProdutoDaLoja } from '../../../tipos/loja'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { FormularioProduto } from './FormularioProduto'
import { ImportarPlanilha } from './ImportarPlanilha'
import { ListaDeProdutos } from './ListaDeProdutos'

type Modo = { tipo: 'catalogo' } | { tipo: 'novo' } | { tipo: 'editar'; produto: ProdutoDaLoja } | { tipo: 'importar' }

export function TelaProdutos() {
  const ref = useEntrada<HTMLDivElement>()
  const [modo, setModo] = useState<Modo>({ tipo: 'catalogo' })
  // Frase que o catálogo anuncia quando volta de um cadastro ou importação.
  const [aviso, setAviso] = useState('')

  function voltar(mensagem = '') {
    setAviso(mensagem)
    setModo({ tipo: 'catalogo' })
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Produtos"
        descricao="O catálogo da loja: o que a Capi e a busca mostram aos clientes. Cadastre, edite ou importe uma planilha."
      >
        {/* No catálogo, o primário é "Novo produto"; nos outros modos, o botão de salvar. */}
        {modo.tipo === 'catalogo' && (
          <>
            <Button variant="primary" onClick={() => setModo({ tipo: 'novo' })}>
              Novo produto
            </Button>
            <Button onClick={() => setModo({ tipo: 'importar' })}>Importar planilha</Button>
          </>
        )}
      </CabecalhoTela>

      <div data-anim>
        {modo.tipo === 'catalogo' && (
          <ListaDeProdutos aviso={aviso} aoEditar={(produto) => setModo({ tipo: 'editar', produto })} />
        )}
        {(modo.tipo === 'novo' || modo.tipo === 'editar') && (
          <FormularioProduto
            produto={modo.tipo === 'editar' ? modo.produto : undefined}
            aoSalvar={(produto) => voltar(`Produto salvo: ${produto.nome}.`)}
            aoVoltar={() => voltar()}
          />
        )}
        {modo.tipo === 'importar' && <ImportarPlanilha aoVoltar={voltar} />}
      </div>
    </div>
  )
}
