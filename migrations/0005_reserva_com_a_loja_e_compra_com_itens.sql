-- Migration 0005: o fluxo da reserva com a loja e a compra com itens (docs/uml.md, docs/api.md).
--
-- Reserva:
-- - RECUSADA: a loja recusa, com motivo (o estoque volta e, se paga, o estorno fica pedido);
-- - pronta_em: a hora que a loja informou ao confirmar ("pronta para retirar a partir de");
--   o prazo de retirada conta dela;
-- - tamanho e cor escolhidos pelo cliente;
-- - cupom_id e desconto_centavos: o cupom escolhido ao reservar. O preço (e o Pix) já sai com o
--   desconto, e o cupom fica preso à reserva até a retirada.
-- O SQLite não altera CHECK: a tabela é recriada com os mesmos dados, e as chaves estrangeiras
-- (compra.reserva_id) só são conferidas no fim.
--
-- Compra: os itens (produto, quantidade, preço, categoria e o desconto de cada um) vão para
-- compra_item. Cada compra que já existe vira um item: o produto da reserva, ou "Outros".
--
-- Notificação: destino é a tela do app que o aviso abre (/reserva/<id>).

PRAGMA defer_foreign_keys = true;

CREATE TABLE reserva_nova (
  id                 TEXT PRIMARY KEY,
  cliente_id         TEXT NOT NULL REFERENCES usuario (id),
  produto_id         TEXT NOT NULL REFERENCES produto (id),
  loja_id            TEXT NOT NULL REFERENCES loja (id),
  quantidade         INTEGER NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 5),
  -- Preço de uma unidade, sem desconto.
  preco_centavos     INTEGER NOT NULL CHECK (preco_centavos > 0),
  status             TEXT NOT NULL DEFAULT 'PENDENTE'
                     CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'SEPARADA', 'RETIRADA', 'CANCELADA', 'RECUSADA', 'EXPIRADA')),
  forma_pagamento    TEXT NOT NULL CHECK (forma_pagamento IN ('NA_LOJA', 'PIX')),
  pago               INTEGER NOT NULL DEFAULT 0 CHECK (pago IN (0, 1)),
  expira_em          TEXT NOT NULL,
  criado_em          TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  estorno_solicitado INTEGER NOT NULL DEFAULT 0
                     CHECK (estorno_solicitado IN (0, 1) AND (estorno_solicitado = 0 OR pago = 1)),
  tamanho            TEXT,
  cor                TEXT,
  cupom_id           TEXT REFERENCES cupom (id),
  -- Desconto do cupom sobre o total da reserva (preço × quantidade).
  desconto_centavos  INTEGER NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
  pronta_em          TEXT,
  motivo_recusa      TEXT,
  -- Só reserva com Pix pode estar paga
  CHECK (pago = 0 OR forma_pagamento = 'PIX'),
  -- Desconto só com cupom, e nunca maior que o total
  CHECK (cupom_id IS NOT NULL OR desconto_centavos = 0),
  CHECK (desconto_centavos <= preco_centavos * quantidade),
  -- Recusada sempre tem o motivo, e só ela tem
  CHECK ((status = 'RECUSADA') = (motivo_recusa IS NOT NULL))
);

INSERT INTO reserva_nova
  (id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status, forma_pagamento, pago, expira_em,
   criado_em, atualizado_em, estorno_solicitado)
SELECT id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status, forma_pagamento, pago, expira_em,
       criado_em, atualizado_em, estorno_solicitado
FROM reserva;

DROP TABLE reserva;
ALTER TABLE reserva_nova RENAME TO reserva;

CREATE INDEX idx_reserva_cliente ON reserva (cliente_id, status);
CREATE INDEX idx_reserva_loja    ON reserva (loja_id, status);
CREATE INDEX idx_reserva_cupom   ON reserva (cupom_id, status);

CREATE TABLE compra_item (
  id                TEXT PRIMARY KEY,
  compra_id         TEXT NOT NULL REFERENCES compra (id),
  -- null: valor avulso, "Outros" (sem categoria: não entra em cupom de categoria)
  produto_id        TEXT REFERENCES produto (id),
  -- A reserva retirada neste item: uma reserva entra em uma compra só
  reserva_id        TEXT UNIQUE REFERENCES reserva (id),
  descricao         TEXT NOT NULL,
  categoria         TEXT,
  quantidade        INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  -- Preço de uma unidade, sem desconto
  preco_centavos    INTEGER NOT NULL CHECK (preco_centavos >= 0),
  -- Desconto dos cupons neste item (o da loja e o voucher do shopping somados)
  desconto_centavos INTEGER NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
  -- 1: já pago antes do balcão (reserva com Pix); o caixa não cobra
  ja_pago           INTEGER NOT NULL DEFAULT 0 CHECK (ja_pago IN (0, 1)),
  CHECK (reserva_id IS NULL OR produto_id IS NOT NULL),
  CHECK (desconto_centavos <= preco_centavos * quantidade)
);

CREATE INDEX idx_compra_item_compra  ON compra_item (compra_id);
CREATE INDEX idx_compra_item_produto ON compra_item (produto_id);

-- Cada compra que já existe vira um item, com o valor bruto (o pago mais os descontos).
INSERT INTO compra_item (id, compra_id, produto_id, reserva_id, descricao, categoria, quantidade, preco_centavos, desconto_centavos, ja_pago)
SELECT c.id || '-1', c.id, r.produto_id, c.reserva_id,
       COALESCE(p.nome, 'Outros'), p.categoria, 1,
       c.valor_centavos + COALESCE((SELECT sum(u.desconto_centavos) FROM uso_cupom u WHERE u.compra_id = c.id), 0),
       COALESCE((SELECT sum(u.desconto_centavos) FROM uso_cupom u WHERE u.compra_id = c.id), 0),
       COALESCE(r.pago, 0)
FROM compra c
LEFT JOIN reserva r ON r.id = c.reserva_id
LEFT JOIN produto p ON p.id = r.produto_id;

ALTER TABLE notificacao ADD COLUMN destino TEXT;

PRAGMA defer_foreign_keys = false;
