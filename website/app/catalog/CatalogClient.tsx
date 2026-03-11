'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Cassette } from '@/types/supabase'
import { isNew, formatPrice } from '@/lib/utils'

type StockFilter = 'all' | 'available'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc' | 'name_asc'

export default function CatalogClient({ cassettes }: { cassettes: Cassette[] }) {
  const [query, setQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

  const genres = useMemo(() => {
    const set = new Set<string>()
    cassettes.forEach(c => { if (c.genre) set.add(c.genre) })
    return Array.from(set).sort()
  }, [cassettes])

  const hasFilters = query || stockFilter !== 'all' || genreFilter !== 'all'

  const filtered = useMemo(() => {
    const result = cassettes.filter((c) => {
      if (stockFilter === 'available' && c.status !== 'available') return false
      if (genreFilter !== 'all' && c.genre !== genreFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return (
          c.artist.toLowerCase().includes(q) ||
          c.album.toLowerCase().includes(q) ||
          (c.genre?.toLowerCase().includes(q)) ||
          (c.tags?.some(t => t.toLowerCase().includes(q)))
        )
      }
      return true
    })

    // Пре-вычисляем timestamps один раз вместо O(N log N) парсинга дат в компараторе
    if (sortBy === 'date_desc') {
      const ts = new Map(result.map(c => [c.id, new Date(c.created_at).getTime()]))
      return result.sort((a, b) => ts.get(b.id)! - ts.get(a.id)!)
    }

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':  return a.price - b.price
        case 'price_desc': return b.price - a.price
        case 'name_asc':   return a.artist.localeCompare(b.artist, 'ru')
        default:           return 0
      }
    })
  }, [cassettes, query, stockFilter, genreFilter, sortBy])

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
        {/* Наличие */}
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

        {/* Жанры */}
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

        {/* Сброс */}
        {hasFilters && (
          <button className="filter-reset" onClick={resetAll}>
            Сбросить всё
          </button>
        )}

        {/* Сортировка */}
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

      {/* Статистика — только при активных фильтрах */}
      {hasFilters && (
        <div className="catalog-stats">
          <strong>{filtered.length}</strong> {filtered.length === 1 ? 'результат' : 'результатов'}
          {query && <> по «{query}»</>}
        </div>
      )}

      {/* Сетка */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>Ничего не найдено</p>
          <button className="btn btn--outline btn--sm" onClick={resetAll}>
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((cassette) => (
            <Link href={`/catalog/${cassette.id}`} key={cassette.id}>
              <article className="cassette-card">
                <div className={`cassette-card__image${cassette.cover_url ? ' cassette-card__image--photo' : ''}`}>
                  {cassette.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cassette.cover_url} alt={`${cassette.artist} — ${cassette.album}`} />
                  )}
                  {isNew(cassette.created_at) && (
                    <span className="badge-new">Новинка</span>
                  )}
                </div>
                <div className="cassette-card__content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div className="cassette-card__artist">{cassette.artist}</div>
                    <span className={`stock-badge ${cassette.status === 'available' ? 'stock-badge--in' : 'stock-badge--wait'}`}>
                      {cassette.status === 'available' ? 'в наличии' : 'в ожидании'}
                    </span>
                  </div>
                  <h3 className="cassette-card__album">{cassette.album}</h3>
                  <div className="cassette-card__meta">
                    {cassette.year && <span className="badge badge--dark">{cassette.year}</span>}
                    {cassette.genre && <span className="badge badge--outline">{cassette.genre}</span>}
                  </div>
                  {cassette.tags && cassette.tags.length > 0 && (
                    <div className="tags">
                      {cassette.tags.slice(0, 4).map((tag, i) => (
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
    </>
  )
}
