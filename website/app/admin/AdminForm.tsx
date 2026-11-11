'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Product, ProductType, ShopLinks } from '@/types/supabase'
import { IMAGES_BUCKET } from '@/lib/constants'

interface Props {
  product?: Product
  onSuccess?: () => void
}

export default function AdminForm({ product, onSuccess }: Props) {
  const isEdit = !!product
  const shopLinks = product?.shop_links as ShopLinks | null

  const [formData, setFormData] = useState({
    type:        (product?.type        ?? 'cassette') as ProductType,
    artist:      product?.artist       ?? '',
    album:       product?.album        ?? '',
    year:        product?.year?.toString() ?? '',
    label:       product?.label        ?? '',
    price:       product?.price?.toString() ?? '',
    status:      product?.status       ?? 'available',
    genre:       product?.genre        ?? '',
    condition:   product?.condition    ?? 'Б/У',
    description: product?.description  ?? '',
    tags:        product?.tags?.join(', ') ?? '',
    meshokLink:  shopLinks?.meshok     ?? '',
    avitoLink:   shopLinks?.avito      ?? '',
  })

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.cover_url ?? null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(product?.cover_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setCoverFile(file)
    if (file) {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(file)
      blobUrlRef.current = url
      setPreviewUrl(url)
    }
  }

  const removeFile = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
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
      let cover_url: string | null = existingCoverUrl

      if (coverFile) {
        const productId = product?.id ?? crypto.randomUUID()
        const ext = coverFile.name.split('.').pop()
        const path = `${productId}/cover.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(IMAGES_BUCKET)
          .upload(path, coverFile, { cacheControl: '3600', upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path)
        cover_url = urlData.publicUrl
      }

      const links: Record<string, string> = {}
      if (formData.meshokLink) links.meshok = formData.meshokLink
      if (formData.avitoLink)  links.avito  = formData.avitoLink

      const tags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
        : null

      const title = [formData.artist, formData.album].filter(Boolean).join(' – ') || formData.artist || formData.album || 'Без названия'

      const payload = {
        type:        formData.type as ProductType,
        title,
        artist:      formData.artist || null,
        album:       formData.album  || null,
        year:        formData.year   ? parseInt(formData.year) : null,
        label:       formData.label  || null,
        price:       formData.price  ? parseFloat(formData.price) : null,
        status:      formData.status as Product['status'],
        genre:       formData.genre  || null,
        condition:   formData.condition || null,
        description: formData.description || null,
        tags,
        shop_links:  Object.keys(links).length > 0 ? links : null,
        cover_url,
      }

      if (isEdit && product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
        setMessage({ type: 'success', text: 'Товар обновлён' })
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        setMessage({ type: 'success', text: 'Товар добавлен в каталог' })
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
                <img src={previewUrl} alt="Превью" className="upload-preview__img" />
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
            <label className="form-label">Тип *</label>
            <select name="type" className="form-select"
              value={formData.type} onChange={handleChange}>
              <option value="cassette">Кассета</option>
              <option value="cd">CD</option>
              <option value="merch">Мерч</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Статус</label>
            <select name="status" className="form-select"
              value={formData.status} onChange={handleChange}>
              <option value="available">В наличии</option>
              <option value="reserved">Зарезервировано</option>
              <option value="in_transit">В пути</option>
              <option value="sold">Продано</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Исполнитель</label>
            <input type="text" name="artist" className="form-input"
              value={formData.artist} onChange={handleChange}
              placeholder="Кино" />
          </div>

          <div className="form-group">
            <label className="form-label">Альбом</label>
            <input type="text" name="album" className="form-input"
              value={formData.album} onChange={handleChange}
              placeholder="Группа крови" />
          </div>

          <div className="form-group">
            <label className="form-label">Год выпуска</label>
            <input type="number" name="year" className="form-input"
              value={formData.year} onChange={handleChange}
              min="1950" max="2030" placeholder="1988" />
          </div>

          <div className="form-group">
            <label className="form-label">Лейбл</label>
            <input type="text" name="label" className="form-input"
              value={formData.label} onChange={handleChange}
              placeholder="Мелодия" />
          </div>

          <div className="form-group">
            <label className="form-label">Цена (₽)</label>
            <input type="number" name="price" className="form-input"
              value={formData.price} onChange={handleChange}
              min="0" step="0.01" placeholder="1500" />
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
              <option value="Б/У">Б/У</option>
              <option value="Б/У Отличное">Б/У Отличное</option>
              <option value="Б/У Хорошее">Б/У Хорошее</option>
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
              <label className="form-label">Meshok</label>
              <input type="url" name="meshokLink" className="form-input"
                value={formData.meshokLink} onChange={handleChange}
                placeholder="https://meshok.net/item/..." />
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
          {loading ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Добавить товар'}
        </button>
      </form>
    </>
  )
}
