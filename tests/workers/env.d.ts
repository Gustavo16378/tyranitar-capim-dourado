// Bindings do ambiente de teste no Workers (vitest.config.ts): os da aplicação e os de teste.
type EnvDasFunctions = Env

declare namespace Cloudflare {
  interface Env extends EnvDasFunctions {
    MIGRATIONS: import('cloudflare:test').D1Migration[]
    SEED_DE_TESTE: string
  }
}
