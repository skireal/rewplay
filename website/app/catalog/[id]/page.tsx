import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Cassette, ShopLinks } from '@/types/supabase'

export const revalidate = 30

async function getCassette(id: string) {
  const { data, error } = await supabase
    .from('cassettes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as Cassette
}

export default async function CassettePage({ params }: { params: { id: string } }) {
  const cassette = await getCassette(params.id)

  if (!cassette) {
    notFound()
  }

  const shopLinks = cassette.shop_links as ShopLinks | null

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
        <Link href="/catalog" style={{ display: 'inline-block', marginBottom: '30px', color: '#636e72' }}>
          ← Назад к каталогу
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginBottom: '60px' }}>
          {/* Изображение */}
          <div>
            <div style={{
              width: '100%',
              height: '500px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px'
            }} />
          </div>

          {/* Информация */}
          <div>
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '14px', color: '#636e72', marginBottom: '8px', textTransform: 'uppercase' }}>
                {cassette.artist}
              </div>
              <h1 style={{ fontSize: '42px', marginBottom: '20px' }}>
                {cassette.album}
              </h1>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                {cassette.year && (
                  <span className="cassette-card__year" style={{ fontSize: '14px' }}>
                    {cassette.year}
                  </span>
                )}
                {cassette.genre && (
                  <span className="cassette-card__year" style={{ fontSize: '14px', background: '#a29bfe' }}>
                    {cassette.genre}
                  </span>
                )}
                <span className={`stock-badge ${cassette.in_stock ? 'stock-badge--in' : 'stock-badge--out'}`}>
                  {cassette.in_stock ? `В наличии: ${cassette.quantity} шт` : 'Нет в наличии'}
                </span>
              </div>

              <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '30px' }}>
                {cassette.price.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            {/* Детали */}
            {(cassette.label || cassette.catalog_number || cassette.condition) && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Детали</h3>
                {cassette.label && (
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Лейбл:</strong> {cassette.label}
                  </p>
                )}
                {cassette.catalog_number && (
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Каталожный номер:</strong> {cassette.catalog_number}
                  </p>
                )}
                {cassette.condition && (
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Состояние:</strong> {cassette.condition}
                  </p>
                )}
              </div>
            )}

            {/* Описание */}
            {cassette.description && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Описание</h3>
                <p style={{ lineHeight: '1.6', color: '#2d3436' }}>{cassette.description}</p>
              </div>
            )}

            {/* Тэги */}
            {cassette.tags && cassette.tags.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Тэги</h3>
                <div className="tags">
                  {cassette.tags.map((tag, i) => (
                    <span key={i} className="tag" style={{ fontSize: '14px' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Ссылки на магазины */}
            {shopLinks && Object.keys(shopLinks).length > 0 && (
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Где купить</h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {shopLinks.ozon && (
                    <a href={shopLinks.ozon} target="_blank" rel="noopener noreferrer" className="btn">
                      Купить на Ozon
                    </a>
                  )}
                  {shopLinks.wildberries && (
                    <a href={shopLinks.wildberries} target="_blank" rel="noopener noreferrer" className="btn btn--secondary">
                      Купить на Wildberries
                    </a>
                  )}
                  {shopLinks.avito && (
                    <a href={shopLinks.avito} target="_blank" rel="noopener noreferrer" className="btn">
                      Смотреть на Avito
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2024 Rewplay. Каталог винтажных аудиокассет</p>
        </div>
      </footer>
    </>
  )
}
