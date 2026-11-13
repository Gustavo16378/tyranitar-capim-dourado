// Bindings, segredos e variáveis disponíveis em context.env nas Functions.
// Segredos: .dev.vars no local (ver .dev.vars.exemplo) e secrets no Cloudflare.
interface Env {
  DB: D1Database
  JWT_SECRET?: string
  ANTHROPIC_API_KEY?: string
  /** Modelo da Capi; padrão claude-sonnet-5-5. */
  CAPI_MODELO?: string
}
