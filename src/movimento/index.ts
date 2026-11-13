// Movimento da marca com GSAP. As telas importam daqui: import { useEntrada } from '../movimento'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export { useGSAP }
export { useEntrada } from './useEntrada'
export { cascata, comMovimento, desenharTranca, encherBarra, somarPontos, subirDeNivel } from './presets'
export {
  DESLOCAMENTO,
  DURACAO,
  EASE,
  MOVIMENTO_NORMAL,
  MOVIMENTO_REDUZIDO,
  PASSO_CASCATA,
} from './tokens'
