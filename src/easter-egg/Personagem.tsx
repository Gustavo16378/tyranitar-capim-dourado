import { useState } from 'react'
import { cx } from '../componentes/cx'
import { caminhoDoPersonagem, inicial, type Pose } from './equipe'

/**
 * O personagem 2D de um integrante, na pose pedida (public/easter-egg/equipe/<nome>-<pose>.png).
 * Enquanto o PNG não existe (ou não carrega), fica o avatar com a inicial, nas cores dos tokens;
 * a imagem só aparece depois de carregar, sem o ícone de imagem quebrada. Decorativo: o nome vem
 * escrito ao lado.
 */
export function Personagem({ nome, pose, className }: { nome: string; pose: Pose; className?: string }) {
  const caminho = caminhoDoPersonagem(nome, pose)
  // O estado é por caminho: trocar a pose tenta o PNG novo do zero.
  const [carregado, setCarregado] = useState<string | null>(null)
  const [falhou, setFalhou] = useState<string | null>(null)
  const comImagem = carregado === caminho
  return (
    <span
      aria-hidden="true"
      data-personagem={pose}
      className={cx('relative grid flex-none place-items-center overflow-hidden rounded-full', !comImagem && 'bg-ouro-soft', className)}
    >
      {!comImagem && <span className="font-display text-title-md text-ouro-ink">{inicial(nome)}</span>}
      {falhou !== caminho && (
        <img
          src={caminho}
          alt=""
          loading="lazy"
          onLoad={() => setCarregado(caminho)}
          onError={() => setFalhou(caminho)}
          className={cx('absolute inset-0 size-full object-contain', !comImagem && 'opacity-0')}
        />
      )}
    </span>
  )
}
