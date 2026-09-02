import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/AuthProvider'
import { supabase } from './lib/supabaseClient'
import BottomNav from './components/BottomNav'
import { IconLogout, IconWifi } from './components/icons'
import InvoicePage from './pages/InvoicePage'
import LaporanPage from './pages/LaporanPage'
import LoginPage from './pages/LoginPage'
import PaketPage from './pages/PaketPage'
import PelangganPage from './pages/PelangganPage'
import PelangganDetailPage from './pages/PelangganDetailPage'
import TagihanPage from './pages/TagihanPage'

function Header() {
  return (
    <header
      className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center">
          <IconWifi className="w-4.5 h-4.5" />
        </span>
        <span className="font-bold text-slate-800">Manajemen WiFi</span>
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        aria-label="Keluar"
        className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 cursor-pointer"
      >
        <IconLogout className="w-5 h-5" />
      </button>
    </header>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/tagihan" replace />} />
          <Route path="/tagihan" element={<TagihanPage />} />
          <Route path="/pelanggan" element={<PelangganPage />} />
          <Route path="/pelanggan/:id" element={<PelangganDetailPage />} />
          <Route path="/invoice/:tagihanId" element={<InvoicePage />} />
          <Route path="/paket" element={<PaketPage />} />
          <Route path="/laporan" element={<LaporanPage />} />
          <Route path="*" element={<Navigate to="/tagihan" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
