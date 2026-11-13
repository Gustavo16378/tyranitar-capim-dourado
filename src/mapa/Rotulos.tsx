// Rótulos das lojas no mapa 3D: o nome de cada loja escrito em cima do bloco dela, deitado como
// numa planta impressa, do tamanho que cabe na loja. Só as lojas com nome (as ativas da API);
// as vagas ficam sem. O texto é desenhado num canvas com a fonte e a cor dos tokens.
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { LOJAS_DA_PLANTA } from './dados'
import type { Piso } from './grafo'

/** Tamanho da letra no canvas: grande, para o texto continuar nítido quando a câmera chega perto. */
const LETRA_PX = 96

function caixaDe(pontos: { x: number; y: number }[]) {
  const xs = pontos.map((p) => p.x)
  const ys = pontos.map((p) => p.y)
  return { largura: Math.max(...xs) - Math.min(...xs), altura: Math.max(...ys) - Math.min(...ys) }
}

/** O nome num canvas, como textura; devolve também a proporção (altura / largura). */
function texturaDoNome(nome: string, cor: string, fonte: string) {
  const canvas = document.createElement('canvas')
  const contexto = canvas.getContext('2d')!
  const estilo = `600 ${LETRA_PX}px ${fonte}`
  contexto.font = estilo
  canvas.width = Math.ceil(contexto.measureText(nome).width + LETRA_PX * 0.5)
  canvas.height = Math.ceil(LETRA_PX * 1.35)
  // Mudar o tamanho do canvas apaga o estilo: escreve de novo.
  contexto.font = estilo
  contexto.fillStyle = cor
  contexto.textAlign = 'center'
  contexto.textBaseline = 'middle'
  contexto.fillText(nome, canvas.width / 2, canvas.height / 2)
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 4
  return { textura, proporcao: canvas.height / canvas.width }
}

/** A fonte do app (--font-sans), quando ela já carregou; antes disso, a do sistema. */
function useFonteDoApp() {
  const ler = () => getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif'
  const [fonte, setFonte] = useState(ler)
  const [pronta, setPronta] = useState(false)
  useEffect(() => {
    let ativo = true
    document.fonts.ready.then(() => {
      if (!ativo) return
      setFonte(ler())
      setPronta(true)
    })
    return () => {
      ativo = false
    }
  }, [])
  return { fonte, pronta }
}

function Rotulo({ nome, x, z, y, largura, profundidade, cor, fonte }: {
  nome: string
  x: number
  z: number
  y: number
  largura: number
  profundidade: number
  cor: string
  fonte: string
}) {
  const { textura, proporcao } = useMemo(() => texturaDoNome(nome, cor, fonte), [nome, cor, fonte])
  useEffect(() => () => textura.dispose(), [textura])
  // Cabe na loja: até 85% da largura e metade da profundidade.
  let w = largura * 0.85
  if (w * proporcao > profundidade * 0.5) w = (profundidade * 0.5) / proporcao
  return (
    <mesh position={[x, y, z]} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[w, w * proporcao]} />
      {/* polygonOffset: o rótulo fica sempre por cima do teto da loja, sem piscar (z-fighting). */}
      <meshBasicMaterial
        map={textura}
        transparent
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  )
}

/** Os nomes das lojas do piso, em cima dos blocos. `topo` diz a altura do topo de cada loja. */
export function RotulosDasLojas({
  piso,
  nomes,
  cor,
  topo,
}: {
  piso: Piso
  nomes: Record<string, string>
  cor: string
  topo: (mapaId: string) => number
}) {
  const { fonte, pronta } = useFonteDoApp()
  const lojas = useMemo(
    () =>
      LOJAS_DA_PLANTA[piso]
        .filter((l) => nomes[l.mapaId])
        .map((l) => ({ ...l, caixa: caixaDe(l.pontos), nome: nomes[l.mapaId] })),
    [piso, nomes],
  )
  return (
    // A key troca quando a fonte do app carrega: os rótulos são redesenhados com ela.
    <group key={pronta ? 'fonte-do-app' : 'fonte-do-sistema'}>
      {lojas.map((l) => (
        <Rotulo
          key={l.mapaId}
          nome={l.nome}
          x={l.centro.x}
          z={l.centro.y}
          y={topo(l.mapaId) + 0.05}
          largura={l.caixa.largura}
          profundidade={l.caixa.altura}
          cor={cor}
          fonte={fonte}
        />
      ))}
    </group>
  )
}
