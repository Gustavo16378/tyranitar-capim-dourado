import { useCallback, useEffect, useRef, useState } from 'react'
import { comoErroApi, type ErroApi } from './cliente'

export type EstadoDados<T> = { tipo: 'carregando' } | { tipo: 'erro'; erro: ErroApi } | { tipo: 'ok'; dados: T }

/**
 * Carrega dados da API para uma tela e devolve o estado (carregando, erro ou ok) e recarregar(),
 * para o botão "Tentar de novo". A `chave` identifica o que está sendo carregado: quando ela
 * muda (outro produto, por exemplo), a tela volta para carregando e busca de novo.
 *
 *   const produto = useDados(() => obterProduto(id), id)
 *   if (produto.tipo === 'carregando') return <EsqueletoProduto />
 *   if (produto.tipo === 'erro') return <ErroTela erro={produto.erro} onTentar={produto.recarregar} />
 *   return <Detalhe produto={produto.dados} />
 */
export function useDados<T>(carregar: () => Promise<T>, chave = '') {
  const [tentativa, setTentativa] = useState(0)
  const chaveAtual = `${chave}#${tentativa}`
  const [resultado, setResultado] = useState<{ chave: string; estado: EstadoDados<T> } | null>(null)

  const carregarRef = useRef(carregar)
  useEffect(() => {
    carregarRef.current = carregar
  })

  useEffect(() => {
    let ativo = true
    carregarRef.current().then(
      (dados) => ativo && setResultado({ chave: chaveAtual, estado: { tipo: 'ok', dados } }),
      (erro: unknown) =>
        ativo && setResultado({ chave: chaveAtual, estado: { tipo: 'erro', erro: comoErroApi(erro) } }),
    )
    return () => {
      ativo = false
    }
  }, [chaveAtual])

  const recarregar = useCallback(() => setTentativa((t) => t + 1), [])
  const estado: EstadoDados<T> = resultado?.chave === chaveAtual ? resultado.estado : { tipo: 'carregando' }
  return { ...estado, recarregar }
}
