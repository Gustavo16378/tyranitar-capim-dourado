import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../componentes'
import { Folha } from './Folha'

/** Tela de toque (celular): "Tirar foto" abre a câmera do sistema; no computador, a webcam no app. */
const TOQUE = '(pointer: coarse)'

const ehToque = () => typeof window !== 'undefined' && window.matchMedia(TOQUE).matches

/** O navegador sabe listar câmeras e abrir a webcam (num endereço seguro, https ou localhost). */
const temWebcam = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.enumerateDevices === 'function' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function'

export interface FolhaFotoProps {
  aberta: boolean
  onAbrir: () => void
  onFechar: () => void
  /** A foto tirada ou escolhida; quem chama anexa no campo. */
  onArquivo: (arquivo: File) => void
}

/**
 * A foto para a Capi: a folha do botão da câmera, com "Tirar foto" e "Escolher da galeria". No
 * celular, "Tirar foto" abre a câmera traseira direto (input com capture="environment") e a galeria
 * é o mesmo input sem capture. No computador, "Tirar foto" abre a webcam numa folha
 * (getUserMedia) com o botão de capturar; sem câmera, ou com a permissão negada, a folha mostra só
 * a galeria. A foto não vai sozinha: volta como arquivo, para ficar anexada no campo.
 */
export function FolhaFoto({ aberta, onAbrir, onFechar, onArquivo }: FolhaFotoProps) {
  const camera = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const [webcam, setWebcam] = useState(false)
  /** Computador sem câmera, ou que negou a permissão: só a galeria. */
  const [semCamera, setSemCamera] = useState<'sem-camera' | 'negada' | null>(null)
  const toque = ehToque()

  // No computador, confere se há câmera quando a folha abre.
  useEffect(() => {
    if (!aberta || toque || semCamera || !temWebcam()) return
    let cancelado = false
    navigator.mediaDevices
      .enumerateDevices()
      .then((lista) => {
        if (!cancelado && !lista.some((d) => d.kind === 'videoinput')) setSemCamera('sem-camera')
      })
      .catch(() => {
        if (!cancelado) setSemCamera('sem-camera')
      })
    return () => {
      cancelado = true
    }
  }, [aberta, toque, semCamera])

  function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Limpa o seletor para dar para escolher a mesma foto de novo.
    evento.target.value = ''
    if (arquivo) onArquivo(arquivo)
  }

  function tirarFoto() {
    onFechar()
    if (toque) camera.current?.click()
    else setWebcam(true)
  }

  function escolherDaGaleria() {
    onFechar()
    galeria.current?.click()
  }

  const soGaleria = !toque && (semCamera !== null || !temWebcam())

  return (
    <>
      <Folha aberta={aberta} onFechar={onFechar} titulo="Foto ou print">
        {soGaleria && (
          <p role="status" className="text-body-sm text-ink-muted">
            {semCamera === 'negada'
              ? 'Não deu para usar a câmera: a permissão foi negada. Escolha uma foto ou um print da galeria.'
              : 'Não achei uma câmera neste aparelho. Escolha uma foto ou um print da galeria.'}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {!soGaleria && (
            <Button icon="camera" block onClick={tirarFoto}>
              Tirar foto
            </Button>
          )}
          <Button block onClick={escolherDaGaleria}>
            Escolher da galeria
          </Button>
        </div>
      </Folha>

      <FolhaWebcam
        key={webcam ? 'aberta' : 'fechada'}
        aberta={webcam}
        onFechar={() => setWebcam(false)}
        onFoto={(arquivo) => {
          setWebcam(false)
          onArquivo(arquivo)
        }}
        onFalha={() => {
          // Sem permissão (ou a câmera sumiu): volta à folha, só com a galeria.
          setWebcam(false)
          setSemCamera('negada')
          onAbrir()
        }}
      />

      {/* "Tirar foto" no celular: a câmera traseira direto. "Escolher da galeria": sem capture. */}
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={aoEscolher} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={aoEscolher} />
    </>
  )
}

/** A webcam do computador numa folha: a imagem ao vivo e o botão de capturar. */
function FolhaWebcam({
  aberta,
  onFechar,
  onFoto,
  onFalha,
}: {
  aberta: boolean
  onFechar: () => void
  onFoto: (arquivo: File) => void
  onFalha: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [pronta, setPronta] = useState(false)
  /** O callback mais recente, sem reabrir a câmera a cada render. */
  const falhar = useRef(onFalha)
  useEffect(() => {
    falhar.current = onFalha
  }, [onFalha])

  useEffect(() => {
    if (!aberta) return
    let cancelado = false
    let fluxo: MediaStream | null = null
    const elemento = video.current
    const pedido = temWebcam()
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      : Promise.reject(new Error('Sem webcam neste navegador.'))
    pedido
      .then((s) => {
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        fluxo = s
        if (elemento) elemento.srcObject = s
      })
      .catch(() => {
        if (!cancelado) falhar.current()
      })
    return () => {
      cancelado = true
      fluxo?.getTracks().forEach((t) => t.stop())
      if (elemento) elemento.srcObject = null
    }
  }, [aberta])

  function capturar() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const quadro = document.createElement('canvas')
    quadro.width = v.videoWidth
    quadro.height = v.videoHeight
    quadro.getContext('2d')?.drawImage(v, 0, 0)
    quadro.toBlob((blob) => blob && onFoto(new File([blob], 'foto.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9)
  }

  return (
    <Folha aberta={aberta} onFechar={onFechar} titulo="Tirar foto">
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        aria-label="Imagem da câmera"
        onLoadedData={() => setPronta(true)}
        className="aspect-[4/3] w-full rounded-md bg-terra object-cover"
      />
      <Button variant="primary" icon="camera" block disabled={!pronta} onClick={capturar}>
        Capturar
      </Button>
    </Folha>
  )
}
