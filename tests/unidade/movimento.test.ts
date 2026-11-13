import { describe, expect, it } from 'vitest'
import tokens from '../../src/design-system/tokens.json'
import { DURACAO, EASE } from '../../src/movimento/tokens'

describe('tokens de movimento', () => {
  it('converte as durações dos tokens para segundos', () => {
    expect(DURACAO).toEqual({ instante: 0.12, rapida: 0.24, media: 0.42, lenta: 0.72, celebracao: 1.4 })
  })

  it.each(tokens.easing.tokens.map((t) => [t.name, t.usage] as const))(
    'o GSAP de %s é o que a nota do token diz',
    (nome, nota) => {
      const ease = EASE[nome.replace('ease-', '') as keyof typeof EASE]
      expect(ease, `${nome} sem equivalente em EASE`).toBeDefined()
      expect(nota).toContain(`GSAP: ${ease}`)
    },
  )
})
