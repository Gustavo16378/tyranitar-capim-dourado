// Easter egg do console, tema "O tirano da sexta-feira 13" (equipe Tyranitar). Ao carregar o
// site (src/main.tsx), o console do navegador mostra o banner TYRANITAR e a dica; quem digita
// tyranitar() acorda o tirano.
//
// O evento: tyranitar() dispara "tyranitar:acordar" no window (um Event comum, sem dados), a cada
// chamada. Este arquivo só avisa; quem liga o modo do tirano no app escuta o evento:
//
//   window.addEventListener('tyranitar:acordar', () => { ... })
//
// Não troque o nome do evento sem trocar também quem escuta.

/** O evento global que tyranitar() dispara no window. */
export const EVENTO_ACORDAR = 'tyranitar:acordar'

/** TYRANITAR em letras de ASCII puro, para qualquer console. */
export const BANNER = String.raw`
 _____  __   __  ____       _      _   _   ___   _____      _      ____
|_   _| \ \ / / |  _ \     / \    | \ | | |_ _| |_   _|    / \    |  _ \
  | |    \ V /  | |_) |   / _ \   |  \| |  | |    | |     / _ \   | |_) |
  | |     | |   |  _ <   / ___ \  | |\  |  | |    | |    / ___ \  |  _ <
  |_|     |_|   |_| \_\ /_/   \_\ |_| \_| |___|   |_|   /_/   \_\ |_| \_\
`.slice(1, -1)

export const LEGENDA = 'o tirano da sexta-feira 13'

export const DICA = 'digite tyranitar() para acordar o tirano'

/** O que o console mostra depois de tyranitar(). */
export const ACORDOU = 'O tirano acordou.'

// O console aceita CSS em %c. Vermelho legível no console claro e no escuro.
const ESTILO_BANNER = 'color:#e5484d;font-family:monospace;font-weight:700;line-height:1.15'
const ESTILO_LEGENDA = 'color:#e5484d;font-family:monospace'
const ESTILO_DICA = 'font-family:monospace;font-weight:700'

declare global {
  interface Window {
    /** Easter egg do console: dispara EVENTO_ACORDAR no window (src/tirano.ts). */
    tyranitar?: () => string
  }
}

/** O window, ou um EventTarget qualquer nos testes. */
type Alvo = EventTarget & { tyranitar?: () => string }

/** Mostra o banner e a dica no console e põe tyranitar() no alvo (o window, no app). */
export function instalarTirano(alvo: Alvo, saida: Pick<typeof console, 'log'>) {
  saida.log(`%c${BANNER}\n%c${LEGENDA}\n\n%c${DICA}`, ESTILO_BANNER, ESTILO_LEGENDA, ESTILO_DICA)
  alvo.tyranitar = () => {
    alvo.dispatchEvent(new Event(EVENTO_ACORDAR))
    return ACORDOU
  }
}
