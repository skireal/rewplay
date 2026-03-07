import type { Metadata } from 'next'
import { Oswald, Lora, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const oswald = Oswald({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rewplay — Каталог аудиокассет',
  description: 'Винтажные и редкие аудиокассеты для коллекционеров',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${oswald.variable} ${lora.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
