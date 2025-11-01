import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rewplay - Каталог аудиокассет',
  description: 'Винтажные и редкие аудиокассеты для коллекционеров',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
