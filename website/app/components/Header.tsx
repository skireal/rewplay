import Link from 'next/link'
import logoRaw from '@/public/logo.svg'
import { cookies } from 'next/headers'
import { ADMIN_TOKEN_COOKIE } from '@/lib/constants'

// SVG подключается как строка на этапе сборки (без fs — работает на Cloudflare)
const cachedSvg = (logoRaw as string)
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

export default async function Header() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value
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
