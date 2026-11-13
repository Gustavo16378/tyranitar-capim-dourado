// QR das entradas: um QR por entrada do shopping, com o link do mapa do app já saindo dela
// (/mapa?origem=<entrada>, src/mapa/entradas.ts), para colar na entrada. Pronta para imprimir:
// na impressão saem só os cartões, um por página, em preto no branco.
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../../../componentes'
import { nomeDoPiso } from '../../../app/formatos'
import { APP_NOME } from '../../../config'
import { ENTRADAS, linkDaEntrada, type Entrada } from '../../../mapa/entradas'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'

function CartaoDaEntrada({ entrada, link }: { entrada: Entrada; link: string }) {
  return (
    <article
      aria-label={`${entrada.nome}, ${nomeDoPiso(entrada.piso)}`}
      className={
        'flex flex-col items-center gap-4 rounded-lg border bg-surface-raised p-6 text-center ' +
        // Na impressão: uma entrada por página, no meio da folha, em preto no branco.
        'print:min-h-[25cm] print:justify-center print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:[break-after:page] print:[break-inside:avoid]'
      }
    >
      <p className="text-caption font-semibold uppercase tracking-widest text-marrom-ink print:text-black">{APP_NOME}</p>
      <div>
        <h2 className="text-title-lg print:text-[48pt] print:leading-tight">{entrada.nome}</h2>
        <p className="text-body text-ink-muted print:text-[20pt] print:text-black">{nomeDoPiso(entrada.piso)}</p>
      </div>
      <div className="rounded-md bg-white p-3">
        <QRCodeSVG
          value={link}
          size={200}
          level="M"
          fgColor="#000000"
          bgColor="#ffffff"
          title={`QR da ${entrada.nome}: ${link}`}
          className="block size-[200px] print:size-[11cm]"
        />
      </div>
      <p className="max-w-[32ch] text-body print:max-w-none print:text-[18pt]">
        Aponte a câmera do celular: o mapa abre com a rota saindo daqui.
      </p>
      <p className="break-all text-caption text-ink-muted print:text-[11pt] print:text-black">{link}</p>
    </article>
  )
}

/** As entradas do shopping com o QR de cada uma, para imprimir e colar na entrada. */
export function TelaEntradas() {
  const ref = useEntrada<HTMLDivElement>()
  const site = window.location.origin
  return (
    <div ref={ref} className="flex flex-col gap-6 print:gap-0">
      <div className="print:hidden">
        <CabecalhoTela
          titulo="QR das entradas"
          descricao="Um QR por entrada, para colar nela: quem aponta a câmera abre o mapa do app já saindo dali. Na impressão, sai um por página."
        >
          <Button variant="primary" onClick={() => window.print()}>
            Imprimir
          </Button>
        </CabecalhoTela>
      </div>
      <div data-anim className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:block">
        {ENTRADAS.map((entrada) => (
          <CartaoDaEntrada key={entrada.id} entrada={entrada} link={linkDaEntrada(entrada.id, site)} />
        ))}
      </div>
    </div>
  )
}
