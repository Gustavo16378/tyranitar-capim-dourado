import { readFileSync } from 'node:fs'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Dois projetos: "unidade" (regras puras, no Node) e "workers" (banco, rotas e Capi, no
// runtime do Workers com um D1 local, as migrations aplicadas e tests/seed.sql).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unidade',
          include: ['tests/unidade/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [
          cloudflareTest(async () => ({
            miniflare: {
              compatibilityDate: '2026-11-01',
              compatibilityFlags: ['nodejs_compat'],
              d1Databases: ['DB'],
              bindings: {
                MIGRATIONS: await readD1Migrations('migrations'),
                SEED_DE_TESTE: readFileSync('tests/seed.sql', 'utf8'),
                JWT_SECRET: 'segredo-so-dos-testes-com-mais-de-32-caracteres',
              },
            },
          })),
        ],
        test: {
          name: 'workers',
          include: ['tests/banco/**/*.test.ts', 'tests/api/**/*.test.ts', 'tests/capi/**/*.test.ts'],
          setupFiles: ['tests/workers/preparar-banco.ts'],
        },
      },
    ],
  },
})
