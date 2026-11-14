// Mapa 3D de um piso (RF10): as lojas da planta levantadas como blocos (SVGLoader +
// ExtrudeGeometry), a loja buscada em destaque, a rota da entrada até ela (Dijkstra) se
// desenhando e a câmera voando até lá com GSAP. Um piso por vez: os pisos têm escalas
// diferentes. Para rodar bem no celular: cores sólidas, sem sombras e renderizando só
// quando algo muda (frameloop "demand").
import { Edges, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref, type RefObject } from 'react'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { cx } from '../componentes/cx'
import { LOJA_13, trilhaDeRachaduras } from '../easter-egg/lugarDaLoja13'
import { comMovimento, DURACAO, EASE } from '../movimento'
import { useCoresDoMapa, type CoresDoMapa } from './cores'
import { acharNaPlanta, CAIXAS, GRAFO, LOJAS_DA_PLANTA, PLANTAS, rotaAte } from './dados'
import { acharEntrada } from './entradas'
import { alturaDoPiso, ESPESSURA_DO_PISO, etiquetasDoPiso, type Etiqueta } from './etiquetas'
import { RotulosDasLojas } from './Rotulos'
import { trechoDaRota, type Piso, type Rota } from './grafo'
import { lojasGrandes } from './nomesNaPlanta'
import type { Caixa } from './svg'

/** O que os botões da tela (fora do canvas) pedem ao mapa. */
export interface ControleDoMapa {
  aproximar: () => void
  afastar: () => void
  /** Volta ao enquadramento da rota (ou do piso inteiro). */
  recentralizar: () => void
}

/** O que o mapa usa dos OrbitControls do drei. */
interface Orbita {
  target: THREE.Vector3
  minDistance: number
  maxDistance: number
  update: () => void
}

/** Quanto cada toque em aproximar (ou afastar, ao contrário) muda a distância da câmera. */
const PASSO_DO_ZOOM = 0.7

/**
 * As etiquetas (nome da loja, entrada, "Você está aqui", de etiquetas.ts) são HTML do próprio app,
 * numa camada por cima do canvas, nítidas em qualquer zoom. Só as das entradas pegam o toque (a
 * pessoa escolhe por onde chegou); as outras deixam o toque passar para o mapa. O Projetor, dentro
 * da cena, leva cada uma até o ponto 3D dela a cada quadro desenhado.
 */
const ETIQUETA =
  'absolute left-0 top-0 select-none whitespace-nowrap rounded-pill border px-2 py-0.5 text-caption shadow-card invisible'

const ESTILO_DA_ETIQUETA = {
  loja: 'border-line bg-surface-raised text-ink',
  escolhida: 'border-marrom bg-surface-raised font-semibold text-ink',
  entrada: 'border-line-strong bg-surface-raised text-ink',
  voce: 'border-cerrado bg-cerrado font-semibold text-on-cerrado',
} as const

/** Dentro da cena: põe cada etiqueta sobre o seu ponto 3D, ou a esconde se ele saiu da tela. */
function Projetor({ etiquetas, elementos }: { etiquetas: Etiqueta[]; elementos: RefObject<Map<string, HTMLElement>> }) {
  const invalidate = useThree((s) => s.invalidate)
  // Etiqueta nova precisa de um quadro para achar o lugar (o mapa só desenha quando algo muda).
  useEffect(() => invalidate(), [etiquetas, invalidate])
  const ponto = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const etiqueta of etiquetas) {
      const el = elementos.current.get(etiqueta.id)
      if (!el) continue
      ponto.set(...etiqueta.posicao).project(camera)
      const fora = ponto.z > 1 || Math.abs(ponto.x) > 1.1 || Math.abs(ponto.y) > 1.1
      el.style.visibility = fora ? 'hidden' : 'visible'
      if (!fora) {
        const x = ((ponto.x + 1) / 2) * size.width
        const y = ((1 - ponto.y) / 2) * size.height
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      }
    }
  })
  return null
}

