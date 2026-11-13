-- Migration 0001: estrutura inicial do banco (Cloudflare D1 / SQLite)
-- Valores em dinheiro: inteiros em centavos.
-- Datas: texto ISO 8601 em UTC (datetime('now')).
-- Booleanos: inteiro 0 ou 1.
-- Listas e objetos: JSON em coluna de texto, lido com json_extract / json_each.
-- O D1 já aplica as chaves estrangeiras por padrão.


-- Lojas do shopping (térreo) e restaurantes da praça de alimentação (segundo piso)
CREATE TABLE loja (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  cnpj        TEXT NOT NULL UNIQUE CHECK (length(cnpj) = 14),
  piso        INTEGER NOT NULL CHECK (piso IN (1, 2)),
  tipo        TEXT NOT NULL DEFAULT 'loja' CHECK (tipo IN ('loja', 'alimentacao')),
  categorias  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(categorias)),
  mapa_id     TEXT NOT NULL UNIQUE,
  ativa       INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clientes, lojistas e administração do shopping
CREATE TABLE usuario (
  id                  TEXT PRIMARY KEY,
  nome                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash          TEXT NOT NULL,
  perfil              TEXT NOT NULL CHECK (perfil IN ('CLIENTE', 'LOJISTA', 'ADMIN_SHOPPING')),
  loja_id             TEXT REFERENCES loja (id),
  qr_token            TEXT UNIQUE,
  pontos              INTEGER NOT NULL DEFAULT 0 CHECK (pontos >= 0),
  consentimento_ficha INTEGER NOT NULL DEFAULT 0 CHECK (consentimento_ficha IN (0, 1)),
  criado_em           TEXT NOT NULL DEFAULT (datetime('now')),
  -- Lojista sempre tem loja; os outros perfis nunca têm
  CHECK ((perfil = 'LOJISTA') = (loja_id IS NOT NULL)),
  -- Só cliente tem QR
  CHECK (perfil = 'CLIENTE' OR qr_token IS NULL)
);

CREATE TABLE produto (
  id             TEXT PRIMARY KEY,
  loja_id        TEXT NOT NULL REFERENCES loja (id),
  nome           TEXT NOT NULL,
  descricao      TEXT NOT NULL DEFAULT '',
  categoria      TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos > 0),
  estoque        INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  fotos          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(fotos)),
  atributos      TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(atributos)),
  ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE reserva (
  id              TEXT PRIMARY KEY,
  cliente_id      TEXT NOT NULL REFERENCES usuario (id),
  produto_id      TEXT NOT NULL REFERENCES produto (id),
  loja_id         TEXT NOT NULL REFERENCES loja (id),
  quantidade      INTEGER NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 5),
  preco_centavos  INTEGER NOT NULL CHECK (preco_centavos > 0),
  status          TEXT NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'SEPARADA', 'RETIRADA', 'CANCELADA', 'EXPIRADA')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('NA_LOJA', 'PIX')),
  pago            INTEGER NOT NULL DEFAULT 0 CHECK (pago IN (0, 1)),
  expira_em       TEXT NOT NULL,
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  -- Só reserva com Pix pode estar paga
  CHECK (pago = 0 OR forma_pagamento = 'PIX')
);

-- Cupom com loja_id nulo é voucher do shopping
CREATE TABLE cupom (
  id                 TEXT PRIMARY KEY,
  loja_id            TEXT REFERENCES loja (id),
  titulo             TEXT NOT NULL,
  tipo               TEXT NOT NULL CHECK (tipo IN ('PERCENTUAL', 'VALOR', 'BRINDE')),
  valor              INTEGER NOT NULL DEFAULT 0 CHECK (valor >= 0),
  categoria_alvo     TEXT,
  nivel_minimo       TEXT NOT NULL DEFAULT 'SEMENTE'
                     CHECK (nivel_minimo IN ('SEMENTE', 'BROTO', 'CAPIM', 'DOURADO')),
  limite_por_cliente INTEGER NOT NULL DEFAULT 1 CHECK (limite_por_cliente >= 1),
  validade           TEXT NOT NULL,
  ativo              INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em          TEXT NOT NULL DEFAULT (datetime('now')),
  -- Percentual vai de 1 a 100; valor em centavos precisa ser positivo
  CHECK (tipo <> 'PERCENTUAL' OR valor BETWEEN 1 AND 100),
  CHECK (tipo <> 'VALOR' OR valor > 0)
);

