// src/types/index.ts
// Tipi allineati esattamente alle tabelle DB.
// Se il DB cambia, si cambia qui — un solo posto.

export type TipoUrgenza = 'sos' | 'urgente'
// 'sos'     → SOS, entro 2 ore
// 'urgente' → In giornata, entro 4-6 ore

export type Categoria =
  | 'Idraulico'
  | 'Elettricista'
  | 'Fabbro'
  | 'Tapparellista'
  | 'Tuttofare'

export const CATEGORIE: { id: Categoria; emoji: string }[] = [
  { id: 'Idraulico',    emoji: '🔧' },
  { id: 'Elettricista', emoji: '⚡' },
  { id: 'Fabbro',       emoji: '🔑' },
  { id: 'Tapparellista',emoji: '🪟' },
  { id: 'Tuttofare',    emoji: '🛠️' },
]

export type FaseIntervento =
  | 'richiesto'    // cliente ha inviato la richiesta
  | 'accettato'    // artigiano ha accettato, è in viaggio
  | 'ritardo'      // artigiano avvisa che fa tardi, cliente decide
  | 'valutazione'  // artigiano ha proposto il totale, cliente deve decidere
  | 'approvato'    // cliente ha accettato la stima, lavoro in corso
  | 'lavoro_concluso_artigiano'  // artigiano ha premuto "ho finito"
  | 'finestra_conferma'          // countdown 48h: cliente conferma o contesta
  | 'in_contestazione'           // cliente ha segnalato un problema
  | 'chiuso_dopo_revisione'      // esito della revisione manuale staff
  | 'pagato'       // chiusura confermata (dal cliente o automatica), pagamento catturato
  | 'rifiutato'    // cliente ha rifiutato la stima → catturato solo diritto di chiamata
  | 'annullato'    // cliente ha scelto un altro artigiano
  | 'annullato_concorrenza'  // artigiano è stato accettato da un altro cliente prima

export interface ArtigianoDisponibile {
  artigiano_id:           string
  tipo:                   TipoUrgenza
  lat:                    number
  lng:                    number
  attivato_at:            string
  distanza_km?:           number
  nome:                   string
  categoria:              Categoria
  costo_chiamata_sos:     number
  costo_chiamata_urgente: number
  costo_orario:           number
  valutazione_media:      number
}

export interface Intervento {
  id:                      string
  artigiano_id:            string
  tipo_urgenza:            TipoUrgenza
  costo_chiamata:          number
  costo_chiamata_urgente:  number | null
  fase:                    FaseIntervento
  artigiano_lat:           number | null
  artigiano_lng:           number | null
  totale_proposto:         number | null
  cliente_accetta:         boolean | null
  cliente_nome:            string | null
  cliente_cognome:         string | null
  cliente_telefono:        string | null
  indirizzo:               string | null
  indirizzo_lat:           number | null
  indirizzo_lng:           number | null
  descrizione:             string | null
  scade_at:                string | null
  stelle_cliente:          number | null
  // Chiusura automatica (migration 006)
  artigiano_concluso_at:   string | null
  scade_conferma_at:       string | null
  chiusura_automatica:     boolean
  motivo_contestazione:    string | null
  esito_revisione:         string | null
  creato_at:               string
  aggiornato_at:           string
}

export interface Artigiano {
  id:                    string
  auth_id:               string
  nome:                  string
  telefono:              string
  categoria:             Categoria
  indirizzo:             string | null
  partita_iva:           string | null
  iban:                  string | null
  stripe_account_id:     string | null
  costo_chiamata_sos:    number
  costo_chiamata_urgente: number
  onboarding_completo:   boolean
  // Contatore incidenti mancata chiusura (migration 006)
  incidenti_mancata_chiusura: number
  ultimo_incidente_at:        string | null
  priorita_ridotta_fino_a:     string | null
  sospeso:                     boolean
  sospeso_motivo:              string | null
  sospeso_at:                  string | null
  creato_at:             string
}

// Commissioni piattaforma
// Fino al 31/12/2026: 0
// Dal 01/01/2027: €5 (solo chiamata) o €5 + 3% totale (lavoro accettato)
export const KILL_SWITCH_DATE = new Date('2027-01-01T00:00:00Z')

export function calcolaCommissione(
  tipoTransazione: 'solo_chiamata' | 'lavoro_accettato',
  totaleCents: number
): number {
  if (new Date() < KILL_SWITCH_DATE) return 0
  if (tipoTransazione === 'solo_chiamata') return 500   // €5 in centesimi
  return 500 + Math.round(totaleCents * 0.03)           // €5 + 3%
}
