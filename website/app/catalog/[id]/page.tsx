import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Cassette, ShopLinks } from '@/types/supabase'
import Header from '../../components/Header'

export const revalidate = 30

async function getCassette(id: string) {
  const { data, error } = await supabase
    .from('cassettes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return data as Cassette
}

export default async function CassettePage({ params }: { params: { id: string } }) {
  const cassette = await getCassette(params.id)

  if (!cassette) notFound()

  const shopLinks = cassette.shop_links as ShopLinks | null

  return (
    <>
      <Header />

      <main style={{ padding: '48px 0 0' }}>
        <div className="container">

          <Link href="/catalog" className="back-link">
            ← Назад к каталогу
          </Link>

          <div className="detail-grid">
            {/* Image */}
            <div>
              {cassette.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cassette.cover_url}
                  alt={`${cassette.artist} — ${cassette.album}`}
                  className="detail-image detail-image--photo"
                />
              ) : (
                <div className="detail-image" />
              )}
            </div>

            {/* Info */}
            <div>
              <div className="detail-artist">{cassette.artist}</div>
              <h1 className="detail-album">{cassette.album}</h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                {cassette.year && (
                  <span className="badge badge--dark">{cassette.year}</span>
                )}
                {cassette.genre && (
                  <span className="badge badge--outline">{cassette.genre}</span>
                )}
                <span className={`stock-badge ${cassette.in_stock ? 'stock-badge--in' : 'stock-badge--out'}`}>
                  {cassette.in_stock ? `В наличии: ${cassette.quantity} шт` : 'Нет в наличии'}
                </span>
              </div>

              <div className="detail-price">
                {cassette.price.toLocaleString('ru-RU')} ₽
              </div>

              {/* Details */}
              {(cassette.label || cassette.catalog_number || cassette.condition) && (
                <div className="detail-section">
                  <h3>Характеристики</h3>
                  <div className="detail-meta-row">
                    {cassette.label && (
                      <p><strong>Лейбл</strong>{cassette.label}</p>
                    )}
                    {cassette.catalog_number && (
                      <p><strong>Каталожный №</strong>{cassette.catalog_number}</p>
                    )}
                    {cassette.condition && (
                      <p><strong>Состояние</strong>{cassette.condition}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {cassette.description && (
                <div className="detail-section">
                  <h3>Описание</h3>
                  <p>{cassette.description}</p>
                </div>
              )}

              {/* Tags */}
              {cassette.tags && cassette.tags.length > 0 && (
                <div className="detail-section">
                  <h3>Теги</h3>
                  <div className="tags">
                    {cassette.tags.map((tag, i) => (
                      <span key={i} className="tag" style={{ fontSize: '11px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Shop Links */}
              {shopLinks && Object.keys(shopLinks).length > 0 && (
                <div className="detail-section">
                  <h3>Где купить</h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {shopLinks.ozon && (
                      <a href={shopLinks.ozon} target="_blank" rel="noopener noreferrer" className="btn btn--sm">
                        Ozon
                      </a>
                    )}
                    {shopLinks.wildberries && (
                      <a href={shopLinks.wildberries} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
                        Wildberries
                      </a>
                    )}
                    {shopLinks.avito && (
                      <a href={shopLinks.avito} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
                        Avito
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
