import { supabase } from '@/lib/supabase'
import { Cassette } from '@/types/supabase'
import Header from '../components/Header'
import CatalogClient from './CatalogClient'

export const revalidate = 30

async function getAllCassettes() {
  const { data, error } = await supabase
    .from('cassettes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cassettes:', error)
    return []
  }

  return data as Cassette[]
}

export default async function CatalogPage() {
  const cassettes = await getAllCassettes()

  return (
    <>
      <Header />

      <main style={{ padding: '48px 0 0' }}>
        <div className="container">
          <h1 className="section-title" style={{ marginBottom: '28px' }}>
            <span className="section-title__dot" />
            Каталог
          </h1>

          <CatalogClient cassettes={cassettes} />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__inner">
            <p>© {new Date().getFullYear()} Rewplay</p>
            <p>Каталог винтажных аудиокассет</p>
          </div>
        </div>
      </footer>
    </>
  )
}
