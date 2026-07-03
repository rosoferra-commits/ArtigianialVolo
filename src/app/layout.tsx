// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'ArtigianiAlVolo — Servizi Rapidi di Casa',
  description: 'Trova un artigiano disponibile ora vicino a te. Idraulico, elettricista, fabbro e molto altro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ArtigianiAlVolo',
  },
}

export const viewport: Viewport = {
  width:              'device-width',
  initialScale:       1,
  maximumScale:       1,
  userScalable:       false,   // blocca lo zoom involontario su mobile
  themeColor:         '#D85A30',
  viewportFit:        'cover', // usa tutto lo schermo incluse le notch
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" style={{
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      margin: 0,
      padding: 0,
    }}>
      <body style={{
        margin: 0, padding: 0,
        width: '100%',
        maxWidth: '100vw',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
        background: '#fff',
        WebkitTextSizeAdjust: '100%',   // blocca il resize automatico del testo su iOS
        touchAction: 'manipulation',     // elimina il delay da 300ms sui tap
        overflowX: 'hidden',             // impedisce scroll orizzontale indesiderato
        position: 'relative',
      }}>
        {children}
      </body>
    </html>
  )
}
