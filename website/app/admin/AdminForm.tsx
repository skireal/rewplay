'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Cassette } from '@/types/supabase'

interface Props {
  cassette?: Cassette        // если передан — режим редактирования
  onSuccess?: () => void     // колбэк после сохранения
}

export default function AdminForm({ cassette, onSuccess }: Props) {
  const isEdit = !!cassette

  const [formData, setFormData] = useState({
    artist:      cassette?.artist      ?? '',
    album:       cassette?.album       ?? '',
    year:        cassette?.year?.toString() ?? '',
    label:       cassette?.label       ?? '',
    price:       cassette?.price?.toString() ?? '',
    quantity:    cassette?.quantity?.toString() ?? '1',
    genre:       cassette?.genre       ?? '',
    condition:   cassette?.condition   ?? 'Новая',
    description: cassette?.description ?? '',
    tags:        cassette?.tags?.join(', ') ?? '',
    ozonLink:    (cassette?.shop_links as any)?.ozon         ?? '',
    wbLink:      (cassette?.shop_links as any)?.wildberries  ?? '',
    avitoLink:   (cassette?.shop_links as any)?.avito        ?? '',
  })

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(cassette?.cover_url ?? null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(cassette?.cover_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setCoverFile(file)
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const removeFile = () => {
    setCoverFile(null)
    setPreviewUrl(null)
    setExistingCoverUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // 1. Загружаем новую обложку если выбрана
      let cover_url: string | null = existingCoverUrl

      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('Covers')
          .upload(fileName, coverFile, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('Covers').getPublicUrl(fileName)
        cover_url = urlData.publicUrl
      }

      // 2. Формируем данные
      const shopLinks: Record<string, string> = {}
      if (formData.ozonLink) shopLinks.ozon = formData.ozonLink
      if (formData.wbLink) shopLinks.wildberries = formData.wbLink
      if (formData.avitoLink) shopLinks.avito = formData.avitoLink

      const tags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
        : null

      const payload = {
        artist:      formData.artist,
        album:       formData.album,
        year:        formData.year ? parseInt(formData.year) : null,
        label:       formData.label || null,
        price:       parseFloat(formData.price),
        quantity:    parseInt(formData.quantity),
        genre:       formData.genre || null,
        condition:   formData.condition,
        description: formData.description || null,
        tags,
        shop_links:  Object.keys(shopLinks).length > 0 ? shopLinks : null,
        in_stock:    parseInt(formData.quantity) > 0,
        cover_url,
      }

      // 3. Insert или Update
      if (isEdit && cassette) {
        const { error } = await supabase.from('cassettes').update(payload).eq('id', cassette.id)
        if (error) throw error
        setMessage({ type: 'success', text: 'Кассета обновлена' })
      } else {
        const { error } = await supabase.from('cassettes').insert(payload)
        if (error) throw error
        setMessage({ type: 'success', text: 'Кассета добавлена в каталог' })
      }

      setTimeout(() => { onSuccess?.() }, 1200)

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {message && (
        <div className={`alert alert--${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* Обложка */}
        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label className="form-label">Обложка</label>
          <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
            {previewUrl ? (
              <div className="upload-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Превью обложки" className="upload-preview__img" />
                <button
                  type="button"
                  className="upload-preview__remove"
                  onClick={(e) => { e.stopPropagation(); removeFile() }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Нажмите чтобы выбрать фото</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>JPG, PNG, WEBP до 5 МБ</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Исполнитель *</label>
            <input type="text" name="artist" className="form-input"
              value={formData.artist} onChange={handleChange}
              required placeholder="Кино" />
          </div>

          <div className="form-group">
            <label className="form-label">Альбом *</label>
            <input type="text" name="album" className="form-input"
              value={formData.album} onChange={handleChange}
              required placeholder="Группа крови" />
          </div>

          <div className="form-group">
            <label className="form-label">Год выпуска</label>
            <input type="number" name="year" className="form-input"
              value={formData.year} onChange={handleChange}
              min="1960" max="2030" placeholder="1988" />
          </div>

          <div className="form-group">
            <label className="form-label">Лейбл</label>
            <input type="text" name="label" className="form-input"
              value={formData.label} onChange={handleChange}
              placeholder="Мелодия" />
          </div>

          <div className="form-group">
            <label className="form-label">Цена (₽) *</label>
            <input type="number" name="price" className="form-input"
              value={formData.price} onChange={handleChange}
              required min="0" step="0.01" placeholder="1500" />
          </div>

          <div className="form-group">
            <label className="form-label">Количество *</label>
            <input type="number" name="quantity" className="form-input"
              value={formData.quantity} onChange={handleChange}
              required min="0" placeholder="1" />
          </div>

          <div className="form-group">
            <label className="form-label">Жанр</label>
            <input type="text" name="genre" className="form-input"
              value={formData.genre} onChange={handleChange}
              placeholder="Рок" />
          </div>

          <div className="form-group">
            <label className="form-label">Состояние</label>
            <select name="condition" className="form-select"
              value={formData.condition} onChange={handleChange}>
              <option value="Новая">Новая</option>
              <option value="Б/У Отличное">Б/У Отличное</option>
              <option value="Б/У Хорошее">Б/У Хорошее</option>
              <option value="Б/У Удовлетворительное">Б/У Удовлетворительное</option>
              <option value="Коллекционная">Коллекционная</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Описание</label>
          <textarea name="description" className="form-textarea"
            value={formData.description} onChange={handleChange}
            placeholder="Культовый альбом. Запечатанная кассета, оригинальное издание." />
        </div>

        <div className="form-group">
          <label className="form-label">Теги (через запятую)</label>
          <input type="text" name="tags" className="form-input"
            value={formData.tags} onChange={handleChange}
            placeholder="русский рок, классика, 80-е" />
        </div>

        <div style={{ borderTop: '2px solid var(--black)', paddingTop: '28px', marginTop: '8px', marginBottom: '24px' }}>
          <p className="form-label" style={{ marginBottom: '20px' }}>Ссылки на магазины</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Ozon</label>
              <input type="url" name="ozonLink" className="form-input"
                value={formData.ozonLink} onChange={handleChange}
                placeholder="https://ozon.ru/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Wildberries</label>
              <input type="url" name="wbLink" className="form-input"
                value={formData.wbLink} onChange={handleChange}
                placeholder="https://wildberries.ru/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Avito</label>
              <input type="url" name="avitoLink" className="form-input"
                value={formData.avitoLink} onChange={handleChange}
                placeholder="https://avito.ru/..." />
            </div>
          </div>
        </div>

        <button type="submit" className="btn" disabled={loading}
          style={{ width: '100%', fontSize: '16px', padding: '16px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Добавить кассету'}
        </button>
      </form>
    </>
  )
}
