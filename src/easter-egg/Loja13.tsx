import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { Button } from '../componentes'
import { APP_NOME } from '../config'
import { comMovimento, DURACAO, useEntrada, useGSAP } from '../movimento'
import { EQUIPE, inicial, ORIENTADORES, type Pose } from './equipe'
import { Personagem } from './Personagem'
import { Rachaduras } from './Rachaduras'
import { useModoTirano } from './useModoTirano'

/**
 * Loja 13: a loja que só existe no modo tirano, no fim da trilha de rachaduras do mapa. O
 * letreiro "Tyranitar" acende (duas piscadas, abaixo do limite de três por segundo; com movimento
 * reduzido, só aparece) e a equipe, que estava assustada no escuro, acena. Os créditos são a
 * equipe como lojistas do andar secreto e os orientadores. Daqui se sobe para o nível Tirano.
 */
export default function Loja13() {
  const { ligado } = useModoTirano()
  const navigate = useNavigate()
  const tela = useEntrada<HTMLDivElement>()
  const letreiro = useRef<HTMLDivElement>(null)
  const [pose, setPose] = useState<Pose>('assustado')

  useGSAP(
    () => {
      const nome = letreiro.current?.querySelector('[data-letreiro]')
      if (!nome) return
      const acenar = () => setPose('acenando')
      const mm = comMovimento(
        () => {
          gsap
            .timeline({ onComplete: acenar })
            .set(nome, { opacity: 0.15 })
            .to(nome, { opacity: 1, duration: 0.06 }, 0.35)
            .to(nome, { opacity: 0.3, duration: 0.06 }, 0.5)
            .to(nome, { opacity: 1, duration: 0.3 }, 0.9)
        },
        () => {
          gsap.fromTo(nome, { opacity: 0 }, { opacity: 1, duration: DURACAO.rapida, onComplete: acenar })
        },
      )
      return () => mm.revert()
    },
    { scope: letreiro },
  )

  // Com as luzes acesas, a Loja 13 não existe.
  if (!ligado) return <Navigate to="/inicio" replace />

  return (
    <div ref={tela} className="flex flex-col gap-6 px-4 py-6">
      <title>{`Loja 13 · ${APP_NOME}`}</title>

      <div data-anim ref={letreiro} className="relative overflow-hidden rounded-lg bg-terra px-6 py-8 text-center text-on-terra">
        <Rachaduras className="absolute inset-0 size-full opacity-40" origem={{ x: 30, y: 60 }} quantas={4} />
        <p className="relative text-caption font-semibold uppercase tracking-widest">Andar secreto · Loja 13</p>
        <h1
          data-letreiro
          className="relative mt-2 font-display text-display text-ouro [text-shadow:0_0_14px_var(--ouro)]"
        >
          Tyranitar
        </h1>
        <p className="relative mx-auto mt-3 max-w-[30ch] text-body-sm">
          Aqui não se vende nada: só se agradece. Os lojistas do andar secreto fizeram este app.
        </p>
      </div>

      <section data-anim aria-labelledby="titulo-lojistas" className="flex flex-col gap-3">
        <h2 id="titulo-lojistas" className="text-title-sm text-marrom-ink">
          Lojistas do andar secreto
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EQUIPE.map((pessoa) => (
            <li key={pessoa.nome} className="flex items-center gap-4 rounded-md border bg-surface-raised p-4">
              <Personagem nome={pessoa.nome} pose={pose} className="size-20" />
              <div className="min-w-0">
                <h3 className="text-title-sm">{pessoa.nome}</h3>
                <p className="text-body-sm text-ink-muted">{pessoa.papel}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section data-anim aria-labelledby="titulo-orientadores" className="flex flex-col gap-3">
        <h2 id="titulo-orientadores" className="text-title-sm text-marrom-ink">
          Orientadores
        </h2>
        <ul className="flex flex-wrap gap-3">
          {ORIENTADORES.map((nome) => (
            <li key={nome} className="flex items-center gap-3 rounded-pill border bg-surface-raised py-2 pl-2 pr-4">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-terra text-label text-on-terra">
                {inicial(nome)}
              </span>
              <span className="text-label">{nome}</span>
            </li>
          ))}
        </ul>
      </section>

      <div data-anim className="flex flex-col items-start gap-3">
        <p className="text-body-sm text-ink-muted">Equipe Tyranitar · HackaRun 2026</p>
        <Button variant="primary" onClick={() => navigate('/carteira')}>
          Subir para o nível Tirano
        </Button>
      </div>
    </div>
  )
}
