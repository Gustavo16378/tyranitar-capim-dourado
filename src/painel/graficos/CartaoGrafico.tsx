import { Fragment, useId, type ReactNode } from 'react'

interface CartaoGraficoProps {
  titulo: string
  descricao: string
  children: ReactNode
  /** A mesma informação em tabela: o equivalente acessível do gráfico, sem depender de cor nem de hover. */
  tabela: { colunas: string[]; linhas: (string | number)[][] }
}

/**
 * Moldura de um gráfico: título, uma frase sobre o que ele mostra, o gráfico e a tabela. Abaixo
 * de 640 px, a tabela vira cartões (um por linha, cada coluna com o nome dela), sem rolar de lado.
 */
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
        <ul aria-label={titulo} className="mt-3 flex flex-col gap-2 sm:hidden">
          {tabela.linhas.map((linha) => (
            <li key={String(linha[0])} className="flex flex-col gap-1 rounded-sm border border-line p-3">
              <span className="text-label">{linha[0]}</span>
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4">
                {tabela.colunas.slice(1).map((coluna, i) => (
                  <Fragment key={coluna}>
                    <dt className="text-ink-muted">{coluna}</dt>
                    <dd className="text-right tabular-nums">{linha[i + 1]}</dd>
                  </Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <table className="mt-3 hidden w-full border-collapse text-left sm:table">
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
