import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah } from '../lib/format'
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS } from '../lib/ui'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { IconPencil, IconPlus, IconTrash, IconWifi } from '../components/icons'

const KOSONG = { nama_paket: '', kecepatan: '', harga_bulanan: '' }

export default function PaketPage() {
  const [daftarPaket, setDaftarPaket] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [form, setForm] = useState(KOSONG)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')

  async function muatPaket() {
    setLoading(true)
    const { data, error } = await supabase
      .from('paket')
      .select('*')
      .order('harga_bulanan', { ascending: true })
    if (!error) setDaftarPaket(data)
    setLoading(false)
  }

  useEffect(() => {
    muatPaket()
  }, [])

  function bukaTambah() {
    setForm(KOSONG)
    setEditId(null)
    setError('')
    setModalTerbuka(true)
  }

  function bukaEdit(paket) {
    setForm({
      nama_paket: paket.nama_paket,
      kecepatan: paket.kecepatan,
      harga_bulanan: paket.harga_bulanan,
    })
    setEditId(paket.id)
    setError('')
    setModalTerbuka(true)
  }

  async function simpan(e) {
    e.preventDefault()
    setError('')

    const payload = {
      nama_paket: form.nama_paket.trim(),
      kecepatan: form.kecepatan.trim(),
      harga_bulanan: Number(form.harga_bulanan),
    }

    if (!payload.nama_paket || !payload.kecepatan || !payload.harga_bulanan) {
      setError('Semua field wajib diisi.')
      return
    }

    const query = editId
      ? supabase.from('paket').update(payload).eq('id', editId)
      : supabase.from('paket').insert(payload)

    const { error } = await query
    if (error) {
      setError(error.message)
      return
    }

    setModalTerbuka(false)
    muatPaket()
  }

  async function hapusPaket(paket) {
    if (!confirm(`Hapus paket "${paket.nama_paket}"?`)) return
    const { error } = await supabase.from('paket').delete().eq('id', paket.id)
    if (error) {
      alert('Gagal hapus: mungkin paket ini masih dipakai pelanggan.')
      return
    }
    muatPaket()
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-800">Paket Internet</h1>
        <Button onClick={bukaTambah} icon={<IconPlus className="w-4 h-4" />}>
          Tambah
        </Button>
      </div>

      {loading && <Skeleton />}

      {!loading && (
        <div className="space-y-3">
          {daftarPaket.map((paket) => (
            <div key={paket.id} className={`${CARD_CLASS} p-4`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <IconWifi className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{paket.nama_paket}</p>
                    <p className="text-sm text-slate-400">{paket.kecepatan}</p>
                    <p className="text-indigo-600 font-bold mt-1">
                      {formatRupiah(paket.harga_bulanan)}
                      <span className="text-slate-400 font-medium text-sm">/bulan</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => bukaEdit(paket)}
                    aria-label={`Edit ${paket.nama_paket}`}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 cursor-pointer"
                  >
                    <IconPencil className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => hapusPaket(paket)}
                    aria-label={`Hapus ${paket.nama_paket}`}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-red-400 active:bg-red-50 cursor-pointer"
                  >
                    <IconTrash className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {daftarPaket.length === 0 && (
            <EmptyState
              icon={<IconWifi className="w-6 h-6" />}
              title="Belum ada paket internet"
              description='Tambah paket pertama lewat tombol "Tambah" di atas.'
            />
          )}
        </div>
      )}

      {modalTerbuka && (
        <Modal title={editId ? 'Edit Paket' : 'Tambah Paket'} onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Nama Paket</label>
              <input
                type="text"
                value={form.nama_paket}
                onChange={(e) => setForm({ ...form, nama_paket: e.target.value })}
                placeholder="Misal: Paket Hemat"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Kecepatan</label>
              <input
                type="text"
                value={form.kecepatan}
                onChange={(e) => setForm({ ...form, kecepatan: e.target.value })}
                placeholder="Misal: 10 Mbps"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Harga Bulanan (Rp)</label>
              <input
                type="number"
                value={form.harga_bulanan}
                onChange={(e) => setForm({ ...form, harga_bulanan: e.target.value })}
                placeholder="Misal: 100000"
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
