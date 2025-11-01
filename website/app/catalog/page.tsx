import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Cassette } from '@/types/supabase'

export const revalidate = 30

async function getAllCassettes() {
  const { data, error } = await supabase
    .from('cassettes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cassettes:', error)
    return []
  }

  return data as Cassette[]
}

export default async function CatalogPage() {
  const cassettes = await getAllCassettes()
  const inStockCassettes = cassettes.filter(c => c.in_stock)

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header__content">
            <Link href="/" className="logo">
              🎵 Rewplay
            </Link>
            <nav className="nav">
              <Link href="/catalog">Каталог</Link>
              <Link href="/admin">Админка</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container">
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '40px', marginBottom: '10px' }}>
            Полный каталог
          </h1>
          <p style={{ color: '#636e72', fontSize: '18px' }}>
            Найдено кассет: {cassettes.length} | В наличии: {inStockCassettes.length}
          </p>
        </div>

        {cassettes.length === 0 ? (
          <div className="loading">
            <p>Каталог пуст.</p>
            <p style={{ marginTop: '20px' }}>
              <Link href="/admin" className="btn">
                Добавить кассеты
              </Link>
            </p>
          </div>
        ) : (
          <div className="catalog-grid">
            {cassettes.map((cassette) => (
              <Link href={`/catalog/${cassette.id}`} key={cassette.id}>
                <article className="cassette-card">
                  <div className="cassette-card__image" />
                  <div className="cassette-card__content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div className="cassette-card__artist">{cassette.artist}</div>
                      <span className={`stock-badge ${cassette.in_stock ? 'stock-badge--in' : 'stock-badge--out'}`}>
                        {cassette.in_stock ? `В наличии (${cassette.quantity})` : 'Нет в наличии'}
                      </span>
                    </div>
                    <h3 className="cassette-card__album">{cassette.album}</h3>
                    {cassette.year && (
                      <span className="cassette-card__year">{cassette.year}</span>
                    )}
                    {cassette.genre && (
                      <span className="cassette-card__year" style={{ marginLeft: '8px', background: '#a29bfe' }}>
                        {cassette.genre}
                      </span>
                    )}
                    <div className="cassette-card__price">
                      {cassette.price.toLocaleString('ru-RU')} ₽
                    </div>
                    {cassette.tags && cassette.tags.length > 0 && (
                      <div className="tags">
                        {cassette.tags.slice(0, 4).map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2024 Rewplay. Каталог винтажных аудиокассет</p>
        </div>
      </footer>
    </>
  )
}
