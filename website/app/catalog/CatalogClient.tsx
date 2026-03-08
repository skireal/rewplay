'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Cassette } from '@/types/supabase'

type StockFilter = 'all' | 'in_stock'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc' | 'name_asc'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS
}

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
      if (stockFilter === 'in_stock' && !c.in_stock) return false
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

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':  return a.price - b.price
        case 'price_desc': return b.price - a.price
        case 'name_asc':   return a.artist.localeCompare(b.artist, 'ru')
        case 'date_desc':
        default:           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
            className={`filter-chip ${stockFilter === 'in_stock' ? 'filter-chip--active' : ''}`}
            onClick={() => setStockFilter('in_stock')}
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
                    <span className={`stock-badge ${cassette.in_stock ? 'stock-badge--in' : 'stock-badge--out'}`}>
                      {cassette.in_stock ? `×${cassette.quantity}` : 'нет'}
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
                    {cassette.price.toLocaleString('ru-RU')} ₽
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
