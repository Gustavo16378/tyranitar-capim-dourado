// Bindings e segredos disponíveis em context.env nas Functions.
// Segredos: .dev.vars no local (ver .dev.vars.exemplo) e secrets no Cloudflare.
interface Env {
  DB: D1Database
  ANTHROPIC_API_KEY: string
  JWT_SECRET: string
}
