import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Cassette } from '@/types/supabase'

export const revalidate = 60 // Ревалидация каждые 60 секунд

async function getFeaturedCassettes() {
  const { data, error } = await supabase
    .from('cassettes')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Error fetching cassettes:', error)
    return []
  }

  return data as Cassette[]
}

export default async function HomePage() {
  const cassettes = await getFeaturedCassettes()

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
        <section style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
            Винтажные аудиокассеты
          </h1>
          <p style={{ fontSize: '20px', color: '#636e72', maxWidth: '600px', margin: '0 auto 30px' }}>
            Уникальная коллекция раритетных и классических кассет русского рока и не только
          </p>
          <Link href="/catalog" className="btn">
            Смотреть каталог
          </Link>
        </section>

        <section>
          <h2 style={{ fontSize: '32px', marginBottom: '30px' }}>
            Новые поступления
          </h2>

          {cassettes.length === 0 ? (
            <p className="loading">Кассеты не найдены. Добавьте их через админку или Supabase.</p>
          ) : (
            <div className="catalog-grid">
              {cassettes.map((cassette) => (
                <Link href={`/catalog/${cassette.id}`} key={cassette.id}>
                  <article className="cassette-card">
                    <div className="cassette-card__image" />
                    <div className="cassette-card__content">
                      <div className="cassette-card__artist">{cassette.artist}</div>
                      <h3 className="cassette-card__album">{cassette.album}</h3>
                      {cassette.year && (
                        <span className="cassette-card__year">{cassette.year}</span>
                      )}
                      <div className="cassette-card__price">
                        {cassette.price.toLocaleString('ru-RU')} ₽
                      </div>
                      {cassette.tags && cassette.tags.length > 0 && (
                        <div className="tags">
                          {cassette.tags.slice(0, 3).map((tag, i) => (
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
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2024 Rewplay. Каталог винтажных аудиокассет</p>
        </div>
      </footer>
    </>
  )
}
