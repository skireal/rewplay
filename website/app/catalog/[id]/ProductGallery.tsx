'use client'

import { useState } from 'react'

interface Props {
  title: string
  coverUrl: string | null
  images: string[]
}

export default function ProductGallery({ title, coverUrl, images }: Props) {
  // Все фото: если обложки нет в списке, ставим её первой
  const all = coverUrl && !images.includes(coverUrl) ? [coverUrl, ...images] : images
  const [active, setActive] = useState(0)

  if (all.length === 0) {
    return <div className="detail-image" />
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={all[active]}
        alt={`${title} — фото ${active + 1}`}
        className="detail-image detail-image--photo"
      />

      {all.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          {all.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Показать фото ${i + 1}`}
              aria-pressed={i === active}
              style={{
                padding: 0,
                border: i === active ? '2px solid var(--red, #c8171d)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                opacity: i === active ? 1 : 0.7,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{ width: '72px', height: '72px', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
