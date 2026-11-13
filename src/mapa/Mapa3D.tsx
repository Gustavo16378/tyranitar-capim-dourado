// Mapa 3D de um piso (RF10): as lojas da planta levantadas como blocos (SVGLoader +
// ExtrudeGeometry), a loja buscada em destaque, a rota da entrada até ela (Dijkstra) se
// desenhando e a câmera voando até lá com GSAP. Um piso por vez: os pisos têm escalas
// diferentes. Para rodar bem no celular: cores sólidas, sem sombras e renderizando só
// quando algo muda (frameloop "demand").
import { Edges, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { comMovimento, DURACAO, EASE } from '../movimento'
import { useCoresDoMapa, type CoresDoMapa } from './cores'
import { acharNaPlanta, CAIXAS, PLANTAS, rotaAte } from './dados'
import { trechoDaRota, type Piso, type Rota } from './grafo'
import type { Caixa } from './svg'

export interface Mapa3DProps {
  piso: Piso
  /** mapa_id da loja buscada: fica em destaque e a rota vai até ela, se for deste piso. */
  destino?: string
  /** Nomes das lojas ativas (GET /api/lojas). Com a lista, as que não estão nela aparecem como vagas. */
  nomes?: Record<string, string>
  onSelecionarLoja?: (mapaId: string) => void
}

interface Bloco {
  id: string
  formas: THREE.Shape[]
}

const ESPESSURA_DO_PISO = 0.3

/** Polígonos da planta como formas do three.js, separados em chão e lojas. */
function lerPlanta(svg: string) {
  const blocos: Bloco[] = []
  let chao: Bloco | null = null
  for (const caminho of new SVGLoader().parse(svg).paths) {
    const id = (caminho.userData?.node as Element | undefined)?.id
    if (!id) continue
    const bloco = { id, formas: SVGLoader.createShapes(caminho) }
    if (id === 'piso') chao = bloco
    else if (id.startsWith('loja-')) blocos.push(bloco)
  }
  return { chao, blocos }
}

/** Altura das lojas proporcional ao tamanho do piso (o térreo tem 370 m; a praça, 64 m). */
const alturaDoPiso = (caixa: Caixa) => Math.max(caixa.largura, caixa.altura) * 0.012

/**
 * Prisma de uma forma da planta. A planta usa x e y (y para baixo); no mundo 3D, y é a altura,
 * então girar 90° em x leva o y da planta para o z do mundo, mantendo a planta na mesma orientação.
 */
function Prisma({
  formas,
  base,
  altura,
  cor,
  realce,
  contorno,
  ...eventos
}: {
  formas: THREE.Shape[]
  base: number
  altura: number
  cor: string
  realce?: string
  /** Cor do contorno das arestas (as lojas; o chão fica sem). */
  contorno?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const geometria = useMemo(() => new THREE.ExtrudeGeometry(formas, { depth: altura, bevelEnabled: false }), [formas, altura])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh geometry={geometria} rotation-x={Math.PI / 2} position-y={base + altura} {...eventos}>
      <meshLambertMaterial color={cor} emissive={realce ?? cor} emissiveIntensity={realce ? 0.35 : 0} />
      {contorno && <Edges color={contorno} threshold={20} />}
    </mesh>
  )
}

/**
 * Enquadramento da câmera: o piso inteiro, ou a rota e a loja buscada. Com a tela em pé
 * (celular), a câmera recua mais, para nada ficar de fora pelos lados.
 */
function enquadrar(caixa: Caixa, foco: { x: number; y: number }[], proporcao: number) {
  const pontos = foco.length ? foco : [{ x: caixa.x, y: caixa.y }, { x: caixa.x + caixa.largura, y: caixa.y + caixa.altura }]
  const xs = pontos.map((p) => p.x)
  const ys = pontos.map((p) => p.y)
  const centro = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  const tamanho = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(caixa.largura, caixa.altura) * 0.4)
  const distancia = (tamanho * 1.45) / Math.min(1, Math.max(0.45, proporcao))
  return {
    alvo: new THREE.Vector3(centro.x, 0, centro.y),
    posicao: new THREE.Vector3(centro.x, distancia * 0.85, centro.y + distancia * 0.6),
  }
}

/** Leva câmera e controles até o enquadramento, com GSAP (ou direto, com movimento reduzido). */
function Camera({ alvo, posicao }: { alvo: THREE.Vector3; posicao: THREE.Vector3 }) {
  const { camera, controls, invalidate } = useThree()
  useEffect(() => {
    const orbita = controls as unknown as { target: THREE.Vector3; update: () => void } | null
    const atualizar = () => {
      orbita?.update()
      invalidate()
    }
    const mm = comMovimento(
      () => {
        const tl = gsap.timeline({ onUpdate: atualizar })
        tl.to(camera.position, { x: posicao.x, y: posicao.y, z: posicao.z, duration: DURACAO.lenta, ease: EASE.suave }, 0)
        if (orbita) tl.to(orbita.target, { x: alvo.x, y: alvo.y, z: alvo.z, duration: DURACAO.lenta, ease: EASE.suave }, 0)
      },
      () => {
        camera.position.copy(posicao)
        orbita?.target.copy(alvo)
        atualizar()
      },
    )
    // kill sem reverter: a câmera fica onde chegou.
    return () => mm.kill(false)
  }, [alvo, posicao, camera, controls, invalidate])
  return null
}

