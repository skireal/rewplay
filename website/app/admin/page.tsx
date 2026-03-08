import Header from '../components/Header'
import AdminClient from './AdminClient'
import { supabase } from '@/lib/supabase'

export const revalidate = 0

export default async function AdminPage() {
  const { data: cassettes } = await supabase
    .from('cassettes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <Header />

      <main style={{ padding: '48px 0 80px' }}>
        <div className="container">
          <AdminClient cassettes={cassettes ?? []} />
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
