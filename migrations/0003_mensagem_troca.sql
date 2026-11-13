-- Contexto da Capi entre mensagens: cada resposta da Capi guarda as consultas que ela fez
-- (as chamadas de ferramenta e os resultados, em JSON, no formato da API do Claude, sem os blocos
-- de raciocínio). Na mensagem seguinte, elas voltam ao Claude junto com o texto, para ele saber
-- de que produtos se está falando. Nulo nas mensagens do cliente e nas respostas sem consulta.
ALTER TABLE mensagem ADD COLUMN troca TEXT;