/** A rota se desenhando da entrada até a loja. */
function LinhaDaRota({ rota, altura, cores }: { rota: Rota; altura: number; cores: CoresDoMapa }) {
  const [fracao, setFracao] = useState(0)
  useEffect(() => {
    const estado = { fracao: 0 }
    const mm = comMovimento(
      () => {
        gsap.to(estado, {
          fracao: 1,
          duration: DURACAO.lenta,
          ease: EASE.suave,
          delay: DURACAO.media,
          onUpdate: () => setFracao(estado.fracao),
        })
      },
      () => setFracao(1),
    )
    return () => mm.kill(false)
  }, [rota])
  const trecho = trechoDaRota(rota.pontos, fracao)
  const inicio = rota.pontos[0]
  const fim = rota.pontos.at(-1)!
  return (
    <group>
      {trecho.length > 1 && <Line points={trecho.map((p) => [p.x, altura, p.y] as const)} color={cores.rota} lineWidth={5} />}
      {/* Onde a pessoa entra e onde ela chega. */}
      <mesh position={[inicio.x, altura, inicio.y]}>
        <cylinderGeometry args={[altura * 1.2, altura * 1.2, altura * 0.6, 24]} />
        <meshLambertMaterial color={cores.voce} />
      </mesh>
      {fracao >= 1 && (
        <mesh position={[fim.x, altura, fim.y]}>
          <cylinderGeometry args={[altura, altura, altura * 0.6, 24]} />
          <meshLambertMaterial color={cores.rota} />
        </mesh>
      )}
    </group>
  )
}

function Cena({ piso, destino, nomes, onSelecionarLoja }: Mapa3DProps) {
  const cores = useCoresDoMapa()
  const caixa = CAIXAS[piso]
  const altura = alturaDoPiso(caixa)
  const planta = useMemo(() => lerPlanta(PLANTAS[piso]), [piso])
  const [sobre, setSobre] = useState<string | null>(null)

  const achado = destino ? acharNaPlanta(destino) : undefined
  const destinoAqui = achado?.piso === piso ? destino : undefined
  const rota = useMemo(() => (destinoAqui ? rotaAte(destinoAqui) : null), [destinoAqui])
  const proporcao = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const { alvo, posicao } = useMemo(
    () => enquadrar(caixa, rota ? [...rota.pontos, ...achado!.loja.pontos] : [], proporcao),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- achado muda junto com a rota
    [caixa, rota, proporcao],
  )

  useEffect(() => {
    document.body.style.cursor = sobre ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [sobre])

  const corDaLoja = (id: string) =>
    id === destinoAqui ? cores.destaque : nomes && !nomes[id] ? cores.vaga : piso === 2 ? cores.alimentacao : cores.loja

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[caixa.x, Math.max(caixa.largura, caixa.altura), caixa.y]} intensity={1.6} />
      <OrbitControls makeDefault enableDamping={false} maxPolarAngle={Math.PI * 0.42} minDistance={altura * 3} maxDistance={Math.max(caixa.largura, caixa.altura) * 2} />
      <Camera alvo={alvo} posicao={posicao} />

      {planta.chao && <Prisma formas={planta.chao.formas} base={0} altura={ESPESSURA_DO_PISO} cor={cores.piso} />}
      {planta.blocos.map((bloco) => {
        const eDestino = bloco.id === destinoAqui
        return (
          <Prisma
            key={bloco.id}
            formas={bloco.formas}
            base={ESPESSURA_DO_PISO}
            altura={eDestino ? altura * 2.2 : altura}
            cor={corDaLoja(bloco.id)}
            contorno={cores.borda}
            realce={sobre === bloco.id ? cores.borda : undefined}
            onPointerOver={(e) => {
              e.stopPropagation()
              setSobre(bloco.id)
            }}
            onPointerOut={() => setSobre((atual) => (atual === bloco.id ? null : atual))}
            onClick={(e) => {
              e.stopPropagation()
              // Arrastar para girar o mapa não conta como toque na loja.
              if (e.delta <= 6) onSelecionarLoja?.(bloco.id)
            }}
          />
        )
      })}

      {rota && <LinhaDaRota rota={rota} altura={ESPESSURA_DO_PISO + altura * 0.25} cores={cores} />}
    </>
  )
}

/** O mapa 3D de um piso. Ocupa o pai: dê a altura pelo contêiner. */
export function Mapa3D(props: Mapa3DProps) {
  const caixa = CAIXAS[props.piso]
  const inicial = enquadrar(caixa, [], 1)
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.1, far: Math.max(caixa.largura, caixa.altura) * 10, position: inicial.posicao.toArray() }}
      className="touch-none"
    >
      <Cena {...props} />
    </Canvas>
  )
}
