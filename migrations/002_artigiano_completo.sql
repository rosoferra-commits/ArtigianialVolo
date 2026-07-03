-- ============================================================
-- Migration 002 — Aggiornamenti per lato artigiano completo
-- Esegui DOPO 001_schema.sql
-- ============================================================

-- Aggiungi colonne mancanti alla tabella artigiani
ALTER TABLE artigiani
  ADD COLUMN IF NOT EXISTS indirizzo             TEXT,
  ADD COLUMN IF NOT EXISTS partita_iva           TEXT,
  ADD COLUMN IF NOT EXISTS iban                  TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id     TEXT,   -- Stripe Connect Express
  ADD COLUMN IF NOT EXISTS onboarding_completo   BOOLEAN NOT NULL DEFAULT false;

-- Aggiungi colonne Stripe alla tabella interventi
ALTER TABLE interventi
  ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT,   -- id PaymentIntent
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,   -- Stripe Customer del cliente
  ADD COLUMN IF NOT EXISTS commissione_app       INTEGER NOT NULL DEFAULT 0; -- € in centesimi

-- Timer accettazione: quando scade la richiesta per l'artigiano
ALTER TABLE interventi
  ADD COLUMN IF NOT EXISTS scade_at TIMESTAMPTZ; -- richiesto_at + 3 min

-- Riferimenti cliente visibili all'artigiano SOLO dopo pre-autorizzazione
-- (numero di telefono del cliente, inserito al momento della richiesta)
ALTER TABLE interventi
  ADD COLUMN IF NOT EXISTS cliente_telefono TEXT;

-- Realtime anche su artigiani (dashboard artigiano si aggiorna)
ALTER PUBLICATION supabase_realtime ADD TABLE artigiani;

-- Indice per trovare interventi in scadenza (timer 3 min)
CREATE INDEX IF NOT EXISTS idx_interventi_scade
  ON interventi(scade_at)
  WHERE fase = 'richiesto';
