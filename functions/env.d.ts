// Bindings, segredos e variáveis disponíveis em context.env nas Functions.
// Segredos: .dev.vars no local (ver .dev.vars.exemplo) e secrets no Cloudflare.
interface Env {
  DB: D1Database
  JWT_SECRET?: string
  ANTHROPIC_API_KEY?: string
  /** Modelo da Capi; padrão claude-sonnet-5-5. */
  CAPI_MODELO?: string
  /** "1": a Capi usa as respostas salvas da demonstração sempre que a mensagem bater com uma. */
  CAPI_MODO_DEMO?: string
}
