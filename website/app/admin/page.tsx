'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [formData, setFormData] = useState({
    artist: '',
    album: '',
    year: '',
    label: '',
    price: '',
    quantity: '1',
    genre: '',
    condition: 'Новая',
    description: '',
    tags: '',
    ozonLink: '',
    wbLink: '',
    avitoLink: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Формируем shop_links
      const shopLinks: any = {}
      if (formData.ozonLink) shopLinks.ozon = formData.ozonLink
      if (formData.wbLink) shopLinks.wildberries = formData.wbLink
      if (formData.avitoLink) shopLinks.avito = formData.avitoLink

      // Формируем tags массив
      const tags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
        : null

      const { data, error } = await supabase
        .from('cassettes')
        .insert({
          artist: formData.artist,
          album: formData.album,
          year: formData.year ? parseInt(formData.year) : null,
          label: formData.label || null,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          genre: formData.genre || null,
          condition: formData.condition,
          description: formData.description || null,
          tags: tags,
          shop_links: Object.keys(shopLinks).length > 0 ? shopLinks : null,
          in_stock: parseInt(formData.quantity) > 0,
        })

      if (error) throw error

      setMessage('✅ Кассета успешно добавлена!')

      // Очищаем форму
      setFormData({
        artist: '',
        album: '',
        year: '',
        label: '',
        price: '',
        quantity: '1',
        genre: '',
        condition: 'Новая',
        description: '',
        tags: '',
        ozonLink: '',
        wbLink: '',
        avitoLink: '',
      })

      // Обновляем страницу через 2 секунды
      setTimeout(() => {
        window.location.href = '/catalog'
      }, 2000)
    } catch (error: any) {
      setMessage('❌ Ошибка: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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
        <h1 style={{ fontSize: '36px', marginBottom: '10px' }}>
          Админ-панель
        </h1>
        <p style={{ color: '#636e72', marginBottom: '40px' }}>
          Добавление новых кассет в каталог
        </p>

        {message && (
          <div style={{
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '30px',
            background: message.startsWith('✅') ? '#d4edda' : '#f8d7da',
            color: message.startsWith('✅') ? '#155724' : '#721c24',
            fontWeight: 600
          }}>
            {message}
          </div>
        )}

        <div style={{ maxWidth: '800px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Исполнитель */}
              <div className="form-group">
                <label className="form-label">Исполнитель *</label>
                <input
                  type="text"
                  name="artist"
                  className="form-input"
                  value={formData.artist}
                  onChange={handleChange}
                  required
                  placeholder="Кино"
                />
              </div>

              {/* Альбом */}
              <div className="form-group">
                <label className="form-label">Альбом *</label>
                <input
                  type="text"
                  name="album"
                  className="form-input"
                  value={formData.album}
                  onChange={handleChange}
                  required
                  placeholder="Группа крови"
                />
              </div>

              {/* Год */}
              <div className="form-group">
                <label className="form-label">Год выпуска</label>
                <input
                  type="number"
                  name="year"
                  className="form-input"
                  value={formData.year}
                  onChange={handleChange}
                  min="1960"
                  max="2030"
                  placeholder="1988"
                />
              </div>

              {/* Лейбл */}
              <div className="form-group">
                <label className="form-label">Лейбл</label>
                <input
                  type="text"
                  name="label"
                  className="form-input"
                  value={formData.label}
                  onChange={handleChange}
                  placeholder="Мелодия"
                />
              </div>

              {/* Цена */}
              <div className="form-group">
                <label className="form-label">Цена (₽) *</label>
                <input
                  type="number"
                  name="price"
                  className="form-input"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="1500"
                />
              </div>

              {/* Количество */}
              <div className="form-group">
                <label className="form-label">Количество *</label>
                <input
                  type="number"
                  name="quantity"
                  className="form-input"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="1"
                />
              </div>

              {/* Жанр */}
              <div className="form-group">
                <label className="form-label">Жанр</label>
                <input
                  type="text"
                  name="genre"
                  className="form-input"
                  value={formData.genre}
                  onChange={handleChange}
                  placeholder="Рок"
                />
              </div>

              {/* Состояние */}
              <div className="form-group">
                <label className="form-label">Состояние</label>
                <select
                  name="condition"
                  className="form-select"
                  value={formData.condition}
                  onChange={handleChange}
                >
                  <option value="Новая">Новая</option>
                  <option value="Б/У Отличное">Б/У Отличное</option>
                  <option value="Б/У Хорошее">Б/У Хорошее</option>
                  <option value="Б/У Удовлетворительное">Б/У Удовлетворительное</option>
                  <option value="Коллекционная">Коллекционная</option>
                </select>
              </div>
            </div>

            {/* Описание */}
            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Культовый альбом группы Кино. Запечатанная кассета, оригинальное издание."
              />
            </div>

            {/* Тэги */}
            <div className="form-group">
              <label className="form-label">Тэги (через запятую)</label>
              <input
                type="text"
                name="tags"
                className="form-input"
                value={formData.tags}
                onChange={handleChange}
                placeholder="русский рок, классика, 80-е"
              />
            </div>

            {/* Ссылки на магазины */}
            <h3 style={{ fontSize: '20px', marginTop: '30px', marginBottom: '20px' }}>
              Ссылки на магазины
            </h3>

            <div className="form-group">
              <label className="form-label">Ozon</label>
              <input
                type="url"
                name="ozonLink"
                className="form-input"
                value={formData.ozonLink}
                onChange={handleChange}
                placeholder="https://ozon.ru/..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Wildberries</label>
              <input
                type="url"
                name="wbLink"
                className="form-input"
                value={formData.wbLink}
                onChange={handleChange}
                placeholder="https://wildberries.ru/..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Avito</label>
              <input
                type="url"
                name="avitoLink"
                className="form-input"
                value={formData.avitoLink}
                onChange={handleChange}
                placeholder="https://avito.ru/..."
              />
            </div>

            {/* Кнопка отправки */}
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ marginTop: '30px', width: '100%', fontSize: '18px', padding: '16px' }}
            >
              {loading ? 'Добавление...' : 'Добавить кассету'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '60px', padding: '20px', background: 'var(--card-bg)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>💡 Советы</h3>
          <ul style={{ lineHeight: '2', color: '#636e72' }}>
            <li>Поля с * обязательны для заполнения</li>
            <li>Тэги вводите через запятую: русский рок, 80-е, классика</li>
            <li>Если количество = 0, кассета автоматически отмечается как "Нет в наличии"</li>
            <li>Ссылки на магазины необязательны, но помогают покупателям</li>
            <li>Также можно добавлять кассеты через Supabase Dashboard или CSV импорт</li>
          </ul>
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
