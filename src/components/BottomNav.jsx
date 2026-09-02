import { NavLink } from 'react-router-dom'
import { IconBarChart, IconReceipt, IconUsers, IconWifi } from './icons'

const MENU = [
  { to: '/tagihan', label: 'Tagihan', Icon: IconReceipt },
  { to: '/pelanggan', label: 'Pelanggan', Icon: IconUsers },
  { to: '/paket', label: 'Paket', Icon: IconWifi },
  { to: '/laporan', label: 'Laporan', Icon: IconBarChart },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 flex justify-around z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {MENU.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2.5 flex-1 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors ${
                  isActive ? 'bg-indigo-50' : ''
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