export interface Mapa3DProps {
  piso: Piso
  /** mapa_id da loja buscada: fica em destaque e a rota vai até ela, se for deste piso. */
  destino?: string
  /** Nomes das lojas ativas (GET /api/lojas). Com a lista, as que não estão nela aparecem como vagas. */
  nomes?: Record<string, string>
  /**
   * A entrada por onde o cliente disse que chegou (src/mapa/entradas.ts): a rota sai dela e ela
   * vira "Você está aqui". Sem ela, a rota sai da entrada mais próxima e nenhuma vira.
   */
  origem?: string
  onSelecionarLoja?: (mapaId: string) => void
  /** Tocar numa entrada (o marco ou a etiqueta) escolhe ela como ponto de partida. */
  onSelecionarEntrada?: (entradaId: string) => void
  /** Para os botões de aproximar, afastar e recentralizar. */
  controle?: Ref<ControleDoMapa>
  /**
   * O mapa no escuro do modo tirano (docs/easter-egg.md): as luzes apagadas, uma lanterna que segue
   * o dedo ou o mouse e, no térreo, a trilha de rachaduras até a Loja 13, que só existe assim.
   */
  escuro?: boolean
  /** Tocar na Loja 13 do mapa no escuro. */
  onLoja13?: () => void
}

interface Bloco {
  id: string
  formas: THREE.Shape[]
}

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
  brilho,
  ...eventos
}: {
  formas: THREE.Shape[]
  base: number
  altura: number
  cor: string
  realce?: string
  /** Cor do contorno das arestas (as lojas; o chão fica sem). */
  contorno?: string
  /** Quanto o bloco brilha sozinho, sem luz (a Loja 13 no escuro). */
  brilho?: number
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const geometria = useMemo(
    () => new THREE.ExtrudeGeometry(formas, { depth: altura, bevelEnabled: false }),
    [formas, altura],
  )
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh geometry={geometria} rotation-x={Math.PI / 2} position-y={base + altura} {...eventos}>
      <meshLambertMaterial color={cor} emissive={realce ?? cor} emissiveIntensity={brilho ?? (realce ? 0.35 : 0)} />
      {contorno && <Edges color={contorno} threshold={20} />}
    </mesh>
  )
}

/**
 * Enquadramento da câmera: o piso inteiro, ou a rota e a loja buscada. Com a tela em pé
 * (celular), a câmera recua mais, para nada ficar de fora pelos lados.
 */
function enquadrar(caixa: Caixa, foco: { x: number; y: number }[], proporcao: number) {
  const pontos = foco.length
    ? foco
    : [
        { x: caixa.x, y: caixa.y },
        { x: caixa.x + caixa.largura, y: caixa.y + caixa.altura },
      ]
  const xs = pontos.map((p) => p.x)
  const ys = pontos.map((p) => p.y)
  const centro = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  const tamanho = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    Math.max(caixa.largura, caixa.altura) * 0.4,
  )
  const distancia = (tamanho * 1.45) / Math.min(1, Math.max(0.45, proporcao))
  return {
    alvo: new THREE.Vector3(centro.x, 0, centro.y),
    posicao: new THREE.Vector3(centro.x, distancia * 0.85, centro.y + distancia * 0.6),
  }
}

/** Leva câmera e controles até o enquadramento, com GSAP (ou direto, com movimento reduzido). */
function Camera({ alvo, posicao, vez }: { alvo: THREE.Vector3; posicao: THREE.Vector3; vez: number }) {
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
        tl.to(
          camera.position,
          { x: posicao.x, y: posicao.y, z: posicao.z, duration: DURACAO.lenta, ease: EASE.suave },
          0,
        )
        if (orbita)
          tl.to(orbita.target, { x: alvo.x, y: alvo.y, z: alvo.z, duration: DURACAO.lenta, ease: EASE.suave }, 0)
      },
      () => {
        camera.position.copy(posicao)
        orbita?.target.copy(alvo)
        atualizar()
      },
    )
    // kill sem reverter: a câmera fica onde chegou.
    return () => mm.kill(false)
    // vez muda quando a pessoa pede para recentralizar.
  }, [alvo, posicao, vez, camera, controls, invalidate])
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
      {trecho.length > 1 && (
        <Line points={trecho.map((p) => [p.x, altura, p.y] as const)} color={cores.rota} lineWidth={5} />
      )}
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

