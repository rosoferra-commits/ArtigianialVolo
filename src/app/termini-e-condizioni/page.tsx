// src/app/termini-e-condizioni/page.tsx
// Pagina Termini e Condizioni d'Uso
// Aperta in nuova scheda dal link nella checkbox di PagamentoModal e Onboarding

const C = {
  testo:  '#2C2C2A',
  testoS: '#888780',
  bordo:  '#E5E4E0',
  grigioC:'#F1EFE8',
  bianco: '#FFFFFF',
  arancio:'#D85A30',
  rosso:  '#E24B4A',
}

// Metti qui la data effettiva prima di pubblicare
const DATA_AGGIORNAMENTO = '[DATA DA INSERIRE]'
const RAGIONE_SOCIALE    = '[RAGIONE SOCIALE DA INSERIRE]'
const INDIRIZZO_SEDE     = '[INDIRIZZO DA INSERIRE]'
const PARTITA_IVA        = '[PARTITA IVA DA INSERIRE]'
const EMAIL_CONTATTO     = '[EMAIL DA INSERIRE]'
const CITTA_FORO         = '[CITTÀ SEDE LEGALE DA INSERIRE]'

export default function TerminiCondizioni() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto',
      padding: '40px 20px 80px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      color: C.testo,
      background: C.bianco,
      minHeight: '100dvh',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-block',
          background: C.arancio, color: C.bianco,
          fontWeight: 800, fontSize: 14, padding: '4px 12px',
          borderRadius: 20, marginBottom: 16,
        }}>
          ArtigianiAlVolo
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
          Termini e Condizioni d'Uso
        </h1>
        <p style={{ fontSize: 13, color: C.testoS, margin: 0 }}>
          Ultimo aggiornamento: {DATA_AGGIORNAMENTO}
        </p>
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: '#FEF3EE', borderRadius: 10,
          borderLeft: `4px solid ${C.arancio}`,
          fontSize: 13, color: '#7A3215', lineHeight: 1.6,
        }}>
          Leggere attentamente prima di utilizzare il Servizio. L'utilizzo della
          Piattaforma implica l'accettazione integrale dei presenti Termini.
        </div>
      </div>

      <Articolo numero="1" titolo="Definizioni e oggetto del Servizio">
        <P><B>"Piattaforma"</B> indica l'applicazione web e/o mobile denominata ArtigianiAlVolo,
        gestita da {RAGIONE_SOCIALE}, con sede in {INDIRIZZO_SEDE}, P.IVA {PARTITA_IVA}
        (di seguito, il "Gestore").</P>
        <P><B>"Utente"</B> o <B>"Cliente"</B> indica qualsiasi persona fisica che utilizza
        la Piattaforma per richiedere l'intervento di un Artigiano.</P>
        <P><B>"Artigiano"</B> indica il professionista autonomo, regolarmente registrato
        sulla Piattaforma, che offre i propri servizi di manodopera tramite la stessa.</P>
        <P><B>"Servizio"</B> indica esclusivamente l'attività di intermediazione tecnologica
        svolta dalla Piattaforma: messa in contatto tra Utente e Artigiano, gestione della
        richiesta di intervento, facilitazione della comunicazione e gestione tecnica del
        flusso di pagamento tramite il fornitore terzo Stripe.</P>
        <P>La Piattaforma <B>non fornisce essa stessa servizi di manodopera, riparazione,
        installazione o manutenzione.</B> Tali servizi sono forniti esclusivamente
        dall'Artigiano, quale soggetto autonomo e indipendente.</P>
      </Articolo>

      <Articolo numero="2" titolo="Natura di intermediario tecnologico">
        <P>Il Gestore opera <B>esclusivamente quale intermediario tecnologico</B> ai sensi
        della normativa applicabile (D.Lgs. 70/2003), limitandosi a mettere in contatto
        Utenti e Artigiani attraverso la propria infrastruttura digitale.</P>
        <P><B>Il contratto di prestazione d'opera si conclude esclusivamente tra l'Utente
        e l'Artigiano</B>, quali uniche parti contraenti. Il Gestore non è parte di tale
        contratto e non ne garantisce l'esecuzione.</P>
        <P>Il Gestore non seleziona, non supervisiona e non controlla l'operato degli
        Artigiani nello svolgimento materiale dell'intervento, limitandosi a verificare
        al momento della registrazione i dati dichiarati dall'Artigiano stesso.</P>
        <P>L'Utente prende atto che la scelta dell'Artigiano avviene sulla base di criteri
        di disponibilità geografica e temporale, e che tale indicazione non costituisce
        in alcun modo una raccomandazione o certificazione professionale da parte del Gestore.</P>
      </Articolo>

      <Articolo numero="3" titolo="Funzionamento della pre-autorizzazione di pagamento">
        <P>Al momento dell'invio di una richiesta di intervento, l'Utente autorizza, tramite
        il proprio strumento di pagamento (carta di credito o debito), una
        <B> pre-autorizzazione</B> corrispondente al "diritto di chiamata" indicato
        dall'Artigiano selezionato.</P>
        <P>La pre-autorizzazione <B>non costituisce un addebito immediato</B>: l'importo
        viene unicamente bloccato sullo strumento di pagamento, senza che alcuna somma
        venga effettivamente trasferita al Gestore o all'Artigiano in questa fase.</P>
        <P>Nessun importo viene addebitato nei seguenti casi: rifiuto della richiesta da
        parte dell'Artigiano, mancata risposta entro il termine stabilito, annullamento
        volontario della richiesta da parte dell'Utente prima dell'accettazione.</P>
      </Articolo>

      <Articolo numero="4" titolo="Limitazione di responsabilità">
        <P>Fermo restando quanto previsto dall'art. 1229 del Codice Civile — che esclude
        la validità di qualsiasi patto che escluda preventivamente la responsabilità per
        dolo o colpa grave — il Gestore non potrà essere ritenuto responsabile per:</P>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0' }}>
          <li>la qualità, la correttezza tecnica o la sicurezza dell'intervento eseguito dall'Artigiano;</li>
          <li>danni a cose, persone o animali derivanti dall'esecuzione dell'intervento;</li>
          <li>ritardi, mancata esecuzione o esecuzione parziale dell'intervento;</li>
          <li>il comportamento o le dichiarazioni dell'Artigiano al di fuori della Piattaforma;</li>
          <li>controversie relative al prezzo finale del lavoro.</li>
        </ul>
        <P>Qualunque controversia relativa alla qualità o alle modalità di esecuzione
        dell'intervento dovrà essere risolta esclusivamente tra Utente e Artigiano.
        Il Gestore potrà, a propria discrezione, fornire assistenza nella comunicazione
        tra le parti senza assumere responsabilità per l'esito.</P>
        <P>L'Utente manleva e tiene indenne il Gestore da qualsiasi pretesa derivante
        da controversie tra l'Utente e l'Artigiano, fatti salvi i casi di dolo o colpa
        grave direttamente imputabili al Gestore.</P>
      </Articolo>

      <Articolo numero="5" titolo="Comunicazione del costo finale e pagamento">
        <P>Al termine dell'intervento, l'Artigiano comunica tramite la Piattaforma il
        costo finale del lavoro svolto, da sommarsi al diritto di chiamata già
        pre-autorizzato.</P>
        <P>L'Utente riceve notifica e dispone delle seguenti opzioni:</P>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: '8px 0' }}>
          <li><B>Accettare</B> il costo finale: la pre-autorizzazione viene aggiornata
          all'importo totale (diritto di chiamata + costo del lavoro). Il pagamento
          effettivo avverrà solo quando l'Utente premerà il pulsante <B>"Lavoro terminato"</B>,
          certificando il completamento soddisfacente dell'intervento.</li>
          <li><B>Rifiutare</B> il costo finale: viene addebitato esclusivamente il diritto
          di chiamata, e l'intervento si chiude.</li>
        </ul>
        <P>Il pulsante <B>"Lavoro terminato"</B> costituisce la conferma esplicita e
        definitiva che il lavoro è stato eseguito in modo soddisfacente e autorizza
        irrevocabilmente l'addebito dell'importo totale approvato.</P>
        <P>L'Utente ha la facoltà di non premere "Lavoro terminato" qualora il lavoro
        non sia stato completato o sia stato eseguito in modo insoddisfacente. In tal
        caso il blocco sull'importo resterà attivo fino alla risoluzione della
        controversia tra le parti.</P>
      </Articolo>

      <Articolo numero="6" titolo="Commissioni della Piattaforma">
        <P>Il Gestore applica una commissione sul Servizio di intermediazione attualmente
        pari a <B>zero fino al 31/12/2026</B>, e successivamente pari a un importo fisso
        e/o percentuale calcolato sul valore della transazione, come pubblicato e aggiornato
        sulla Piattaforma stessa.</P>
      </Articolo>

      <Articolo numero="7" titolo="Dati personali">
        <P>Il trattamento dei dati personali raccolti tramite la Piattaforma è disciplinato
        dall'<a href="/privacy" style={{ color: C.arancio }}>Informativa Privacy</a>,
        redatta ai sensi del Regolamento UE 2016/679 (GDPR).</P>
        <P>I dati identificativi e di contatto del Cliente vengono comunicati all'Artigiano
        esclusivamente dopo l'accettazione della richiesta da parte di quest'ultimo.</P>
      </Articolo>

      <Articolo numero="8" titolo="Modifiche ai Termini e Condizioni">
        <P>Il Gestore si riserva il diritto di modificare in qualsiasi momento i presenti
        Termini e Condizioni, dandone comunicazione tramite la Piattaforma. L'utilizzo
        continuato del Servizio dopo la pubblicazione delle modifiche costituisce
        accettazione delle stesse.</P>
      </Articolo>

      <Articolo numero="9" titolo="Legge applicabile e foro competente">
        <P>I presenti Termini e Condizioni sono regolati dalla legge italiana.</P>
        <P>Per controversie con consumatori, è competente il foro del luogo di residenza
        o domicilio dell'Utente. Negli altri casi, è competente in via esclusiva il
        Foro di {CITTA_FORO}.</P>
      </Articolo>

      {/* Footer */}
      <div style={{
        marginTop: 48, padding: '16px 20px',
        background: C.grigioC, borderRadius: 12,
        fontSize: 12, color: C.testoS, lineHeight: 1.6,
      }}>
        Per qualsiasi comunicazione relativa ai presenti Termini:{' '}
        <a href={`mailto:${EMAIL_CONTATTO}`} style={{ color: C.arancio }}>
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
        margin: '0 0 14px',
        paddingBottom: 10,
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
