import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS } from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { IconChevronRight, IconPlus, IconSearch, IconUsers } from '../components/icons'

const KOSONG = {
  nama: '',
  no_hp: '',
  alamat: '',
  paket_id: '',
  tanggal_mulai_langganan: new Date().toISOString().slice(0, 10),
}

function Inisial(nama) {
  return nama
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase()
}

export default function PelangganPage() {
  const [daftarPelanggan, setDaftarPelanggan] = useState([])
  const [daftarPaket, setDaftarPaket] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [form, setForm] = useState(KOSONG)
  const [error, setError] = useState('')
  const [pencarian, setPencarian] = useState('')

  async function muatData() {
    setLoading(true)
    const [{ data: pelanggan }, { data: paket }] = await Promise.all([
      supabase
        .from('pelanggan')
        .select('*, paket:paket_id(nama_paket)')
        .order('nama', { ascending: true }),
      supabase.from('paket').select('*').order('nama_paket'),
    ])
    setDaftarPelanggan(pelanggan ?? [])
    setDaftarPaket(paket ?? [])
    setLoading(false)
  }

  useEffect(() => {
    muatData()
  }, [])

  const pelangganTerfilter = useMemo(() => {
    const q = pencarian.trim().toLowerCase()
    if (!q) return daftarPelanggan
    return daftarPelanggan.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.no_hp.includes(q),
    )
  }, [daftarPelanggan, pencarian])

  function bukaTambah() {
    setForm({ ...KOSONG, paket_id: daftarPaket[0]?.id ?? '' })
    setError('')
    setModalTerbuka(true)
  }

  async function simpan(e) {
    e.preventDefault()
    setError('')

    if (!form.nama.trim() || !form.no_hp.trim() || !form.paket_id) {
      setError('Nama, No HP, dan Paket wajib diisi.')
      return
    }

    const { error } = await supabase.from('pelanggan').insert({
      nama: form.nama.trim(),
      no_hp: form.no_hp.trim(),
      alamat: form.alamat.trim() || null,
      paket_id: form.paket_id,
      tanggal_mulai_langganan: form.tanggal_mulai_langganan,
    })

    if (error) {
      setError(error.message)
      return
    }

    setModalTerbuka(false)
    muatData()
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-800">Pelanggan</h1>
        <Button onClick={bukaTambah} icon={<IconPlus className="w-4 h-4" />}>
          Tambah
        </Button>
      </div>

      {daftarPelanggan.length > 0 && (
        <div className="relative mb-4">
          <IconSearch className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={pencarian}
            onChange={(e) => setPencarian(e.target.value)}
            placeholder="Cari nama atau no HP..."
            className={`${INPUT_CLASS} pl-10`}
          />
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && (
        <div className="space-y-3">
          {pelangganTerfilter.map((p) => (
            <Link
              key={p.id}
              to={`/pelanggan/${p.id}`}
              className={`${CARD_CLASS} flex items-center gap-3 p-4 active:bg-slate-50 transition-colors`}
            >
              <span className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                {Inisial(p.nama)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{p.nama}</p>
                <p className="text-sm text-slate-400 truncate">{p.paket?.nama_paket ?? '-'}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={p.status} />
              </div>
              <IconChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>
          ))}

          {pelangganTerfilter.length === 0 && daftarPelanggan.length > 0 && (
            <EmptyState
              icon={<IconSearch className="w-6 h-6" />}
              title="Tidak ditemukan"
              description={`Tidak ada pelanggan yang cocok dengan "${pencarian}".`}
            />
          )}

          {daftarPelanggan.length === 0 && (
            <EmptyState
              icon={<IconUsers className="w-6 h-6" />}
              title="Belum ada pelanggan"
              description='Tambah pelanggan pertama lewat tombol "Tambah" di atas.'
            />
          )}
        </div>
      )}

      {modalTerbuka && (
        <Modal title="Tambah Pelanggan" onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Nama</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>No HP</label>
              <input
                type="tel"
                value={form.no_hp}
                onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Alamat</label>
              <textarea
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                rows={2}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Paket</label>
              <select
                value={form.paket_id}
                onChange={(e) => setForm({ ...form, paket_id: e.target.value })}
                className={INPUT_CLASS}
              >
                {daftarPaket.map((paket) => (
                  <option key={paket.id} value={paket.id}>
                    {paket.nama_paket}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Tanggal Mulai Langganan</label>
              <input
                type="date"
                value={form.tanggal_mulai_langganan}
                onChange={(e) => setForm({ ...form, tanggal_mulai_langganan: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full">
              Simpan
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
