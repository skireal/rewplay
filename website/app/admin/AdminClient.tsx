'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Product, STATUS_LABELS, TYPE_LABELS } from '@/types/supabase'
import { IMAGES_BUCKET } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import AdminForm from './AdminForm'

type View = 'list' | 'add' | 'edit'

export default function AdminClient({ products: initial }: { products: Product[] }) {
  const router = useRouter()
  const [view, setView] = useState<View>('list')
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const openAdd = () => { setEditTarget(null); setView('add') }
  const openEdit = (p: Product) => { setEditTarget(p); setView('edit') }
  const backToList = () => { setEditTarget(null); setView('list'); router.refresh() }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Удалить «${p.artist ?? p.title}»?\nЭто действие нельзя отменить.`)) return
    setDeleting(p.id)
    try {
      if (p.cover_url) {
        const parts = p.cover_url.split('/products/')
        if (parts[1]) await supabase.storage.from(IMAGES_BUCKET).remove([parts[1]])
      }
      const { error } = await supabase.from('products').delete().eq('id', p.id)
      if (error) throw error
      router.refresh()
    } catch (err: any) {
      alert(`Ошибка при удалении: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  if (view === 'add' || view === 'edit') {
    return (
      <div style={{ maxWidth: '800px' }}>
        <div className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn--outline btn--sm" onClick={backToList}>← Назад</button>
            <div>
              <h1>{view === 'add' ? 'Новый товар' : 'Редактировать'}</h1>
              <p>{view === 'add' ? 'Добавление в каталог' : editTarget ? `${editTarget.artist ?? ''} — ${editTarget.album ?? editTarget.title}` : ''}</p>
            </div>
          </div>
        </div>
        <AdminForm product={editTarget ?? undefined} onSuccess={backToList} />
      </div>
    )
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Каталог</h1>
          <p>{initial.length} товаров</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" onClick={openAdd}>+ Добавить</button>
          <button className="btn btn--outline" onClick={handleLogout}>Выйти</button>
        </div>
      </div>

      <div className="admin-list">
        {initial.map((p) => (
          <div key={p.id} className="admin-item">
            <div className="admin-item__image">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt={p.title} />
              ) : (
                <div className="admin-item__image-placeholder" />
              )}
            </div>
            <div className="admin-item__info">
              <div className="admin-item__title">
                {p.artist && <span>{p.artist} — </span>}
                {p.album ?? p.title}
              </div>
              <div className="admin-item__meta">
                <span>{TYPE_LABELS[p.type]}</span>
                {p.year && <span>{p.year}</span>}
                {p.price != null && <span>{formatPrice(p.price)}</span>}
                <span className={`stock-badge stock-badge--sm ${p.status === 'available' ? 'stock-badge--in' : 'stock-badge--wait'}`}>
                  {STATUS_LABELS[p.status]}
                </span>
              </div>
            </div>
            <div className="admin-item__actions">
              <button className="btn btn--outline btn--sm" onClick={() => openEdit(p)}>
                Изменить
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => handleDelete(p)}
                disabled={deleting === p.id}
              >
                {deleting === p.id ? '...' : 'Удалить'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
