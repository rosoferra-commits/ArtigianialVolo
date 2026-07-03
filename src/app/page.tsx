// src/app/page.tsx — Homepage restyling energico/diretto
'use client'

import { useRouter } from 'next/navigation'
import Image        from 'next/image'

export default function Homepage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      maxWidth: '100vw',
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>

      {/* Sfondo decorativo — cerchio sfumato arancio, ancorato al centro, mai oltre il contenitore */}
      <div style={{
        position: 'absolute',
        top: -120, left: 0, right: 0,
        margin: '0 auto',
        width: '90%', maxWidth: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(216,90,48,0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px 0',
        width: '100%',
        maxWidth: 400,
      }}>
        <Image
          src="/logo.png"
          alt="ArtigianiAlVolo"
          width={260}
          height={186}
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(216,90,48,0.4))' }}
          priority
        />

        {/* Tagline */}
        <p style={{
          marginTop: 24,
          fontSize: 15,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 500,
          textAlign: 'center',
        }}>
          L'artigiano che ti serve, ora
        </p>
      </div>

      {/* Bottoni */}
      <div style={{
        width: '100%',
        padding: '0 20px 52px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 440,
        margin: '0 auto',
      }}>

        {/* Bottone cliente — primario, rosso acceso */}
        <button
          onClick={() => router.push('/cliente/benvenuto')}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '22px 24px',
            borderRadius: 20,
            border: 'none',
            background: 'linear-gradient(135deg, #E03A1E 0%, #D85A30 100%)',
            color: '#fff',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(216,90,48,0.45)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer decorativo */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 120, height: '100%',
            background: 'linear-gradient(to left, rgba(255,255,255,0.07), transparent)',
            borderRadius: 20,
          }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Sei un cliente?
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            🏠 Ho un problema in casa
          </p>
          <p style={{ fontSize: 13, margin: '6px 0 0', color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>
            Trova un artigiano disponibile ora vicino a te →
          </p>
        </button>

        {/* Bottone artigiano — secondario, bordo luminoso */}
        <button
          onClick={() => router.push('/artigiano/login')}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '20px 24px',
            borderRadius: 20,
            border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            cursor: 'pointer',
            textAlign: 'left',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', margin: '0 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Sei un professionista?
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            🔧 Sono un artigiano
          </p>
          <p style={{ fontSize: 13, margin: '6px 0 0', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
            Accedi o registrati per ricevere lavori →
          </p>
        </button>

      </div>
    </div>
  )
}
