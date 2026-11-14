import { CapiTirana } from '../componentes'
import { EQUIPE } from './equipe'
import { RECADO_DO_PISO_13 } from './falas'
import { Personagem } from './Personagem'
import { Rachaduras } from './Rachaduras'

/**
 * O Piso 13, que aparece no seletor de piso do mapa depois de 13 toques: um andar escuro, sem
 * planta, com o recado do tirano e a equipe assustada. Parado: nada treme nem pisca.
 */
export function Piso13() {
  return (
    <div className="relative grid h-[58dvh] min-h-[300px] place-items-center overflow-hidden rounded-lg bg-terra p-4 text-center text-on-terra md:h-full">
      <Rachaduras className="absolute inset-0 size-full opacity-70" />
      <div className="relative flex max-w-sm flex-col items-center gap-3 rounded-md bg-terra p-4">
        <span className="grid size-20 place-items-center rounded-full bg-terra ring-2 ring-ouro">
          <CapiTirana className="size-14" />
        </span>
        <h2 className="text-title-md">Piso 13</h2>
        <p className="text-body">{RECADO_DO_PISO_13}</p>
        <p className="text-body-sm">A equipe se escondeu aqui embaixo.</p>
        <div className="flex gap-2">
          {EQUIPE.map((pessoa) => (
            <Personagem key={pessoa.nome} nome={pessoa.nome} pose="assustado" className="size-12" />
          ))}
        </div>
      </div>
    </div>
  )
}
