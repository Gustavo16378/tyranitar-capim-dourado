import { describe, expect, it } from 'vitest'
import { espalhar, lerPlanta } from '../../src/shopping/telas/vagas/plantas'

describe('plantas das vagas', () => {
  it('lê o viewBox, o contorno do piso e as lojas com o centro de cada uma', () => {
    const svg =
      '<svg viewBox="10 20 100 50"><g id="areas"><polygon id="piso" points="0,0 1,1 2,2"/></g>' +
      '<g id="lojas"><polygon id="loja-47" fill="#B8944C" points="0,0 10,0 10,10 0,10"/>' +
      '<polygon id="corredor" points="1,1 2,2"/></g></svg>'
    expect(lerPlanta('../../../mapa/piso-1.svg', svg)).toEqual({
      piso: 1,
      viewBox: { x: 10, y: 20, largura: 100, altura: 50 },
      contorno: '0,0 1,1 2,2',
      lojas: [{ mapaId: 'loja-47', pontos: '0,0 10,0 10,10 0,10', centro: { x: 5, y: 5 } }],
    })
    expect(lerPlanta('../../../mapa/piso-2.svg', '<svg></svg>')).toBeNull()
  })

  it('afasta os marcadores que se sobrepõem e não mexe nos que já estão longe', () => {
    const longe = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    expect(espalhar(longe, 10)).toEqual(longe)
    const juntos = espalhar(
      [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
        { x: 52, y: 51 },
      ],
      10,
    )
    for (let i = 0; i < juntos.length; i++) {
      for (let j = i + 1; j < juntos.length; j++) {
        expect(Math.hypot(juntos[i].x - juntos[j].x, juntos[i].y - juntos[j].y)).toBeGreaterThanOrEqual(9.99)
      }
    }
    // Continuam perto de onde estavam.
    expect(juntos.every((q) => Math.hypot(q.x - 50, q.y - 50) < 15)).toBe(true)
  })
})
