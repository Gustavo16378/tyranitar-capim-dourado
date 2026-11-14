// Liga o tyranitar() do console (src/tirano.ts) ao modo tirano do app: o evento "tyranitar:acordar"
// acorda o tirano como o botão "Acordar o tirano" da Capi. O ouvinte fica no window desde o início
// (src/main.tsx), então vale em qualquer tela; o apagão passa quando a pessoa está no app.
import { EVENTO_ACORDAR } from '../tirano'
import { modoTirano } from './modoTirano'

export function ouvirOTiranoDoConsole(alvo: Pick<EventTarget, 'addEventListener'>) {
  alvo.addEventListener(EVENTO_ACORDAR, () => modoTirano.acordar())
}