/** Aproximar, afastar e recentralizar, a pedido dos botões da tela. */
function useControleDoMapa(controle: Ref<ControleDoMapa> | undefined, recentralizar: () => void) {
  const { camera, controls, invalidate } = useThree()
  const animacao = useRef<gsap.MatchMedia | null>(null)
  useEffect(() => () => void animacao.current?.kill(false), [])
  useImperativeHandle(controle, () => {
    const zoom = (fator: number) => {
      const orbita = controls as unknown as Orbita | null
      if (!orbita) return
      const direcao = camera.position.clone().sub(orbita.target)
      const distancia = THREE.MathUtils.clamp(direcao.length() * fator, orbita.minDistance, orbita.maxDistance)
      const destino = orbita.target.clone().add(direcao.setLength(distancia))
      const atualizar = () => {
        orbita.update()
        invalidate()
      }
      animacao.current?.kill(false)
      animacao.current = comMovimento(
        () => {
          gsap.to(camera.position, {
            x: destino.x,
            y: destino.y,
            z: destino.z,
            duration: DURACAO.rapida,
            ease: EASE.saida,
            onUpdate: atualizar,
          })
        },
        () => {
          camera.position.copy(destino)
          atualizar()
        },
      )
    }
    return { aproximar: () => zoom(PASSO_DO_ZOOM), afastar: () => zoom(1 / PASSO_DO_ZOOM), recentralizar }
  }, [camera, controls, invalidate, recentralizar])
}

/**
 * A lanterna do mapa no escuro: uma luz acima do chão que vai para onde o dedo ou o mouse está
 * (o ponto do chão debaixo do ponteiro). Arrastar para girar o mapa também leva a luz junto.
 */
function Lanterna({ caixa, inicio, cor }: { caixa: Caixa; inicio: { x: number; y: number }; cor: string }) {
  const { gl, camera, invalidate } = useThree()
  const luz = useRef<THREE.PointLight>(null)
  const altura = Math.max(caixa.largura, caixa.altura) * 0.07
  useEffect(() => {
    const tela = gl.domElement
    const raio = new THREE.Raycaster()
    const chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const ponto = new THREE.Vector3()
    const ndc = new THREE.Vector2()
    const seguir = (evento: PointerEvent) => {
      const caixaDaTela = tela.getBoundingClientRect()
      ndc.set(
        ((evento.clientX - caixaDaTela.left) / caixaDaTela.width) * 2 - 1,
        -((evento.clientY - caixaDaTela.top) / caixaDaTela.height) * 2 + 1,
      )
      raio.setFromCamera(ndc, camera)
      if (luz.current && raio.ray.intersectPlane(chao, ponto)) {
        luz.current.position.set(ponto.x, altura, ponto.z)
        invalidate()
      }
    }
    tela.addEventListener('pointermove', seguir)
    tela.addEventListener('pointerdown', seguir)
    return () => {
      tela.removeEventListener('pointermove', seguir)
      tela.removeEventListener('pointerdown', seguir)
    }
  }, [gl, camera, invalidate, altura])
  // Forte no centro e sumindo em uns 1,5 × a altura: um círculo de luz, não o piso inteiro.
  return (
    <pointLight
      ref={luz}
      position={[inicio.x, altura, inicio.y]}
      color={cor}
      intensity={Math.PI * 1.4 * altura * altura}
      distance={altura * 4}
      decay={2}
    />
  )
}

/** A trilha de rachaduras até a Loja 13 (lugarDaLoja13.ts): linhas sem luz própria, que brilham no escuro. */
function TrilhaDeRachaduras({ altura, cor }: { altura: number; cor: string }) {
  const { tronco, galhos } = useMemo(() => trilhaDeRachaduras(), [])
  return (
    <group>
      <Line points={tronco.map((p) => [p.x, altura, p.y] as const)} color={cor} lineWidth={3} />
      {galhos.map((galho, i) => (
        <Line key={i} points={galho.map((p) => [p.x, altura, p.y] as const)} color={cor} lineWidth={2} />
      ))}
    </group>
  )
}

const FORMAS_DA_LOJA_13 = [new THREE.Shape(LOJA_13.pontos.map((p) => new THREE.Vector2(p.x, p.y)))]

