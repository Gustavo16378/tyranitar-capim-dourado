import { useCallback, useEffect, useState } from 'react'
import { paraErroApi, type ErroApi } from './http'

export type Consulta<T> = { recarregar: () => void } & (
  | { estado: 'carregando' }
  | { estado: 'erro'; erro: ErroApi }
  /** `atualizando`: estes dados são da busca anterior e a nova ainda não chegou. */
  | { estado: 'pronto'; dados: T; atualizando: boolean }
)

type Resultado<T> = { origem: unknown; versao: number } & (
  | { estado: 'erro'; erro: ErroApi }
  | { estado: 'pronto'; dados: T }
)

/**
 * Lê dados da API para uma tela, com os estados que toda tela prevê (docs/telas.md):
 *
 *   const buscar = useCallback((sinal: AbortSignal) => buscarAtendimento(qr, sinal), [qr])
 *   const consulta = useConsulta(buscar)
 *   if (consulta.estado === 'carregando') return <Esqueleto />
 *   if (consulta.estado === 'erro') return <Erro erro={consulta.erro} aoTentarDeNovo={consulta.recarregar} />
 *   return <Lista itens={consulta.dados.itens} />
 *
 * Passe a função dentro de um useCallback: quando ela muda (outro qr, outro filtro), a
 * consulta refaz. Enquanto refaz, os dados anteriores continuam na tela com
 * `atualizando: true` (deixe-os mais claros, sem esqueleto); o esqueleto é só da primeira
 * carga. Uma resposta que chega depois de a tela sair, ou de a busca mudar, é descartada.
 */
export function useConsulta<T>(buscar: (sinal: AbortSignal) => Promise<T>): Consulta<T> {
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)

  useEffect(() => {
    const controle = new AbortController()
    buscar(controle.signal).then(
      (dados) => {
        if (!controle.signal.aborted) setResultado({ origem: buscar, versao, estado: 'pronto', dados })
      },
      (erro: unknown) => {
        if (!controle.signal.aborted) {
          setResultado({ origem: buscar, versao, estado: 'erro', erro: paraErroApi(erro) })
        }
      },
    )
    return () => controle.abort()
  }, [buscar, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  const atual = resultado?.origem === buscar && resultado.versao === versao
  if (resultado?.estado === 'pronto') {
    return { estado: 'pronto', dados: resultado.dados, atualizando: !atual, recarregar }
  }
  if (resultado?.estado === 'erro' && atual) return { estado: 'erro', erro: resultado.erro, recarregar }
  return { estado: 'carregando', recarregar }
}
