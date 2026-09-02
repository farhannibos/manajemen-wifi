import { IconAlertTriangle } from './icons'

const GAYA = {
  lunas: 'bg-emerald-50 text-emerald-700',
  belum_lunas: 'bg-red-50 text-red-700',
  terlambat: 'bg-red-50 text-red-700',
  aktif: 'bg-emerald-50 text-emerald-700',
  nonaktif: 'bg-slate-100 text-slate-500',
  isolir: 'bg-red-50 text-red-700',
}

const DOT = {
  lunas: 'bg-emerald-500',
  belum_lunas: 'bg-red-500',
  terlambat: 'bg-red-500',
  aktif: 'bg-emerald-500',
  nonaktif: 'bg-slate-400',
  isolir: 'bg-red-500',
}

const LABEL = {
  lunas: 'Lunas',
  belum_lunas: 'Belum Lunas',
  terlambat: 'Terlambat',
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  isolir: 'Isolir',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${GAYA[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {status === 'terlambat' ? (
        <IconAlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${DOT[status] ?? 'bg-slate-400'}`} />
      )}
      {LABEL[status] ?? status}
    </span>
  )
}
