import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'

function LogoSvg() {
  const svgPath = path.join(process.cwd(), 'public', 'logo.svg')
  let svgContent = fs.readFileSync(svgPath, 'utf-8')

  // Добавляем класс к звёздочкам path44 и path45
  svgContent = svgContent
    .replace('id="path44"', 'id="path44" class="logo-star"')
    .replace('id="path45"', 'id="path45" class="logo-star"')

  // Переопределяем размеры SVG
  svgContent = svgContent.replace(
    /(<svg[^>]*)(width="[^"]*")/,
    '$1width="100%"'
  ).replace(
    /(<svg[^>]*)(height="[^"]*")/,
    '$1height="100%"'
  )

  return (
    <div
      className="logo-svg-wrap"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}

export default function Header() {
  const token = cookies().get('admin_token')?.value
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
