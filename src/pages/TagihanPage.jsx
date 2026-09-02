import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah, formatTanggal, namaBulan } from '../lib/format'
import { CARD_CLASS } from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { IconCheck, IconClock, IconReceipt } from '../components/icons'

const FILTER = [
  { key: 'semua', label: 'Semua' },
  { key: 'belum_lunas', label: 'Belum Lunas' },
  { key: 'terlambat', label: 'Terlambat' },
  { key: 'lunas', label: 'Lunas' },
]

function statusTampilan(t) {
  const hariIni = new Date().toISOString().slice(0, 10)
  if (t.status === 'belum_lunas' && t.tanggal_jatuh_tempo < hariIni) return 'terlambat'
  return t.status
}

export default function TagihanPage() {
  const [daftarTagihan, setDaftarTagihan] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('semua')
  const [memproses, setMemproses] = useState(null)

  async function muatTagihan() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tagihan')
      .select('*, pelanggan:pelanggan_id(nama, no_hp)')
      .order('tanggal_jatuh_tempo', { ascending: true })
    if (!error) setDaftarTagihan(data)
    setLoading(false)
  }

  useEffect(() => {
    muatTagihan()
  }, [])

  const ringkasan = useMemo(() => {
    const belumLunas = daftarTagihan.filter((t) => t.status === 'belum_lunas')
    return {
      totalBelumLunas: belumLunas.reduce((jml, t) => jml + Number(t.jumlah_tagihan), 0),
      jumlahBelumLunas: belumLunas.length,
    }
  }, [daftarTagihan])

  const tagihanTerfilter = useMemo(() => {
    if (filter === 'semua') return daftarTagihan
    return daftarTagihan.filter((t) => statusTampilan(t) === filter)
  }, [daftarTagihan, filter])

  async function tandaiLunas(tagihan) {
    if (!confirm(`Tandai tagihan ${tagihan.pelanggan?.nama} (${namaBulan(tagihan.periode)}) sebagai lunas?`))
      return
    setMemproses(tagihan.id)
    const { error } = await supabase.rpc('tandai_lunas', { p_tagihan_id: tagihan.id })
    setMemproses(null)
    if (error) {
      alert('Gagal: ' + error.message)
      return
    }
    muatTagihan()
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-4">Rekap Tagihan</h1>

      {!loading && ringkasan.jumlahBelumLunas > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4 mb-4 shadow-sm shadow-indigo-600/20">
          <p className="text-xs text-indigo-100 font-medium">Total belum lunas</p>
          <p className="text-2xl font-bold mt-0.5">{formatRupiah(ringkasan.totalBelumLunas)}</p>
          <p className="text-xs text-indigo-100 mt-1">dari {ringkasan.jumlahBelumLunas} tagihan</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto mb-4 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTER.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 active:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Skeleton />}

      {!loading && (
        <div className="space-y-3">
          {tagihanTerfilter.map((t) => {
            const status = statusTampilan(t)
            return (
              <div key={t.id} className={`${CARD_CLASS} p-4`}>
                <div className="flex justify-between items-start gap-2">
                  <Link to={`/pelanggan/${t.pelanggan_id}`} className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{t.pelanggan?.nama}</p>
                    <p className="text-sm text-slate-400 capitalize">{namaBulan(t.periode)}</p>
                    <p className="text-slate-700 font-bold mt-1.5">{formatRupiah(t.jumlah_tagihan)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <IconClock className="w-3 h-3" />
                      Jatuh tempo: {formatTanggal(t.tanggal_jatuh_tempo)}
                    </p>
                  </Link>
                  <StatusBadge status={status} />
                </div>

                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/invoice/${t.id}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-semibold bg-white text-slate-700 border border-slate-200 active:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex-1"
                  >
                    <IconReceipt className="w-4 h-4" />
                    Invoice
                  </Link>
                  {t.status === 'belum_lunas' && (
                    <Button
                      variant="success"
                      onClick={() => tandaiLunas(t)}
                      disabled={memproses === t.id}
                      icon={<IconCheck className="w-4 h-4" />}
                      className="flex-1"
                    >
                      {memproses === t.id ? 'Memproses...' : 'Tandai Lunas'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {tagihanTerfilter.length === 0 && (
            <EmptyState
              icon={<IconReceipt className="w-6 h-6" />}
              title="Tidak ada tagihan"
              description="Tidak ada tagihan yang cocok dengan filter ini."
            />
          )}
        </div>
      )}
    </div>
  )
}
