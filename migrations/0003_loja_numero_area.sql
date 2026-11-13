-- Migration 0003: número e área da unidade na loja; unidade vaga sem CNPJ.
-- O painel do shopping cruza as buscas sem resultado com as lojas vagas pelo tamanho da
-- unidade (GET /api/shopping/vagas) e mostra a unidade como na planta ("LOJA 47"). O seed
-- (scripts/gerar-seed.mjs) preenche os dois a partir de kit/seed/lojas.csv; até lá, o número
-- sai do mapa_id ("loja-47" → "47") e a área fica vazia. O número aceita vazio para um seed
-- anterior a esta migration continuar rodando; a API usa o mapa_id nesse caso.
-- O SQLite não altera NOT NULL: a tabela é recriada com os mesmos dados, e as chaves
-- estrangeiras (usuario, produto, reserva, cupom, compra, reembolso) só são conferidas no fim.

PRAGMA defer_foreign_keys = true;

CREATE TABLE loja_nova (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  -- O número da unidade na planta, sem o "LOJA": "47", "48A", "PC 001C"
  numero      TEXT UNIQUE,
  -- Área da unidade em m², da planilha da planta; NULL quando ela não traz
  area_m2     REAL CHECK (area_m2 IS NULL OR area_m2 > 0),
  -- Unidade vaga não tem CNPJ; loja ativa sempre tem
  cnpj        TEXT UNIQUE CHECK (cnpj IS NULL OR length(cnpj) = 14),
  piso        INTEGER NOT NULL CHECK (piso IN (1, 2)),
  tipo        TEXT NOT NULL DEFAULT 'loja' CHECK (tipo IN ('loja', 'alimentacao')),
  categorias  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(categorias)),
  mapa_id     TEXT NOT NULL UNIQUE,
  ativa       INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (ativa = 0 OR cnpj IS NOT NULL)
);

INSERT INTO loja_nova (id, nome, numero, area_m2, cnpj, piso, tipo, categorias, mapa_id, ativa, criado_em)
SELECT id, nome,
       upper(CASE WHEN mapa_id LIKE 'loja-%' THEN substr(mapa_id, 6) ELSE mapa_id END),
       NULL,
       CASE WHEN ativa = 1 THEN cnpj END,
       piso, tipo, categorias, mapa_id, ativa, criado_em
FROM loja;

DROP TABLE loja;
ALTER TABLE loja_nova RENAME TO loja;

PRAGMA defer_foreign_keys = false;
