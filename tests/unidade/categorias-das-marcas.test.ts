// A categoria de cada marca no seed (scripts/categorias-das-marcas.mjs) precisa existir no
// shopping e ter capa em public/capas, para o painel do shopping mostrar a foto da loja.
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATEGORIA_DA_MARCA, categoriaDaMarca } from '../../scripts/categorias-das-marcas.mjs'
import { CATEGORIAS_DO_SHOPPING } from '../../functions/_lib/regras/categorias'

const IDS = CATEGORIAS_DO_SHOPPING.map((c) => c.id as string)

describe('categorias das marcas', () => {
  it('toda marca aponta para uma categoria do shopping', () => {
    const desconhecidas = Object.entries(CATEGORIA_DA_MARCA).filter(([, categoria]) => !IDS.includes(categoria))
    expect(desconhecidas).toEqual([])
  })

  it('toda categoria do shopping tem capa', () => {
    expect(IDS.filter((id) => !existsSync(new URL(`../../public/capas/${id}.webp`, import.meta.url)))).toEqual([])
  })

  it('acha a marca com espaços nas pontas e devolve null sem marca', () => {
    expect(categoriaDaMarca(' Renner ')).toBe('roupas')
    expect(categoriaDaMarca('Óticas Carol')).toBe('otica')
    expect(categoriaDaMarca('')).toBeNull()
    expect(categoriaDaMarca(undefined)).toBeNull()
  })
})