CREATE TABLE compra (
  id              TEXT PRIMARY KEY,
  cliente_id      TEXT NOT NULL REFERENCES usuario (id),
  loja_id         TEXT NOT NULL REFERENCES loja (id),
  reserva_id      TEXT UNIQUE REFERENCES reserva (id),
  valor_centavos  INTEGER NOT NULL CHECK (valor_centavos > 0),
  origem          TEXT NOT NULL CHECK (origem IN ('CAIXA', 'NOTA')),
  chave_nfce      TEXT UNIQUE CHECK (chave_nfce IS NULL OR length(chave_nfce) = 44),
  pontos_gerados  INTEGER NOT NULL DEFAULT 0 CHECK (pontos_gerados >= 0),
  com_ficha       INTEGER NOT NULL DEFAULT 0 CHECK (com_ficha IN (0, 1)),
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  -- Compra por nota sempre tem a chave de acesso
  CHECK (origem <> 'NOTA' OR chave_nfce IS NOT NULL)
);

CREATE TABLE uso_cupom (
  compra_id         TEXT NOT NULL REFERENCES compra (id),
  cupom_id          TEXT NOT NULL REFERENCES cupom (id),
  desconto_centavos INTEGER NOT NULL CHECK (desconto_centavos >= 0),
  PRIMARY KEY (compra_id, cupom_id)
);

-- Gerado quando um voucher do shopping é usado numa loja (RN11)
CREATE TABLE reembolso (
  id             TEXT PRIMARY KEY,
  loja_id        TEXT NOT NULL REFERENCES loja (id),
  compra_id      TEXT NOT NULL,
  cupom_id       TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  status         TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO')),
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  pago_em        TEXT,
  UNIQUE (compra_id, cupom_id),
  FOREIGN KEY (compra_id, cupom_id) REFERENCES uso_cupom (compra_id, cupom_id),
  CHECK ((status = 'PAGO') = (pago_em IS NOT NULL))
);

-- Histórico da conversa com a Capi
CREATE TABLE mensagem (
  id         TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES usuario (id),
  papel      TEXT NOT NULL CHECK (papel IN ('CLIENTE', 'CAPI')),
  conteudo   TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Resumo de interesses; só existe com consentimento (RN04)
CREATE TABLE ficha (
  cliente_id    TEXT PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
  interesses    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(interesses)),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Buscas feitas no app e pela Capi, para os relatórios de demanda (RN12)
CREATE TABLE busca (
  id         TEXT PRIMARY KEY,
  cliente_id TEXT REFERENCES usuario (id),
  termo      TEXT NOT NULL,
  categoria  TEXT,
  encontrou  INTEGER NOT NULL CHECK (encontrou IN (0, 1)),
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Avaliação exige compra registrada (RN10)
CREATE TABLE avaliacao (
  id         TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES usuario (id),
  produto_id TEXT NOT NULL REFERENCES produto (id),
  compra_id  TEXT NOT NULL REFERENCES compra (id),
  nota       INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT NOT NULL DEFAULT '',
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cliente_id, produto_id)
);

CREATE TABLE favorito (
  cliente_id TEXT NOT NULL REFERENCES usuario (id),
  produto_id TEXT NOT NULL REFERENCES produto (id),
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (cliente_id, produto_id)
);

CREATE TABLE notificacao (
  id         TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuario (id),
  tipo       TEXT NOT NULL CHECK (tipo IN ('RESERVA', 'CUPOM', 'PONTOS', 'SISTEMA')),
  titulo     TEXT NOT NULL,
  corpo      TEXT NOT NULL DEFAULT '',
  lida       INTEGER NOT NULL DEFAULT 0 CHECK (lida IN (0, 1)),
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configuração editável pelo shopping (limites de nível, prazos de reserva)
CREATE TABLE configuracao (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL CHECK (json_valid(valor))
);

INSERT INTO configuracao (chave, valor) VALUES
  ('niveis', '{"SEMENTE":0,"BROTO":500,"CAPIM":2000,"DOURADO":5000}'),
  ('prazo_reserva_horas', '{"NA_LOJA":4,"PIX":48}'),
  ('pontos_por_real', '1');

-- Índices das consultas mais frequentes
CREATE INDEX idx_produto_loja       ON produto (loja_id);
CREATE INDEX idx_produto_categoria  ON produto (categoria, ativo);
CREATE INDEX idx_reserva_cliente    ON reserva (cliente_id, status);
CREATE INDEX idx_reserva_loja       ON reserva (loja_id, status);
CREATE INDEX idx_cupom_loja         ON cupom (loja_id, ativo);
CREATE INDEX idx_compra_cliente     ON compra (cliente_id, criado_em);
CREATE INDEX idx_compra_loja        ON compra (loja_id, criado_em);
CREATE INDEX idx_mensagem_cliente   ON mensagem (cliente_id, criado_em);
CREATE INDEX idx_busca_demanda      ON busca (encontrou, categoria, criado_em);
CREATE INDEX idx_reembolso_loja     ON reembolso (loja_id, status);
CREATE INDEX idx_notificacao_usuario ON notificacao (usuario_id, lida);
