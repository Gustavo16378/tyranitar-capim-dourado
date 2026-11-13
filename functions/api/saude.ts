// GET /api/saude: confirma que as Functions estão no ar.
export const onRequestGet: PagesFunction<Env> = () => Response.json({ ok: true })
