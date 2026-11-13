import { useState, type FormEvent } from 'react'
import { Button } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import type { PedidoProduto, ProdutoDaLoja } from '../../../tipos/loja'
import { criarProduto, editarProduto, useAcao } from '../../api'
import { Campo } from '../../comum/Campo'
import { CampoLongo } from '../../comum/CampoLongo'
import { Erro } from '../../comum/Estados'
import { lerValorEmCentavos, valorParaCampo } from '../../comum/formatos'
import { Opcao } from '../../comum/Opcao'
import { Selecao } from '../../comum/Selecao'
import { atributosParaTexto, categoria, CATEGORIAS, textoParaAtributos } from './categorias'

interface FormularioProdutoProps {
  /** Sem produto, cadastra um novo. */
  produto?: ProdutoDaLoja
  aoSalvar: (produto: ProdutoDaLoja) => void
  aoVoltar: () => void
}

/** Erro de cada campo: nome, preco, estoque, fotos ou a chave de um atributo. */
type Erros = Record<string, string>

/** Cadastro e edição (RF21). Os atributos mudam conforme a categoria escolhida. */
export function FormularioProduto({ produto, aoSalvar, aoVoltar }: FormularioProdutoProps) {
  const ref = useEntrada<HTMLFormElement>()
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [idCategoria, setIdCategoria] = useState(produto?.categoria ?? CATEGORIAS[0].id)
  const [preco, setPreco] = useState(produto ? valorParaCampo(produto.precoCentavos) : '')
  const [estoque, setEstoque] = useState(String(produto?.estoque ?? ''))
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [fotos, setFotos] = useState(produto?.fotos.join('\n') ?? '')
  const [atributos, setAtributos] = useState(() => atributosParaTexto(produto?.atributos ?? {}))
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [erros, setErros] = useState<Erros>({})
  const salvar = useAcao((pedido: PedidoProduto) => (produto ? editarProduto(produto.id, pedido) : criarProduto(pedido)))
  const campos = categoria(idCategoria)?.atributos ?? []

  /** O que está na tela vira o corpo da API, ou os erros de cada campo. */
  function ler(): { pedido: PedidoProduto } | { erros: Erros } {
    const erros: Erros = {}
    if (nome.trim().length < 2) erros.nome = 'Escreva o nome do produto.'
    const precoCentavos = lerValorEmCentavos(preco)
    if (!precoCentavos) erros.preco = 'Informe o preço, como 399,90.'
    if (!/^\d+$/.test(estoque.trim())) erros.estoque = 'Informe quantas unidades há na loja, como 3.'
    const listaDeFotos = fotos.split('\n').map((f) => f.trim()).filter(Boolean)
    if (listaDeFotos.some((f) => !/^https?:\/\//.test(f))) erros.fotos = 'Use endereços que começam com https://.'
    const lidos = textoParaAtributos(campos, atributos)
    if ('erro' in lidos) erros[lidos.chave] = lidos.erro
    if ('erro' in lidos || !precoCentavos || Object.keys(erros).length) return { erros }
    return {
      pedido: {
        nome: nome.trim(),
        descricao: descricao.trim(),
        categoria: idCategoria,
        precoCentavos,
        estoque: Number(estoque),
        fotos: listaDeFotos,
        atributos: lidos.atributos,
        ativo,
      },
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const lido = ler()
    if ('erros' in lido) {
      setErros(lido.erros)
      return
    }
    setErros({})
    const salvo = await salvar.executar(lido.pedido)
    if (salvo) aoSalvar(salvo)
  }

  return (
    <form
      ref={ref}
      onSubmit={enviar}
      noValidate
      className="flex flex-col gap-5 rounded-md border border-line bg-surface-raised p-5 md:p-6"
    >
      <h2 data-anim className="text-title-sm">
        {produto ? `Editar ${produto.nome}` : 'Novo produto'}
      </h2>

      <div data-anim className="grid gap-4 md:grid-cols-2">
        <Campo
          rotulo="Nome"
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
          className="md:col-span-2"
        />
        <Selecao
          rotulo="Categoria"
          opcoes={CATEGORIAS.map((c) => ({ valor: c.id, rotulo: c.rotulo }))}
          value={idCategoria}
          onChange={(e) => setIdCategoria(e.target.value)}
          className="md:col-span-2"
        />
        <Campo
          rotulo="Preço"
          prefixo="R$"
          inputMode="decimal"
          placeholder="0,00"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          onBlur={() => {
            const centavos = lerValorEmCentavos(preco)
            if (centavos) setPreco(valorParaCampo(centavos))
          }}
          erro={erros.preco}
        />
        <Campo
          rotulo="Estoque"
          inputMode="numeric"
          placeholder="0"
          value={estoque}
          onChange={(e) => setEstoque(e.target.value)}
          erro={erros.estoque}
          dica="Unidades na loja agora. Cada reserva desconta uma."
        />
      </div>

      {campos.length > 0 && (
        <fieldset data-anim className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-label">Atributos de {categoria(idCategoria)?.rotulo}</legend>
          {campos.map((campo) => (
            <Campo
              key={campo.chave}
              rotulo={campo.rotulo}
              dica={campo.dica}
              inputMode={campo.tipo === 'numero' ? 'decimal' : undefined}
              value={atributos[campo.chave] ?? ''}
              onChange={(e) => setAtributos({ ...atributos, [campo.chave]: e.target.value })}
              erro={erros[campo.chave]}
            />
          ))}
        </fieldset>
      )}

      <div data-anim className="grid gap-4 md:grid-cols-2">
        <CampoLongo
          rotulo="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          dica="A Capi usa a descrição para achar o produto."
        />
        <CampoLongo
          rotulo="Fotos"
          value={fotos}
          onChange={(e) => setFotos(e.target.value)}
          erro={erros.fotos}
          dica="Um endereço por linha. A primeira é a capa."
          placeholder="https://"
        />
      </div>

      <div data-anim className="flex flex-col gap-4">
        <Opcao tipo="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)}>
          Mostrar aos clientes na busca e na Capi
        </Opcao>
        {salvar.erro && <Erro erro={salvar.erro} />}
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button type="submit" variant="primary" disabled={salvar.enviando}>
            {salvar.enviando ? 'Salvando…' : 'Salvar produto'}
          </Button>
          <Button variant="ghost" onClick={aoVoltar} disabled={salvar.enviando}>
            Voltar ao catálogo
          </Button>
        </div>
      </div>
    </form>
  )
}
