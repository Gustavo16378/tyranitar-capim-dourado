-- Reserva cancelada depois de paga por Pix: o estorno fica pedido (simulado, como o próprio Pix
-- da demonstração). Só uma reserva paga pode ter estorno; as que já existem começam sem.
ALTER TABLE reserva ADD COLUMN estorno_solicitado INTEGER NOT NULL DEFAULT 0
  CHECK (estorno_solicitado IN (0, 1) AND (estorno_solicitado = 0 OR pago = 1));
