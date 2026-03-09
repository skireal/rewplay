import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Cassette } from '@/types/supabase'
import Header from './components/Header'
import { formatPrice } from '@/lib/utils'

export const revalidate = 60

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
      <Header />

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container">
            <div className="hero__eyebrow">Vintage &amp; Rare</div>
            <h1>
              Аудио<br />
              <em>Кассеты</em>
            </h1>
            <p className="hero__sub">
              Коллекция раритетных кассет русского рока и мировой музыки — от 80-х до 2000-х
            </p>
            <Link href="/catalog" className="btn">
              Смотреть каталог
            </Link>
          </div>
        </section>

        {/* NEW ARRIVALS */}
        <section style={{ padding: '56px 0 0' }}>
          <div className="container">
            <h2 className="section-title">
              <span className="section-title__dot" />
              Новые поступления
            </h2>

            {cassettes.length === 0 ? (
              <div className="empty-state">
                <p>Кассет пока нет. Добавьте их через админку.</p>
                <Link href="/admin" className="btn btn--outline btn--sm">
                  Добавить кассету
                </Link>
              </div>
            ) : (
              <div className="catalog-grid">
                {cassettes.map((cassette) => (
                  <Link href={`/catalog/${cassette.id}`} key={cassette.id}>
                    <article className="cassette-card">
                      <div className={`cassette-card__image${cassette.cover_url ? ' cassette-card__image--photo' : ''}`}>
                        {cassette.cover_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cassette.cover_url} alt={`${cassette.artist} — ${cassette.album}`} />
                        )}
                      </div>
                      <div className="cassette-card__content">
                        <div className="cassette-card__artist">{cassette.artist}</div>
                        <h3 className="cassette-card__album">{cassette.album}</h3>
                        <div className="cassette-card__meta">
                          {cassette.year && (
                            <span className="badge badge--dark">{cassette.year}</span>
                          )}
                          {cassette.genre && (
                            <span className="badge badge--outline">{cassette.genre}</span>
                          )}
                        </div>
                        {cassette.tags && cassette.tags.length > 0 && (
                          <div className="tags">
                            {cassette.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="tag">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="cassette-card__price">
                          {formatPrice(cassette.price)}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {cassettes.length > 0 && (
              <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                <Link href="/catalog" className="btn btn--outline">
                  Весь каталог
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__inner">
            <p>© {new Date().getFullYear()} Rewplay</p>
            <p>Каталог винтажных аудиокассет</p>
          </div>
        </div>
      </footer>
    </>
  )
}
