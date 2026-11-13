import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { Button, Icon } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { QR_DA_ANA } from './demo'

/** O que saiu do QR: o qrToken da carteira. `simulada` quando veio do botão da demonstração. */
export interface Leitura {
  qr: string
  simulada: boolean
}

type Camera = 'parada' | 'abrindo' | 'lendo'

/**
 * Leitor do QR da carteira com html5-qrcode. A biblioteca (pesada) só é baixada quando o
 * vendedor abre a câmera. "Simular leitura" lê a carteira da Ana, para a demonstração.
 */
export function LeitorQR({ aoLer }: { aoLer: (leitura: Leitura) => void }) {
  const idVisor = `leitor-qr-${useId().replace(/\W/g, '')}`
  const leitor = useRef<Html5Qrcode | null>(null)
  const [camera, setCamera] = useState<Camera>('parada')
  const [erroCamera, setErroCamera] = useState<string | null>(null)

  // Saiu da tela com a câmera ligada: desliga a câmera.
  useEffect(() => () => void desligar(leitor), [])

  async function abrirCamera() {
    setErroCamera(null)
    setCamera('abrindo')
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      const instancia = new Html5Qrcode(idVisor, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      leitor.current = instancia
      let lido = false
      await instancia.start(
        { facingMode: 'environment' },
        { fps: 10, aspectRatio: 1 },
        (texto) => {
          if (lido) return
          lido = true
          void desligar(leitor).then(() => aoLer({ qr: texto.trim(), simulada: false }))
        },
        () => {}, // quadro sem QR: continua procurando
      )
      // A tela pode ter saído enquanto a câmera abria.
      if (leitor.current === instancia) setCamera('lendo')
      else await instancia.stop().catch(() => {})
    } catch (erro) {
      leitor.current = null
      setCamera('parada')
      setErroCamera(mensagemDaCamera(erro))
    }
  }

  async function fecharCamera() {
    await desligar(leitor)
    setCamera('parada')
  }

  async function simular() {
    await desligar(leitor)
    aoLer({ qr: QR_DA_ANA, simulada: true })
  }

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-md border border-dashed border-line-strong p-6">
      <div
        className={cx(
          'relative flex-none overflow-hidden rounded-md bg-surface-sunken',
          camera === 'parada' ? 'size-40' : 'size-64',
        )}
      >
        {/* A html5-qrcode desenha o vídeo aqui dentro; o React não põe nada neste div. */}
        <div id={idVisor} className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
        <Cantos />
      </div>

      <div className="flex min-w-[240px] flex-1 flex-col items-start gap-3">
        <h2 className="text-title-sm">Leia o QR da carteira do cliente</h2>
        <p className="text-body-sm text-ink-muted">
          {camera === 'lendo'
            ? 'Aponte a câmera para o QR no celular do cliente.'
            : 'A ficha, as reservas e os cupons dele aparecem aqui.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {camera === 'lendo' ? (
            <Button onClick={fecharCamera}>Fechar câmera</Button>
          ) : (
            <Button variant="primary" icon="camera" disabled={camera === 'abrindo'} onClick={abrirCamera}>
              {camera === 'abrindo' ? 'Abrindo a câmera…' : 'Ler com a câmera'}
            </Button>
          )}
          <Button variant="ghost" onClick={simular}>
            Simular leitura
          </Button>
        </div>
        {erroCamera && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {erroCamera}
          </p>
        )}
        <p className="text-caption text-ink-muted">Simular leitura abre a carteira da Ana, para a demonstração.</p>
      </div>
    </div>
  )
}

/** Os quatro cantos do visor, em marrom, como no protótipo. */
function Cantos() {
  const canto = 'absolute size-7 border-marrom'
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <span className={cx(canto, 'left-3.5 top-3.5 border-l-[3px] border-t-[3px]')} />
      <span className={cx(canto, 'right-3.5 top-3.5 border-r-[3px] border-t-[3px]')} />
      <span className={cx(canto, 'bottom-3.5 left-3.5 border-b-[3px] border-l-[3px]')} />
      <span className={cx(canto, 'bottom-3.5 right-3.5 border-b-[3px] border-r-[3px]')} />
    </div>
  )
}

async function desligar(leitor: RefObject<Html5Qrcode | null>) {
  const instancia = leitor.current
  leitor.current = null
  if (!instancia) return
  try {
    if (instancia.isScanning) await instancia.stop()
    instancia.clear()
  } catch {
    // Já estava parada.
  }
}

function mensagemDaCamera(erro: unknown) {
  const texto = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro)
  if (!window.isSecureContext) return 'A câmera só abre em https ou em localhost.'
  if (/NotAllowed|Permission/i.test(texto)) {
    return 'A câmera foi bloqueada. Libere o acesso nas permissões do navegador e tente de novo.'
  }
  if (/NotFound|not found|no camera/i.test(texto)) return 'Não achamos uma câmera neste aparelho.'
  if (/NotReadable|in use|Could not start/i.test(texto)) {
    return 'A câmera está em uso por outro programa. Feche o programa e tente de novo.'
  }
  return 'Não deu para abrir a câmera. Tente de novo.'
}
