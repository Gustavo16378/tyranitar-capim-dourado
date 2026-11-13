import { useCallback, useEffect, useState } from 'react'
import { paraErroApi, type ErroApi } from './http'

export type Consulta<T> = { recarregar: () => void } & (
  | { estado: 'carregando' }
  | { estado: 'erro'; erro: ErroApi }
  | { estado: 'pronto'; dados: T }
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
 * Passe a função dentro de um useCallback: quando ela muda (outro qr), a consulta refaz.
 * Uma resposta que chega depois de a tela sair, ou de o qr mudar, é descartada.
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

  // O resultado guardado só vale para a busca e a versão atuais; senão, ainda está carregando.
  if (!resultado || resultado.origem !== buscar || resultado.versao !== versao) {
    return { estado: 'carregando', recarregar }
  }
  return resultado.estado === 'pronto'
    ? { estado: 'pronto', dados: resultado.dados, recarregar }
    : { estado: 'erro', erro: resultado.erro, recarregar }
}
