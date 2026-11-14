// O som de reserva nova: duas notas curtas e suaves, feitas na hora com a Web Audio API (sem
// arquivo de áudio para baixar). O navegador só deixa tocar som depois de um toque ou de uma tecla
// na página, então o áudio é preparado no primeiro gesto do lojista. Sem áudio (navegador antigo,
// som bloqueado), nada acontece: o selo e o aviso do leitor de tela continuam.

type ComAudioAntigo = typeof globalThis & { webkitAudioContext?: typeof AudioContext }

let contexto: AudioContext | null = null

function abrirAudio() {
  if (contexto) return contexto
  try {
    const Audio = globalThis.AudioContext ?? (globalThis as ComAudioAntigo).webkitAudioContext
    contexto = Audio ? new Audio() : null
  } catch {
    contexto = null
  }
  return contexto
}

function acordar(audio: AudioContext) {
  if (audio.state === 'suspended') audio.resume().catch(() => {})
}

/** Prepara o áudio no primeiro toque ou tecla. Devolve a função que tira os ouvintes. */
export function prepararSomNoPrimeiroGesto() {
  const preparar = () => {
    const audio = abrirAudio()
    if (audio) acordar(audio)
    tirar()
  }
  const tirar = () => {
    window.removeEventListener('pointerdown', preparar)
    window.removeEventListener('keydown', preparar)
  }
  window.addEventListener('pointerdown', preparar)
  window.addEventListener('keydown', preparar)
  return tirar
}

/** As duas notas (lá e mi, subindo), cada uma com 0,12 s e o volume baixo, sem estalo no começo e no fim. */
const NOTAS = [
  { hz: 880, inicio: 0 },
  { hz: 1318.5, inicio: 0.15 },
]
const DURACAO_DA_NOTA = 0.12
const VOLUME = 0.18

export function tocarSomDeReservaNova() {
  try {
    const audio = abrirAudio()
    if (!audio) return
    acordar(audio)
    const agora = audio.currentTime
    for (const nota of NOTAS) {
      const inicio = agora + nota.inicio
      const oscilador = audio.createOscillator()
      const volume = audio.createGain()
      oscilador.type = 'sine'
      oscilador.frequency.value = nota.hz
      volume.gain.setValueAtTime(0.0001, inicio)
      volume.gain.exponentialRampToValueAtTime(VOLUME, inicio + 0.015)
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + DURACAO_DA_NOTA)
      oscilador.connect(volume).connect(audio.destination)
      oscilador.start(inicio)
      oscilador.stop(inicio + DURACAO_DA_NOTA + 0.02)
    }
  } catch {
    // Sem áudio: o selo e o aviso por escrito bastam.
  }
}
