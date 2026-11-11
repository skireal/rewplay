import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/supabase'
import Header from './components/Header'
import { formatPrice } from '@/lib/utils'

export const revalidate = 60

async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as Product[]
}

export default async function HomePage() {
  const products = await getFeaturedProducts()

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
              Коллекция раритетных кассет и дисков: пост-панк, инди и альтернатива — от 80-х до 2000-х
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

            {products.length === 0 ? (
              <div className="empty-state">
                <p>Товаров пока нет.</p>
                <Link href="/admin" className="btn btn--outline btn--sm">
                  Добавить товар
                </Link>
              </div>
            ) : (
              <div className="catalog-grid">
                {products.map((product) => (
                  <Link href={`/catalog/${product.id}`} key={product.id}>
                    <article className="cassette-card">
                      <div className={`cassette-card__image${product.cover_url ? ' cassette-card__image--photo' : ''}`}>
                        {product.cover_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.cover_url} alt={product.title} />
                        )}
                      </div>
                      <div className="cassette-card__content">
                        <div className="cassette-card__artist">{product.artist}</div>
                        <h3 className="cassette-card__album">{product.album ?? product.title}</h3>
                        <div className="cassette-card__meta">
                          {product.year && (
                            <span className="badge badge--dark">{product.year}</span>
                          )}
                          {product.genre && (
                            <span className="badge badge--outline">{product.genre}</span>
                          )}
                        </div>
                        {product.tags && product.tags.length > 0 && (
                          <div className="tags">
                            {product.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="tag">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="cassette-card__price">
                          {product.price != null ? formatPrice(product.price) : ''}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {products.length > 0 && (
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
