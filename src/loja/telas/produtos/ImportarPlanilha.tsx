import { useId, useState, type FormEvent } from 'react'
import { Button, formatarNumero, Icon } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import { importarProdutos, useAcao } from '../../api'
import { Erro } from '../../comum/Estados'

const COLUNAS = 'nome,descricao,categoria,preco,estoque,fotos,atributos'
const MODELO = [
  COLUNAS,
  'Tênis de corrida Pulse,Leve e com amortecimento,calcados,"399,90",3,https://exemplo.com/pulse.webp,"{""numeracao"":[40,41,42],""cor"":""preto""}"',
  'Camiseta dry-fit Trilha,,roupas,"89,90",12,,"{""tamanhos"":[""P"",""M"",""G""],""cor"":""verde""}"',
].join('\r\n')
// O BOM no começo faz o Excel abrir o arquivo com os acentos certos.
const LINK_DO_MODELO = `data:text/csv;charset=utf-8,${encodeURIComponent(String.fromCharCode(0xfeff) + MODELO)}`
const UM_MEGA = 1024 * 1024

/** Importação por planilha (RF22): as linhas certas entram, as com erro voltam com o motivo. */
export function ImportarPlanilha({ aoVoltar }: { aoVoltar: (aviso?: string) => void }) {
  const ref = useEntrada<HTMLFormElement>()
  const idArquivo = useId()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const importar = useAcao(importarProdutos)
  const resultado = importar.resultado

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!arquivo) return setErroArquivo('Escolha a planilha em CSV.')
    if (arquivo.size > UM_MEGA) return setErroArquivo('A planilha passa de 1 MB. Divida em partes menores.')
    setErroArquivo(null)
    await importar.executar(await arquivo.text())
  }

  const resumo =
    resultado && `${formatarNumero(resultado.importados)} ${resultado.importados === 1 ? 'produto importado' : 'produtos importados'}`

  return (
    <form
      ref={ref}
      onSubmit={enviar}
      noValidate
      className="flex flex-col gap-5 rounded-md border border-line bg-surface-raised p-5 md:p-6"
    >
      <div data-anim className="flex flex-col gap-2">
        <h2 className="text-title-sm">Importar planilha</h2>
        <p className="max-w-[64ch] text-body-sm text-ink-muted">
          Uma linha por produto, com as colunas <code className="font-sans font-semibold text-ink">{COLUNAS}</code>. Preço
          em reais, com vírgula ou ponto; fotos separadas por <code className="font-sans font-semibold text-ink">|</code>;
          atributos em JSON. Um produto com o mesmo nome de outro do catálogo é atualizado.
        </p>
        <a href={LINK_DO_MODELO} download="modelo-produtos.csv" className="text-label text-marrom-ink underline">
          Baixar a planilha modelo
        </a>
      </div>

      <div data-anim className="flex flex-col gap-1">
        <label htmlFor={idArquivo} className="text-label">
          Planilha em CSV
        </label>
        <input
          id={idArquivo}
          type="file"
          accept=".csv,text/csv"
          aria-invalid={erroArquivo ? true : undefined}
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null)
            setErroArquivo(null)
            importar.limpar()
          }}
          className="text-body-sm text-ink-muted file:mr-3 file:h-11 file:cursor-pointer file:rounded-pill file:border file:border-solid file:border-line-strong file:bg-surface-raised file:px-5 file:text-label file:text-ink"
        />
        {erroArquivo && <p className="text-body-sm text-perigo-ink">{erroArquivo}</p>}
      </div>

      {importar.erro && <Erro erro={importar.erro} />}

      {resultado && (
        <div role="status" className="flex flex-col gap-3">
          <p className="flex items-center gap-2 rounded-md bg-cerrado-soft px-4 py-3 text-body-sm font-medium text-cerrado-ink">
            <Icon name="check" />
            {resumo}.
          </p>
          {resultado.erros.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md bg-perigo-soft p-4 text-perigo-ink">
              <p className="flex items-center gap-2 text-body-sm font-medium">
                <Icon name="alerta" />
                {resultado.erros.length === 1 ? 'Uma linha não entrou' : `${resultado.erros.length} linhas não entraram`}.
                Corrija e importe a planilha de novo.
              </p>
              <ul className="flex flex-col gap-1 pl-7 text-body-sm">
                {resultado.erros.map((erro) => (
                  <li key={erro.linha}>
                    Linha {erro.linha}: {erro.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div data-anim className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={importar.enviando}>
          {importar.enviando ? 'Importando…' : 'Importar'}
        </Button>
        <Button variant="ghost" onClick={() => aoVoltar(resumo ? `${resumo}.` : '')} disabled={importar.enviando}>
          Voltar ao catálogo
        </Button>
      </div>
    </form>
  )
}
