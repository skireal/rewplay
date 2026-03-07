import Header from '../components/Header'
import AdminForm from './AdminForm'

export default function AdminPage() {
  return (
    <>
      <Header />

      <main style={{ padding: '48px 0 80px' }}>
        <div className="container">
          <div style={{ maxWidth: '800px' }}>

            <div className="admin-header">
              <h1>Новая кассета</h1>
              <p>Добавление в каталог</p>
            </div>

            <AdminForm />

          </div>
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
