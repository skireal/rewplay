'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Cassette } from '@/types/supabase'
import { COVERS_BUCKET } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import AdminForm from './AdminForm'

type View = 'list' | 'add' | 'edit'

export default function AdminClient({ cassettes: initial }: { cassettes: Cassette[] }) {
  const router = useRouter()
  const [view, setView] = useState<View>('list')
  const [editTarget, setEditTarget] = useState<Cassette | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const openAdd = () => { setEditTarget(null); setView('add') }
  const openEdit = (c: Cassette) => { setEditTarget(c); setView('edit') }
  const backToList = () => { setEditTarget(null); setView('list'); router.refresh() }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const handleDelete = async (c: Cassette) => {
    if (!confirm(`Удалить «${c.artist} — ${c.album}»?\nЭто действие нельзя отменить.`)) return
    setDeleting(c.id)
    try {
      if (c.cover_url) {
        const fileName = c.cover_url.split('/').pop()
        if (fileName) await supabase.storage.from(COVERS_BUCKET).remove([fileName])
      }
      const { error } = await supabase.from('cassettes').delete().eq('id', c.id)
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
              <h1>{view === 'add' ? 'Новая кассета' : 'Редактировать'}</h1>
              <p>{view === 'add' ? 'Добавление в каталог' : editTarget ? `${editTarget.artist} — ${editTarget.album}` : ''}</p>
            </div>
          </div>
        </div>
        <AdminForm cassette={editTarget ?? undefined} onSuccess={backToList} />
      </div>
    )
  }

  return (
    <div>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Каталог</h1>
          <p>Управление кассетами · {initial.length} шт.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" onClick={openAdd}>+ Добавить</button>
          <button className="btn btn--outline" onClick={handleLogout}>Выйти</button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="empty-state">
          <p>Каталог пуст</p>
          <button className="btn btn--sm" onClick={openAdd}>Добавить первую кассету</button>
        </div>
      ) : (
        <div className="admin-list">
          {initial.map((c) => (
            <div key={c.id} className="admin-list__row">
              {/* Обложка */}
              <div className="admin-list__thumb">
                {c.cover_url
                  ? <img src={c.cover_url} alt="" />   // eslint-disable-line @next/next/no-img-element
                  : <div className="admin-list__thumb-placeholder" />
                }
              </div>

              {/* Инфо */}
              <div className="admin-list__info">
                <div className="admin-list__artist">{c.artist}</div>
                <div className="admin-list__album">{c.album}{c.year ? ` (${c.year})` : ''}</div>
                {c.genre && <div className="admin-list__genre">{c.genre}</div>}
              </div>

              {/* Цена + наличие */}
              <div className="admin-list__meta">
                <span className="admin-list__price">{formatPrice(c.price)}</span>
                <span className={`stock-badge ${c.in_stock ? 'stock-badge--in' : 'stock-badge--out'}`}>
                  {c.in_stock ? `×${c.quantity}` : 'нет'}
                </span>
              </div>

              {/* Кнопки */}
              <div className="admin-list__actions">
                <button className="btn btn--outline btn--sm" onClick={() => openEdit(c)}>
                  Изменить
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(c)}
                  disabled={deleting === c.id}
                >
                  {deleting === c.id ? '...' : 'Удалить'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
