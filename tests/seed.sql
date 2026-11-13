-- Dados dos testes de API e da Capi (docs/testes.md), separados dos dados da demo.
-- Ids fixos para os testes e as respostas gravadas da Capi citarem. Um comando por bloco, terminando em ";".

INSERT INTO loja (id, nome, cnpj, piso, tipo, categorias, mapa_id, ativa) VALUES
  ('loja-a', 'Loja A', '11111111000191', 1, 'loja', '["calcados","roupas"]', 'mapa-loja-a', 1),
  ('loja-b', 'Loja B', '22222222000191', 1, 'loja', '["perfumaria"]', 'mapa-loja-b', 1),
  ('restaurante-c', 'Restaurante C', '33333333000191', 2, 'alimentacao', '["alimentacao"]', 'mapa-restaurante-c', 1);

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

INSERT INTO compra (id, cliente_id, loja_id, valor_centavos, origem, pontos_gerados, criado_em) VALUES
  ('co-ana-1', 'c-ana', 'loja-a', 140000, 'CAIXA', 1400, datetime('now', '-60 days')),
  ('co-ana-2', 'c-ana', 'loja-b', 74000, 'CAIXA', 740, datetime('now', '-10 days'));
