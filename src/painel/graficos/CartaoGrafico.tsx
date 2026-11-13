import { useId, type ReactNode } from 'react'

interface CartaoGraficoProps {
  titulo: string
  descricao: string
  children: ReactNode
  /** A mesma informação em tabela: o equivalente acessível do gráfico, sem depender de cor nem de hover. */
  tabela: { colunas: string[]; linhas: (string | number)[][] }
}

/** Moldura de um gráfico: título, uma frase sobre o que ele mostra, o gráfico e a tabela. */
export function CartaoGrafico({ titulo, descricao, children, tabela }: CartaoGraficoProps) {
  const idTitulo = useId()
  return (
    <figure
      aria-labelledby={idTitulo}
      className="flex min-w-0 flex-col gap-4 rounded-md border border-line bg-surface-raised p-5"
    >
      <figcaption className="flex flex-col gap-1">
        <h2 id={idTitulo} className="text-title-sm">
          {titulo}
        </h2>
        <p className="text-body-sm text-ink-muted">{descricao}</p>
      </figcaption>
      {children}
      <details className="text-body-sm">
        <summary className="cursor-pointer text-label text-marrom-ink">Ver em tabela</summary>
        <table className="mt-3 w-full border-collapse text-left">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr>
              {tabela.colunas.map((coluna, i) => (
                <th key={coluna} scope="col" className={`border-b border-line py-2 text-label ${i > 0 ? 'text-right' : ''}`}>
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabela.linhas.map((linha) => (
              <tr key={String(linha[0])}>
                {linha.map((celula, i) => (
                  <td key={i} className={`border-b border-line py-2 ${i > 0 ? 'text-right tabular-nums' : ''}`}>
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
