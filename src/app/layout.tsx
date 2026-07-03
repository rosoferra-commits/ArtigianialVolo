// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'ArtigianiAlVolo',
  description: 'Artigiani disponibili ora, vicino a te.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#D85A30',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
