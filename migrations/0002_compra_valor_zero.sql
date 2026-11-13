-- Migration 0002: compra com valor pago zero.
-- Cupons podem cobrir o valor inteiro (TU07); a compra entra com valor zero e zero pontos.
-- O SQLite não altera CHECK: a tabela é recriada com os mesmos dados, e as chaves
-- estrangeiras (uso_cupom, avaliacao, reembolso) só são conferidas no fim.

PRAGMA defer_foreign_keys = true;

CREATE TABLE compra_nova (
  id              TEXT PRIMARY KEY,
  cliente_id      TEXT NOT NULL REFERENCES usuario (id),
  loja_id         TEXT NOT NULL REFERENCES loja (id),
  reserva_id      TEXT UNIQUE REFERENCES reserva (id),
  valor_centavos  INTEGER NOT NULL CHECK (valor_centavos >= 0),
  origem          TEXT NOT NULL CHECK (origem IN ('CAIXA', 'NOTA')),
  chave_nfce      TEXT UNIQUE CHECK (chave_nfce IS NULL OR length(chave_nfce) = 44),
  pontos_gerados  INTEGER NOT NULL DEFAULT 0 CHECK (pontos_gerados >= 0),
  com_ficha       INTEGER NOT NULL DEFAULT 0 CHECK (com_ficha IN (0, 1)),
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  -- Compra por nota sempre tem a chave de acesso
  CHECK (origem <> 'NOTA' OR chave_nfce IS NOT NULL)
);

INSERT INTO compra_nova
  (id, cliente_id, loja_id, reserva_id, valor_centavos, origem, chave_nfce, pontos_gerados, com_ficha, criado_em)
SELECT id, cliente_id, loja_id, reserva_id, valor_centavos, origem, chave_nfce, pontos_gerados, com_ficha, criado_em
FROM compra;

DROP TABLE compra;
ALTER TABLE compra_nova RENAME TO compra;

CREATE INDEX idx_compra_cliente ON compra (cliente_id, criado_em);
CREATE INDEX idx_compra_loja    ON compra (loja_id, criado_em);

PRAGMA defer_foreign_keys = false;
