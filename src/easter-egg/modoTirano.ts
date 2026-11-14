// O modo tirano: o estado global do easter egg, lembrado na sessão (sessionStorage). Fechar a aba
// acende as luzes; recarregar a página, não. Sem React e sem DOM, para os testes de unidade:
// a tela lê pelo hook useModoTirano (useModoTirano.ts).
//
//   normal ──acordar()──▶ apagando ──terminarApagao()──▶ tirano ──acender()──▶ normal
//
// O apagão (Apagao.tsx) é a passagem: dura poucos segundos e não é lembrado. O nível Tirano da
// carteira sobe uma vez por sessão: depois da animação, nivelVisto fica true.

export interface EstadoDoTirano {
  /** O app está no modo tirano: luzes apagadas, mapa no escuro, Loja 13 e nível Tirano. */
  ligado: boolean
  /** O apagão está passando na tela. */
  apagando: boolean
  /** A carteira já mostrou a subida para o nível Tirano nesta sessão. */
  nivelVisto: boolean
  /** Conta as vezes que as luzes acenderam, para a tela mostrar o clarão. */
  acesas: number
}

/** O que o modo usa do sessionStorage (os testes passam um de mentira). */
export interface Armazem {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export const CHAVE_DO_TIRANO = 'capi.tirano'

const NORMAL: EstadoDoTirano = { ligado: false, apagando: false, nivelVisto: false, acesas: 0 }

function lerGuardado(armazem: Armazem | undefined): EstadoDoTirano {
  try {
    const guardado = JSON.parse(armazem?.getItem(CHAVE_DO_TIRANO) ?? 'null') as Partial<EstadoDoTirano> | null
    if (!guardado?.ligado) return NORMAL
    return { ...NORMAL, ligado: true, nivelVisto: guardado.nivelVisto === true }
  } catch {
    return NORMAL
  }
}

export interface ModoTirano {
  /** O estado agora. O mesmo objeto até a próxima mudança (para o useSyncExternalStore). */
  estado: () => EstadoDoTirano
  /** "Acordar o tirano": começa o apagão. Com o tirano já acordado, nada muda. */
  acordar: () => void
  /** O apagão terminou: o app entra no modo tirano e a sessão lembra. */
  terminarApagao: () => void
  /** "Acender as luzes": sai do modo e tudo volta ao normal. */
  acender: () => void
  /** A carteira mostrou a subida para o nível Tirano. */
  marcarNivelVisto: () => void
  assinar: (ouvinte: () => void) => () => void
}

export function criarModoTirano(armazem: Armazem | undefined): ModoTirano {
  let estado = lerGuardado(armazem)
  const ouvintes = new Set<() => void>()

  function mudar(novo: Partial<EstadoDoTirano>) {
    estado = { ...estado, ...novo }
    try {
      if (estado.ligado) armazem?.setItem(CHAVE_DO_TIRANO, JSON.stringify({ ligado: true, nivelVisto: estado.nivelVisto }))
      else armazem?.removeItem(CHAVE_DO_TIRANO)
    } catch {
      // Sem onde guardar (aba anônima, bloqueado): o modo vale até recarregar a página.
    }
    ouvintes.forEach((ouvinte) => ouvinte())
  }

  return {
    estado: () => estado,
    acordar() {
      if (!estado.ligado && !estado.apagando) mudar({ apagando: true })
    },
    terminarApagao() {
      if (estado.apagando) mudar({ apagando: false, ligado: true })
    },
    acender() {
      if (estado.ligado || estado.apagando) {
        mudar({ ligado: false, apagando: false, nivelVisto: false, acesas: estado.acesas + 1 })
      }
    },
    marcarNivelVisto() {
      if (estado.ligado && !estado.nivelVisto) mudar({ nivelVisto: true })
    },
    assinar(ouvinte) {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
  }
}

/** O sessionStorage, se der para usar. */
export function armazemDaSessao(): Armazem | undefined {
  try {
    return (globalThis as { sessionStorage?: Armazem }).sessionStorage
  } catch {
    return undefined
  }
}

/** O modo do app: um só, para todas as telas. */
export const modoTirano = criarModoTirano(armazemDaSessao())
