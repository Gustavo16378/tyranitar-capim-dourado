import { describe, expect, it } from 'vitest'
import { APP_NOME } from '../../src/config'

describe('config', () => {
  it('define o nome do app numa constante única', () => {
    expect(APP_NOME).toBeTypeOf('string')
    expect(APP_NOME.trim()).not.toBe('')
  })
})
