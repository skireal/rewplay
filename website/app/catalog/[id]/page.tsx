import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Product, ShopLinks, STATUS_LABELS, STATUS_BADGE_CLASS } from '@/types/supabase'
import Header from '../../components/Header'
import ProductGallery from './ProductGallery'
import { isNew, formatPrice } from '@/lib/utils'

export const revalidate = 30

async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return data as Product
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) notFound()

  const shopLinks = product.shop_links as ShopLinks | null
  const productIsNew = isNew(product.created_at)
  const images = Array.isArray(product.images) ? product.images as string[] : []

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
            <div style={{ position: 'relative' }}>
              <ProductGallery
                title={product.title}
                coverUrl={product.cover_url}
                images={images}
              />
              {productIsNew && <span className="badge-new badge-new--lg">Новинка</span>}
            </div>

            {/* Info */}
            <div>
              <div className="detail-artist">{product.artist}</div>
              <h1 className="detail-album">{product.album ?? product.title}</h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                {product.year && (
                  <span className="badge badge--dark">{product.year}</span>
                )}
                {product.genre && (
                  <span className="badge badge--outline">{product.genre}</span>
                )}
                <span className={`stock-badge ${STATUS_BADGE_CLASS[product.status]}`}>
                  {STATUS_LABELS[product.status]}
                </span>
              </div>

              <div className="detail-price">
                {product.price != null ? formatPrice(product.price) : ''}
              </div>

              {/* Details */}
              {(product.label || product.catalog_number || product.condition) && (
                <div className="detail-section">
                  <h3>Характеристики</h3>
                  <div className="detail-meta-row">
                    {product.label && (
                      <p><strong>Лейбл</strong>{product.label}</p>
                    )}
                    {product.catalog_number && (
                      <p><strong>Каталожный №</strong>{product.catalog_number}</p>
                    )}
                    {product.condition && (
                      <p><strong>Состояние</strong>{product.condition}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="detail-section">
                  <h3>Описание</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="detail-section">
                  <h3>Теги</h3>
                  <div className="tags">
                    {product.tags.map((tag, i) => (
                      <span key={i} className="tag" style={{ fontSize: '11px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Shop Links */}
              {shopLinks && Object.keys(shopLinks).length > 0 && (
                <div className="detail-section">
                  <h3>Купить</h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {shopLinks.meshok && (
                      <a href={shopLinks.meshok} target="_blank" rel="noopener noreferrer" className="btn btn--sm">
                        Meshok
                      </a>
                    )}
                    {shopLinks.avito && (
                      <a href={shopLinks.avito} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
                        Avito
                      </a>
                    )}
                    {shopLinks.ozon && (
                      <a href={shopLinks.ozon} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
                        Ozon
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
