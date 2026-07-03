-- ============================================================
-- ArtigianiAlVolo — Schema DB pulito
-- Esegui in Supabase SQL Editor (crea tutto da zero)
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- TABELLA: artigiani
-- Registrati via onboarding. Login gestito da Supabase Auth.
-- ============================================================
CREATE TABLE artigiani (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id                 UUID UNIQUE NOT NULL,      -- Supabase auth.users.id
  nome                    TEXT NOT NULL,
  telefono                TEXT NOT NULL UNIQUE,
  categoria               TEXT NOT NULL
    CHECK (categoria IN ('Idraulico','Elettricista','Fabbro','Tapparellista','Tuttofare')),
  costo_chiamata_sos      INTEGER NOT NULL DEFAULT 50,   -- € fisso per SOS
  costo_chiamata_urgente  INTEGER NOT NULL DEFAULT 25,   -- € fisso per In giornata
  creato_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELLA: artigiani_disponibili
-- Stato on/off dell'artigiano + posizione GPS live.
-- Una riga per artigiano, upsert ad ogni cambio.
-- ============================================================
CREATE TABLE artigiani_disponibili (
  artigiano_id  UUID PRIMARY KEY REFERENCES artigiani(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('sos','urgente')),
  lat           FLOAT8 NOT NULL,
  lng           FLOAT8 NOT NULL,
  attivato_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice geografico per query di prossimità
CREATE INDEX idx_artigiani_disponibili_geo
  ON artigiani_disponibili
  USING GIST(ST_SetSRID(ST_MakePoint(lng, lat), 4326));

-- Realtime abilitato su questa tabella (i client ricevono INSERT/UPDATE/DELETE)
ALTER PUBLICATION supabase_realtime ADD TABLE artigiani_disponibili;

-- ============================================================
-- TABELLA: interventi
-- Creato dal cliente, aggiornato nel corso del flusso.
-- ============================================================
CREATE TABLE interventi (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artigiano_id      UUID NOT NULL REFERENCES artigiani(id),
  tipo_urgenza      TEXT NOT NULL CHECK (tipo_urgenza IN ('sos','urgente')),
  costo_chiamata    INTEGER NOT NULL,   -- snapshot al momento della richiesta
  fase              TEXT NOT NULL DEFAULT 'richiesto'
    CHECK (fase IN ('richiesto','accettato','valutazione','pagato','rifiutato')),
  -- GPS artigiano aggiornato durante la fase 'accettato'
  artigiano_lat     FLOAT8,
  artigiano_lng     FLOAT8,
  -- Proposta economica (fase 'valutazione')
  totale_proposto   INTEGER,            -- proposto dall'artigiano
  cliente_accetta   BOOLEAN,            -- true/false dopo la scelta del cliente
  creato_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aggiornato_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime su interventi (il cliente vede i cambi di fase e GPS in tempo reale)
ALTER PUBLICATION supabase_realtime ADD TABLE interventi;

-- Trigger aggiornamento automatico di aggiornato_at
CREATE OR REPLACE FUNCTION touch_aggiornato_at()
RETURNS TRIGGER AS $$
BEGIN NEW.aggiornato_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interventi_touch
  BEFORE UPDATE ON interventi
  FOR EACH ROW EXECUTE FUNCTION touch_aggiornato_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE artigiani            ENABLE ROW LEVEL SECURITY;
ALTER TABLE artigiani_disponibili ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventi           ENABLE ROW LEVEL SECURITY;

-- artigiani: leggibili da tutti, modificabili solo dal proprietario
CREATE POLICY art_read   ON artigiani FOR SELECT USING (true);
CREATE POLICY art_write  ON artigiani FOR ALL
  USING (auth.uid() = auth_id);

-- artigiani_disponibili: leggibili da tutti, modificabili dall'artigiano
CREATE POLICY disp_read  ON artigiani_disponibili FOR SELECT USING (true);
CREATE POLICY disp_write ON artigiani_disponibili FOR ALL
  USING (auth.uid() = (SELECT auth_id FROM artigiani WHERE id = artigiano_id));

-- interventi: accesso anonimo in scrittura (cliente non loggato),
-- leggibili da chiunque abbia l'id
CREATE POLICY int_read   ON interventi FOR SELECT USING (true);
CREATE POLICY int_insert ON interventi FOR INSERT WITH CHECK (true);
CREATE POLICY int_update ON interventi FOR UPDATE USING (true);
