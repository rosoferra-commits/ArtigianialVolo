// src/app/privacy/page.tsx
// Informativa Privacy / GDPR
// Aperta in nuova scheda dal link nella checkbox

const DATA_AGGIORNAMENTO = '[DATA DA INSERIRE]'
const RAGIONE_SOCIALE    = '[RAGIONE SOCIALE DA INSERIRE]'
const INDIRIZZO_SEDE     = '[INDIRIZZO DA INSERIRE]'
const PARTITA_IVA        = '[PARTITA IVA DA INSERIRE]'
const EMAIL_CONTATTO     = '[EMAIL DA INSERIRE]'

export default function Privacy() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto',
      padding: '40px 20px 80px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      color: '#2C2C2A',
      background: '#fff',
      minHeight: '100dvh',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-block',
          background: '#D85A30', color: '#fff',
          fontWeight: 800, fontSize: 14, padding: '4px 12px',
          borderRadius: 20, marginBottom: 16,
        }}>
          ArtigianiAlVolo
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
          Informativa sul Trattamento dei Dati Personali
        </h1>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 4px' }}>
          Ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR)
        </p>
        <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
          Ultimo aggiornamento: {DATA_AGGIORNAMENTO}
        </p>
      </div>

      <Articolo numero="1" titolo="Titolare del trattamento">
        <P>Il Titolare del trattamento dei dati personali è <B>{RAGIONE_SOCIALE}</B>,
        con sede legale in {INDIRIZZO_SEDE}, P.IVA {PARTITA_IVA}.</P>
        <P>Contatto per la privacy:{' '}
          <a href={`mailto:${EMAIL_CONTATTO}`} style={{ color: '#D85A30' }}>
            {EMAIL_CONTATTO}
          </a>
        </P>
      </Articolo>

      <Articolo numero="2" titolo="Dati raccolti e modalità di raccolta">
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: '#D85A30' }}>
          2.1 — Clienti
        </h3>
        <P>Il Cliente utilizza la Piattaforma <B>senza creare un account</B>. I dati
        vengono raccolti al momento di ogni singola richiesta di intervento:</P>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0 16px', fontSize: 14 }}>
          <li><B>Dati identificativi:</B> nome e cognome</li>
          <li><B>Dati di contatto:</B> numero di telefono</li>
          <li><B>Dati di localizzazione:</B> indirizzo testuale dell'intervento
          e relative coordinate geografiche (lat/lng), ottenute tramite geocodifica
          (Google Maps Platform) o geolocalizzazione del dispositivo se autorizzata</li>
          <li><B>Descrizione del problema:</B> testo libero, max 200 caratteri</li>
          <li><B>Dati di pagamento:</B> trattati direttamente da Stripe; il Titolare
          non riceve né conserva mai il numero completo della carta, la scadenza o il CVV</li>
          <li><B>Valutazione:</B> punteggio 1-5 stelle, facoltativo, a fine intervento</li>
        </ul>

        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: '#D85A30' }}>
          2.2 — Artigiani
        </h3>
        <P>L'Artigiano crea un account e fornisce in fase di registrazione:</P>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0 16px', fontSize: 14 }}>
          <li><B>Dati identificativi:</B> nome, numero di telefono, indirizzo e-mail</li>
          <li><B>Dati professionali:</B> categoria, indirizzo, Partita IVA</li>
          <li><B>Dati bancari:</B> IBAN, per la ricezione dei pagamenti</li>
          <li><B>Posizione GPS:</B> raccolta in tempo reale <B>esclusivamente</B> quando
          l'Artigiano attiva la disponibilità ("stato online") e durante un intervento
          accettato. Mai raccolta offline.</li>
          <li><B>Storico prestazioni:</B> interventi svolti, importi, valutazioni ricevute</li>
        </ul>

        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: '#D85A30' }}>
          2.3 — Dati tecnici
        </h3>
        <P>In occasione dell'utilizzo, possono essere raccolti automaticamente indirizzo IP,
        tipo di dispositivo e browser, esclusivamente per sicurezza e corretto funzionamento
        del Servizio.</P>
      </Articolo>

      <Articolo numero="3" titolo="Finalità e base giuridica">
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: 13, lineHeight: 1.5,
          }}>
            <thead>
              <tr style={{ background: '#F1EFE8' }}>
                <th style={th}>Finalità</th>
                <th style={th}>Base giuridica</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Erogazione del Servizio di intermediazione', 'Esecuzione contratto (art. 6 lett. b)'],
                ['Gestione del pagamento e pre-autorizzazione', 'Esecuzione contratto (art. 6 lett. b)'],
                ['Comunicazione dati Cliente all\'Artigiano dopo accettazione', 'Esecuzione contratto (art. 6 lett. b)'],
                ['Visualizzazione GPS Artigiano al Cliente durante intervento', 'Esecuzione contratto (art. 6 lett. b)'],
                ['Geolocalizzazione Cliente per artigiani vicini', 'Consenso (art. 6 lett. a) — autorizzazione browser'],
                ['Gestione valutazioni e media reputazionale', 'Contratto / legittimo interesse (art. 6 lett. b, f)'],
                ['Obblighi fiscali e contabili', 'Obbligo legale (art. 6 lett. c)'],
                ['Prevenzione frodi e abusi', 'Legittimo interesse (art. 6 lett. f)'],
              ].map(([f, b], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                  <td style={td}>{f}</td>
                  <td style={td}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Articolo>

      <Articolo numero="4" titolo="Destinatari e sub-responsabili del trattamento">
        <P>I dati personali possono essere comunicati, nei limiti strettamente necessari,
        alle seguenti categorie di destinatari:</P>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0', fontSize: 14 }}>
          <li><B>Supabase Inc.</B> — infrastruttura database e autenticazione</li>
          <li><B>Google LLC (Google Maps Platform)</B> — geocodifica indirizzi,
          visualizzazione mappe, autocomplete indirizzi</li>
          <li><B>Stripe, Inc.</B> — servizi di pagamento (raccoglie i dati carta
          direttamente, mai trasmessi al Titolare)</li>
          <li><B>L'Artigiano selezionato</B> — limitatamente a nome, cognome e telefono
          del Cliente, e solo dopo l'accettazione della richiesta</li>
          <li>Autorità pubbliche, ove richiesto dalla legge</li>
        </ul>
        <P>Il Titolare non vende né cede a terzi i dati personali per finalità
        di marketing diretto.</P>
      </Articolo>

      <Articolo numero="5" titolo="Trasferimento verso paesi extra-UE">
        <P>Alcuni fornitori indicati all'Art. 4 (Google LLC, Stripe, Inc.) hanno sede
        negli Stati Uniti. In tali casi il trasferimento avviene sulla base delle
        <B> Clausole Contrattuali Standard</B> approvate dalla Commissione Europea,
        come specificato nelle rispettive informative privacy dei fornitori.</P>
      </Articolo>

      <Articolo numero="6" titolo="Periodo di conservazione">
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0', fontSize: 14 }}>
          <li>Dati della richiesta di intervento: fino a 10 anni dalla transazione,
          per obblighi fiscali/contabili</li>
          <li>Profilo Artigiano: per la durata del rapporto contrattuale e per il
          periodo richiesto da obblighi fiscali successivi</li>
          <li>Dati GPS in tempo reale: non conservati oltre la durata dell'intervento</li>
          <li>Dati tecnici (log, IP): non oltre 12 mesi</li>
        </ul>
        <P>Decorsi i termini, i dati saranno cancellati o anonimizzati in modo permanente,
        salvo necessità per l'accertamento o difesa di diritti in sede giudiziaria.</P>
      </Articolo>

      <Articolo numero="7" titolo="Diritti dell'interessato">
        <P>L'Utente ha diritto di:</P>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0', fontSize: 14 }}>
          <li><B>Accedere</B> ai propri dati personali (art. 15 GDPR)</li>
          <li><B>Rettificare</B> dati inesatti o incompleti (art. 16)</li>
          <li><B>Cancellare</B> i propri dati ("diritto all'oblio", art. 17)</li>
          <li><B>Limitare</B> il trattamento in determinati casi (art. 18)</li>
          <li><B>Portabilità</B> dei dati (art. 20)</li>
          <li><B>Opposizione</B> al trattamento (art. 21)</li>
          <li><B>Revocare il consenso</B> in qualsiasi momento (es. geolocalizzazione)</li>
          <li><B>Proporre reclamo</B> al Garante Privacy:{' '}
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer"
              style={{ color: '#D85A30' }}>
              garanteprivacy.it
            </a>
          </li>
        </ul>
        <P>Le richieste possono essere inviate a:{' '}
          <a href={`mailto:${EMAIL_CONTATTO}`} style={{ color: '#D85A30' }}>
            {EMAIL_CONTATTO}
          </a>
        </P>
      </Articolo>

      <Articolo numero="8" titolo="Cookie e tecnologie similari">
        <P>La Piattaforma utilizza esclusivamente <B>cookie tecnici strettamente
        necessari</B> al funzionamento del Servizio (gestione sessione di autenticazione
        degli Artigiani). Non vengono utilizzati cookie di profilazione o pubblicitari.</P>
        <P>Tali cookie non richiedono consenso preventivo ai sensi dell'art. 122
        del Codice Privacy.</P>
      </Articolo>

      <Articolo numero="9" titolo="Sicurezza dei dati">
        <P>Il Titolare adotta misure tecniche e organizzative adeguate: trasmissione
        cifrata HTTPS/TLS, accesso al database protetto da autenticazione e Row Level
        Security, dati di pagamento gestiti esclusivamente dal fornitore terzo
        certificato PCI-DSS (Stripe).</P>
      </Articolo>

      <Articolo numero="10" titolo="Minori">
        <P>La Piattaforma non è destinata a minori di 18 anni. Il Titolare non
        raccoglie consapevolmente dati di minori. Qualora ciò avvenga, i dati
        saranno cancellati senza ritardo.</P>
      </Articolo>

      {/* Footer */}
      <div style={{
        marginTop: 48, padding: '16px 20px',
        background: '#F1EFE8', borderRadius: 12,
        fontSize: 12, color: '#888780', lineHeight: 1.6,
      }}>
        Hai domande sulla privacy? Scrivici a{' '}
        <a href={`mailto:${EMAIL_CONTATTO}`} style={{ color: '#D85A30' }}>
          {EMAIL_CONTATTO}
        </a>
      </div>
    </div>
  )
}

// ─── Componenti tipografici ────────────────────────────────────────────────────

function Articolo({ numero, titolo, children }: {
  numero: string; titolo: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 17, fontWeight: 700, color: '#2C2C2A',
        margin: '0 0 14px', paddingBottom: 10,
        borderBottom: '1px solid #E5E4E0',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          background: '#D85A30', color: '#fff',
          borderRadius: '50%', width: 26, height: 26,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>
          {numero}
        </span>
        {titolo}
      </h2>
      {children}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, lineHeight: 1.75, margin: '0 0 12px', color: '#2C2C2A' }}>
      {children}
    </p>
  )
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ fontWeight: 700 }}>{children}</strong>
}

const th: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontWeight: 700, fontSize: 12,
  borderBottom: '2px solid #E5E4E0',
}

const td: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #F1EFE8',
  verticalAlign: 'top',
}