function Cena({
  piso,
  destino,
  nomes,
  origem,
  onSelecionarLoja,
  onSelecionarEntrada,
  controle,
  escuro,
  onLoja13,
  sobre,
  setSobre,
  etiquetas,
  elementos,
}: Mapa3DProps & {
  sobre: string | null
  setSobre: (atualizar: (atual: string | null) => string | null) => void
  etiquetas: Etiqueta[]
  elementos: RefObject<Map<string, HTMLElement>>
}) {
  // No escuro, as lojas têm as cores do tema claro: a lanterna mostra cada uma como ela é.
  const cores = useCoresDoMapa(escuro ? 'light' : undefined)
  const comTrilha = Boolean(escuro && piso === LOJA_13.piso)
  const [vez, setVez] = useState(0)
  const recentralizar = useMemo(() => () => setVez((v) => v + 1), [])
  useControleDoMapa(controle, recentralizar)
  const entradas = useMemo(
    () => [...GRAFO.pontos.values()].filter((p) => p.tipo === 'entrada' && p.piso === piso),
    [piso],
  )
  const caixa = CAIXAS[piso]
  const altura = alturaDoPiso(caixa)
  const planta = useMemo(() => lerPlanta(PLANTAS[piso]), [piso])

  const achado = destino ? acharNaPlanta(destino) : undefined
  const destinoAqui = achado?.piso === piso ? destino : undefined
  const origemAqui = acharEntrada(origem)?.piso === piso ? origem : undefined
  const rota = useMemo(() => (destinoAqui ? rotaAte(destinoAqui, origemAqui) : null), [destinoAqui, origemAqui])
  const proporcao = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const { alvo, posicao } = useMemo(
    () =>
      enquadrar(
        caixa,
        // No escuro, sem loja buscada, a câmera abre na trilha até a Loja 13.
        rota ? [...rota.pontos, ...achado!.loja.pontos] : comTrilha ? [...trilhaDeRachaduras().tronco, ...LOJA_13.pontos] : [],
        proporcao,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- achado muda junto com a rota
    [caixa, rota, proporcao, comTrilha],
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
      {/* No escuro, quase nenhuma luz: o que se vê é a lanterna, a trilha e a Loja 13. */}
      <ambientLight intensity={escuro ? 0.08 : 1.7} />
      {!escuro && (
        <directionalLight position={[caixa.x, Math.max(caixa.largura, caixa.altura), caixa.y]} intensity={1.6} />
      )}
      {escuro && (
        <Lanterna
          caixa={caixa}
          inicio={comTrilha ? trilhaDeRachaduras().tronco[0] : { x: caixa.x + caixa.largura / 2, y: caixa.y + caixa.altura / 2 }}
          cor={cores.lanterna}
        />
      )}
      <OrbitControls
        makeDefault
        enableDamping={false}
        maxPolarAngle={Math.PI * 0.42}
        minDistance={altura * 3}
        maxDistance={Math.max(caixa.largura, caixa.altura) * 2}
      />
      <Camera alvo={alvo} posicao={posicao} vez={vez} />

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
            // As arestas não pegam luz: no escuro, elas acenderiam a planta inteira.
            contorno={escuro ? undefined : cores.borda}
            realce={sobre === bloco.id ? cores.borda : undefined}
            onPointerOver={(e) => {
              e.stopPropagation()
              setSobre(() => bloco.id)
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

      {comTrilha && (
        <>
          <TrilhaDeRachaduras altura={ESPESSURA_DO_PISO + 0.05} cor={cores.rachadura} />
          <Prisma
            formas={FORMAS_DA_LOJA_13}
            base={ESPESSURA_DO_PISO}
            altura={altura * 1.8}
            cor={cores.rachadura}
            brilho={0.55}
            onPointerOver={(e) => {
              e.stopPropagation()
              setSobre(() => LOJA_13.mapaId)
            }}
            onPointerOut={() => setSobre((atual) => (atual === LOJA_13.mapaId ? null : atual))}
            onClick={(e) => {
              e.stopPropagation()
              if (e.delta <= 6) onLoja13?.()
            }}
          />
        </>
      )}

      {nomes && !escuro && (
        <RotulosDasLojas
          piso={piso}
          nomes={nomes}
          destino={destinoAqui}
          cor={cores.texto}
          topo={(id) => ESPESSURA_DO_PISO + (id === destinoAqui ? altura * 2.2 : altura)}
        />
      )}

      {rota && <LinhaDaRota rota={rota} altura={ESPESSURA_DO_PISO + altura * 0.25} cores={cores} />}

      {/* Marco de cada entrada; a de onde sai a rota já tem o ponto do começo da linha. */}
      {entradas.map((entrada) => (
        <group key={entrada.id} position={[entrada.x, ESPESSURA_DO_PISO + altura * 0.15, entrada.y]}>
          {rota?.pontos[0]?.id !== entrada.id && (
            <mesh>
              <cylinderGeometry args={[altura * 0.9, altura * 0.9, altura * 0.3, 24]} />
              <meshLambertMaterial color={cores.entrada} />
            </mesh>
          )}
          {/* A área de toque: maior que o marco (pequeno no celular) e invisível. A entrada já
              escolhida não precisa dela. */}
          {onSelecionarEntrada && entrada.id !== origemAqui && (
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation()
                setSobre(() => entrada.id)
              }}
              onPointerOut={() => setSobre((atual) => (atual === entrada.id ? null : atual))}
              onClick={(e) => {
                e.stopPropagation()
                if (e.delta <= 6) onSelecionarEntrada(entrada.id)
              }}
            >
              <cylinderGeometry args={[altura * 2.4, altura * 2.4, altura * 1.2, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}

      <Projetor etiquetas={etiquetas} elementos={elementos} />
    </>
  )
}

/** O mapa 3D de um piso. Ocupa o pai: dê a altura pelo contêiner. */
export function Mapa3D(props: Mapa3DProps) {
  const { piso, destino, nomes, origem, onSelecionarEntrada, escuro } = props
  const caixa = CAIXAS[piso]
  const inicial = enquadrar(caixa, [], 1)
  const [sobre, setSobre] = useState<string | null>(null)
  const elementos = useRef(new Map<string, HTMLElement>())
  const grandes = useMemo(() => lojasGrandes(LOJAS_DA_PLANTA[piso]), [piso])
  const achado = destino ? acharNaPlanta(destino) : undefined
  const destinoAqui = achado?.piso === piso ? destino : undefined
  const origemAqui = acharEntrada(origem)?.piso === piso ? origem : undefined
  const etiquetas = useMemo(() => {
    if (!escuro) return etiquetasDoPiso(piso, { destinoAqui, origem: origemAqui, sobre, nomes, grandes })
    // No escuro, os nomes das lojas somem: ficam as entradas, a loja buscada e a Loja 13.
    const acesas = etiquetasDoPiso(piso, { destinoAqui, origem: origemAqui, sobre: null, nomes, grandes: new Set() }).filter(
      (e) => e.entrada || e.estilo === 'escolhida',
    )
    if (piso !== LOJA_13.piso) return acesas
    const loja13: Etiqueta = {
      id: LOJA_13.mapaId,
      texto: 'Loja 13',
      posicao: [LOJA_13.centro.x, ESPESSURA_DO_PISO + alturaDoPiso(caixa) * 2.6, LOJA_13.centro.y],
      estilo: 'escolhida',
    }
    return [...acesas, loja13]
  }, [piso, destinoAqui, origemAqui, sobre, nomes, grandes, escuro, caixa])
  return (
    <div className="relative size-full">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{
          fov: 40,
          near: 0.5,
          far: Math.max(caixa.largura, caixa.altura) * 10,
          position: inicial.posicao.toArray(),
        }}
        className="touch-none"
      >
        <Cena {...props} sobre={sobre} setSobre={setSobre} etiquetas={etiquetas} elementos={elementos} />
      </Canvas>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {etiquetas.map((etiqueta) => {
          // A etiqueta de uma entrada escolhe a entrada. Pelo teclado e pelo leitor de tela, o
          // mesmo se faz no "Trocar a entrada" da tela, por isso ela fica fora do foco.
          const entrada = etiqueta.estilo === 'entrada' && onSelecionarEntrada ? etiqueta.entrada : undefined
          return (
            <span
              key={etiqueta.id}
              ref={(el) => {
                if (el) elementos.current.set(etiqueta.id, el)
                else elementos.current.delete(etiqueta.id)
              }}
              onClick={entrada ? () => onSelecionarEntrada?.(entrada) : undefined}
              className={cx(
                ETIQUETA,
                ESTILO_DA_ETIQUETA[etiqueta.estilo],
                entrada ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none',
              )}
            >
              {etiqueta.texto}
            </span>
          )
        })}
      </div>
    </div>
  )
}
