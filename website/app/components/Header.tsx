import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { ADMIN_TOKEN_COOKIE } from '@/lib/constants'

// Читаем и трансформируем SVG один раз при старте сервера
const svgPath = path.join(process.cwd(), 'public', 'logo.svg')
const cachedSvg = fs.readFileSync(svgPath, 'utf-8')
  .replace('id="path44"', 'id="path44" class="logo-star"')
  .replace('id="path45"', 'id="path45" class="logo-star"')
  .replace(/(<svg[^>]*)(width="[^"]*")/, '$1width="100%"')
  .replace(/(<svg[^>]*)(height="[^"]*")/, '$1height="100%"')

function LogoSvg() {
  return (
    <div
      className="logo-svg-wrap"
      dangerouslySetInnerHTML={{ __html: cachedSvg }}
    />
  )
}

export default function Header() {
  const token = cookies().get(ADMIN_TOKEN_COOKIE)?.value
  const isAdmin = !!token && token === process.env.ADMIN_SECRET

  return (
    <header className="header">
      <div className="container">
        <div className="header__content">
          <Link href="/" className="logo">
            <LogoSvg />
          </Link>
          <nav className="nav">
            <Link href="/catalog">Каталог</Link>
            {isAdmin && <Link href="/admin">Админка</Link>}
          </nav>
        </div>
      </div>
    </header>
  )
}
