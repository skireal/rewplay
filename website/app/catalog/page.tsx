import { supabase } from '@/lib/supabase'
import { Product } from '@/types/supabase'
import Header from '../components/Header'
import CatalogClient from './CatalogClient'

export const revalidate = 30

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as Product[]
}

export default async function CatalogPage() {
  const products = await getAllProducts()

  return (
    <>
      <Header />

      <main style={{ padding: '48px 0 0' }}>
        <div className="container">
          <h1 className="section-title" style={{ marginBottom: '28px' }}>
            <span className="section-title__dot" />
            Каталог
          </h1>

          <CatalogClient products={products} />
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
