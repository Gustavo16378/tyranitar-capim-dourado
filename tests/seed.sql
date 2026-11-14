-- Dados dos testes de API e da Capi (docs/testes.md), separados dos dados da demo.
-- Ids fixos para os testes e as respostas gravadas da Capi citarem. Um comando por bloco, terminando em ";".

-- As vagas (ativa 0, sem CNPJ) são as do painel do shopping (tests/api/shopping.test.ts).
INSERT INTO loja (id, nome, numero, area_m2, cnpj, piso, tipo, categorias, mapa_id, ativa) VALUES
  ('loja-a', 'Loja A', '10', 102, '11111111000191', 1, 'loja', '["calcados","roupas"]', 'mapa-loja-a', 1),
  ('loja-b', 'Loja B', '11', 48.5, '22222222000191', 1, 'loja', '["perfumaria"]', 'mapa-loja-b', 1),
  ('restaurante-c', 'Restaurante C', '201', 40, '33333333000191', 2, 'alimentacao', '["alimentacao"]', 'mapa-restaurante-c', 1),
  ('vaga-47', 'Vaga', '47', 229.9, NULL, 1, 'loja', '[]', 'mapa-vaga-47', 0),
  ('vaga-143', 'Vaga', '143', 116.1, NULL, 1, 'loja', '[]', 'mapa-vaga-143', 0),
  ('vaga-203', 'Vaga', '203', 58.81, NULL, 2, 'alimentacao', '[]', 'mapa-vaga-203', 0),
  ('vaga-sem-area', 'Vaga', '99', NULL, NULL, 1, 'loja', '[]', 'mapa-vaga-99', 0);

INSERT INTO produto (id, loja_id, nome, descricao, categoria, preco_centavos, estoque, atributos, ativo) VALUES
  ('p-pulse', 'loja-a', 'Tênis de corrida Pulse', 'Amortecimento para corrida de rua', 'calcados', 39990, 2, '{"numeracao":[40,41,42,43],"cor":"preto","marca":"Pulse"}', 1),
  ('p-run', 'loja-a', 'Tênis Run 2 preto', 'Tênis leve para treino', 'calcados', 34990, 5, '{"numeracao":[39,40,41,42],"cor":"preto","marca":"Run"}', 1),
  ('p-sandalia', 'loja-a', 'Sandália de couro', 'Sandália rasteira', 'calcados', 15990, 4, '{"numeracao":[35,36,37,38],"cor":"caramelo"}', 1),
  ('p-jaqueta', 'loja-a', 'Jaqueta corta-vento', 'Leve e impermeável', 'roupas', 18990, 3, '{"tamanhos":["P","M","G"],"cor":"verde"}', 1),
  ('p-camiseta', 'loja-a', 'Camiseta dry-fit', 'Tecido que seca rápido', 'roupas', 7990, 10, '{"tamanhos":["P","M","G","GG"],"cor":"azul"}', 1),
  ('p-ultima', 'loja-a', 'Meia de compressão', 'Última unidade', 'roupas', 4990, 1, '{"tamanhos":["M"]}', 1),
  ('p-perfume', 'loja-b', 'Perfume Cerrado 100 ml', 'Amadeirado', 'perfumaria', 24900, 8, '{"ml":100,"familia":"amadeirado"}', 1),
  ('p-hidratante', 'loja-b', 'Hidratante de pequi', 'Pele seca', 'perfumaria', 5990, 0, '{"ml":200}', 1),
  ('p-inativo', 'loja-b', 'Colônia antiga', 'Fora de linha', 'perfumaria', 9990, 5, '{}', 0),
  ('p-cafe', 'restaurante-c', 'Café coado', 'Copo de 300 ml', 'alimentacao', 900, 50, '{}', 1);

INSERT INTO usuario (id, nome, email, senha_hash, perfil, loja_id, qr_token, pontos, consentimento_ficha) VALUES
  ('c-ana', 'Ana Souza', 'ana@teste.test', 'pbkdf2_sha256$1$AAAA$AAAA', 'CLIENTE', NULL, 'q-ana', 2140, 1),
  ('c-bruno', 'Bruno Lima', 'bruno@teste.test', 'pbkdf2_sha256$1$AAAA$AAAA', 'CLIENTE', NULL, 'q-bruno', 0, 0),
  ('l-a', 'Equipe da Loja A', 'lojista.a@teste.test', 'pbkdf2_sha256$1$AAAA$AAAA', 'LOJISTA', 'loja-a', NULL, 0, 0),
  ('l-b', 'Equipe da Loja B', 'lojista.b@teste.test', 'pbkdf2_sha256$1$AAAA$AAAA', 'LOJISTA', 'loja-b', NULL, 0, 0),
  ('admin', 'Administração', 'admin@teste.test', 'pbkdf2_sha256$1$AAAA$AAAA', 'ADMIN_SHOPPING', NULL, NULL, 0, 0);

INSERT INTO ficha (cliente_id, interesses) VALUES
  ('c-ana', '[{"categoria":"calcados","detalhe":"Tênis de corrida, número 42, até R$ 400"},{"categoria":"roupas","detalhe":"Camisetas dry-fit"}]');

INSERT INTO cupom (id, loja_id, titulo, tipo, valor, categoria_alvo, nivel_minimo, limite_por_cliente, validade, ativo) VALUES
  ('cp-a-10', 'loja-a', '10% em calçados', 'PERCENTUAL', 10, 'calcados', 'SEMENTE', 1, '2099-12-31', 1),
  ('cp-a-15', 'loja-a', 'R$ 15 em camisetas', 'VALOR', 1500, 'roupas', 'SEMENTE', 1, '2099-12-31', 1),
  ('cp-shopping-20', NULL, 'R$ 20 em qualquer loja', 'VALOR', 2000, NULL, 'SEMENTE', 1, '2099-12-31', 1),
  ('cp-a-vencido', 'loja-a', 'Cupom vencido', 'PERCENTUAL', 50, NULL, 'SEMENTE', 1, '2020-01-01', 1),
  ('cp-a-dourado', 'loja-a', 'Só para Dourado', 'PERCENTUAL', 30, NULL, 'DOURADO', 1, '2099-12-31', 1),
  ('cp-b-5', 'loja-b', '5% em perfumes', 'PERCENTUAL', 5, NULL, 'SEMENTE', 1, '2099-12-31', 1),
  ('cp-a-alvo', 'loja-a', 'Para quem procura perfume', 'VALOR', 1000, 'perfumaria', 'SEMENTE', 1, '2099-12-31', 1);

INSERT INTO compra (id, cliente_id, loja_id, valor_centavos, origem, pontos_gerados, criado_em) VALUES
  ('co-ana-1', 'c-ana', 'loja-a', 140000, 'CAIXA', 1400, datetime('now', '-60 days')),
  ('co-ana-2', 'c-ana', 'loja-b', 74000, 'CAIXA', 740, datetime('now', '-10 days'));
