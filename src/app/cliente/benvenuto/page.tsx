// src/app/cliente/benvenuto/page.tsx — Restyling energico
'use client'

import { useRouter } from 'next/navigation'
import Image         from 'next/image'

const PASSI = [
  {
    n: '01',
    colore: '#E03A1E',
    emoji: '📍',
    titolo: 'Vedi chi è disponibile',
    desc: 'Sulla mappa vedi gli artigiani vicini. Pin rosso = emergenza entro 2 ore, giallo = disponibile in giornata.',
  },
  {
    n: '02',
    colore: '#D85A30',
    emoji: '👆',
    titolo: 'Scegli e chiama',
    desc: 'Clicca sul pin, vedi il costo, descrivi il problema e autorizza con la carta. Bastano 30 secondi.',
  },
  {
    n: '03',
    colore: '#C4781A',
    emoji: '🚗',
    titolo: 'Segui l\'artigiano',
    desc: 'Il pin si muove verso casa tua in tempo reale, esattamente come un taxi.',
  },
  {
    n: '04',
    colore: '#1D9E75',
    emoji: '✅',
    titolo: 'Paghi solo se soddisfatto',
    desc: 'L\'artigiano propone il costo finale. Tu decidi. Se rifiuti, paghi solo il diritto di chiamata.',
  },
]

export default function BenvenutoCliente() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
    }}>

      {/* Header scuro con logo */}
      <div style={{
        padding: '32px 24px 28px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(216,90,48,0.15) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Image src="/logo.png" alt="ArtigianiAlVolo" width={140} height={100}
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 12px rgba(216,90,48,0.3))' }} priority />
        <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 16, marginBottom: 4 }}>
          Come funziona?
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Semplice come chiamare un taxi
        </p>
      </div>

      {/* Passi */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }}>
        {PASSI.map((p, i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, marginBottom: 28,
          }}>
            {/* Numero colorato + linea verticale */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: p.colore,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                boxShadow: `0 4px 16px ${p.colore}44`,
              }}>
                {p.emoji}
              </div>
              {i < PASSI.length - 1 && (
                <div style={{
                  width: 2, flex: 1, marginTop: 8, minHeight: 24,
                  background: 'rgba(255,255,255,0.08)',
                }} />
              )}
            </div>

            {/* Testo */}
            <div style={{ paddingTop: 8 }}>
              <p style={{
                fontWeight: 800, fontSize: 17, color: '#fff',
                margin: '0 0 6px', lineHeight: 1.2,
              }}>
                {p.titolo}
              </p>
              <p style={{
                fontSize: 14, color: 'rgba(255,255,255,0.55)',
                margin: 0, lineHeight: 1.65,
              }}>
                {p.desc}
              </p>
            </div>
          </div>
        ))}

        {/* Box garanzia */}
        <div style={{
          background: 'rgba(29,158,117,0.12)',
          border: '1px solid rgba(29,158,117,0.25)',
          borderRadius: 16, padding: 18, marginTop: 4,
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#4CD9A8', margin: '0 0 8px' }}>
            🔒 I tuoi soldi sono al sicuro
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.65 }}>
            Non addebitiamo nulla fino a quando non sei soddisfatto.
            Puoi sempre rifiutare il preventivo — paghi solo il costo di chiamata.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 20px 44px' }}>
        <button
          onClick={() => router.push('/cliente')}
          style={{
            width: '100%', height: 60, borderRadius: 18, border: 'none',
            background: 'linear-gradient(135deg, #E03A1E 0%, #D85A30 100%)',
            color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(216,90,48,0.45)',
            letterSpacing: '-0.01em',
          }}
        >
          Trova un artigiano ora →
        </button>
      </div>
    </div>
  )
}
