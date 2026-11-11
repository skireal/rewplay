'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Product, STATUS_LABELS, STATUS_BADGE_CLASS } from '@/types/supabase'
import { isNew, formatPrice } from '@/lib/utils'

type StockFilter = 'all' | 'available'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc' | 'name_asc'

export default function CatalogClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

  const genres = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => { if (p.genre) set.add(p.genre) })
    return Array.from(set).sort()
  }, [products])

  const hasFilters = query || stockFilter !== 'all' || genreFilter !== 'all'

  const filtered = useMemo(() => {
    const result = products.filter((p) => {
      if (stockFilter === 'available' && p.status !== 'available') return false
      if (genreFilter !== 'all' && p.genre !== genreFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return (
          (p.artist?.toLowerCase().includes(q)) ||
          (p.album?.toLowerCase().includes(q)) ||
          p.title.toLowerCase().includes(q) ||
          (p.genre?.toLowerCase().includes(q)) ||
          (p.tags?.some(t => t.toLowerCase().includes(q)))
        )
      }
      return true
    })

    if (sortBy === 'date_desc') {
      const ts = new Map(result.map(p => [p.id, new Date(p.created_at).getTime()]))
      return result.sort((a, b) => ts.get(b.id)! - ts.get(a.id)!)
    }

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':  return (a.price ?? 0) - (b.price ?? 0)
        case 'price_desc': return (b.price ?? 0) - (a.price ?? 0)
        case 'name_asc':   return (a.artist ?? a.title).localeCompare(b.artist ?? b.title, 'ru')
        default:           return 0
      }
    })
  }, [products, query, stockFilter, genreFilter, sortBy])

  const resetAll = () => {
    setQuery('')
    setStockFilter('all')
    setGenreFilter('all')
  }

  return (
    <>
      {/* Поиск */}
      <div className="search-bar">
        <div className="search-bar__inner">
          <span className="search-bar__icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="2"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
            </svg>
          </span>
          <input
            type="text"
            className="search-bar__input"
            placeholder="Исполнитель, альбом, жанр, тег..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-bar__clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Фильтры + Сортировка */}
      <div className="filters">
        <div className="filter-group">
          <button
            className={`filter-chip ${stockFilter === 'all' ? 'filter-chip--active' : ''}`}
            onClick={() => setStockFilter('all')}
          >
            Все
          </button>
          <button
            className={`filter-chip ${stockFilter === 'available' ? 'filter-chip--active' : ''}`}
            onClick={() => setStockFilter('available')}
          >
            В наличии
          </button>
        </div>

        {genres.length > 0 && (
          <div className="filter-group">
            <button
              className={`filter-chip ${genreFilter === 'all' ? 'filter-chip--active' : ''}`}
              onClick={() => setGenreFilter('all')}
            >
              Все жанры
            </button>
            {genres.map(genre => (
              <button
                key={genre}
                className={`filter-chip ${genreFilter === genre ? 'filter-chip--active' : ''}`}
                onClick={() => setGenreFilter(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {hasFilters && (
          <button className="filter-reset" onClick={resetAll}>
            Сбросить всё
          </button>
        )}

        <div className="sort-select-wrap">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="date_desc">Сначала новые</option>
            <option value="price_asc">Цена: дешевле</option>
            <option value="price_desc">Цена: дороже</option>
            <option value="name_asc">По названию А–Я</option>
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="catalog-stats">
          <strong>{filtered.length}</strong> {filtered.length === 1 ? 'результат' : 'результатов'}
          {query && <> по «{query}»</>}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>Ничего не найдено</p>
          <button className="btn btn--outline btn--sm" onClick={resetAll}>
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((product) => (
            <Link href={`/catalog/${product.id}`} key={product.id}>
              <article className="cassette-card">
                <div className={`cassette-card__image${product.cover_url ? ' cassette-card__image--photo' : ''}`}>
                  {product.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.cover_url} alt={product.title} />
                  )}
                  {isNew(product.created_at) && (
                    <span className="badge-new">Новинка</span>
                  )}
                </div>
                <div className="cassette-card__content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div className="cassette-card__artist">{product.artist}</div>
                    <span className={`stock-badge ${STATUS_BADGE_CLASS[product.status]}`}>
                      {STATUS_LABELS[product.status]}
                    </span>
                  </div>
                  <h3 className="cassette-card__album">{product.album ?? product.title}</h3>
                  <div className="cassette-card__meta">
                    {product.year && <span className="badge badge--dark">{product.year}</span>}
                    {product.genre && <span className="badge badge--outline">{product.genre}</span>}
                  </div>
                  {product.tags && product.tags.length > 0 && (
                    <div className="tags">
                      {product.tags.slice(0, 4).map((tag, i) => (
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
    </>
  )
}
