import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah, formatTanggal, namaBulan, nomorWA } from '../lib/format'
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS } from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import {
  IconArrowLeft,
  IconHistory,
  IconLock,
  IconMapPin,
  IconMessageCircle,
  IconPencil,
  IconPhone,
  IconReceipt,
  IconTrash,
  IconUnlock,
  IconX,
} from '../components/icons'
// STUB isolir/buka akses ke Mikrotik.
// Saat ini HANYA console.log + update database (lewat RPC ubah_status_pelanggan).
// Nanti begitu router Mikrotik sudah bisa diakses, tinggal isi fungsi ini
// dengan panggilan ke Mikrotik API (RouterOS API / winbox script / dsb).
async function stubMikrotik(aksi, pelanggan) {
  console.log(
    `[STUB MIKROTIK] Aksi "${aksi}" untuk pelanggan "${pelanggan.nama}" (${pelanggan.no_hp}). ` +
      `Belum tersambung ke router asli — ini baru update status di database.`,
  )
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

export default function PelangganDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [pelanggan, setPelanggan] = useState(null)
  const [daftarPaket, setDaftarPaket] = useState([])
  const [riwayatTagihan, setRiwayatTagihan] = useState([])
  const [riwayatStatus, setRiwayatStatus] = useState([])
  const [loading, setLoading] = useState(true)
  const [modeEdit, setModeEdit] = useState(false)
  const [form, setForm] = useState(null)
  const [memproses, setMemproses] = useState(false)
  const [error, setError] = useState('')

  async function muatData() {
    setLoading(true)
    const [{ data: p }, { data: paket }, { data: tagihan }, { data: riwayat }] = await Promise.all([
      supabase.from('pelanggan').select('*, paket:paket_id(nama_paket, harga_bulanan)').eq('id', id).single(),
      supabase.from('paket').select('*').order('nama_paket'),
      supabase.from('tagihan').select('*').eq('pelanggan_id', id).order('periode', { ascending: false }),
      supabase
        .from('riwayat_status_pelanggan')
        .select('*')
        .eq('pelanggan_id', id)
        .order('waktu', { ascending: false })
        .limit(10),
    ])
    setPelanggan(p)
    setDaftarPaket(paket ?? [])
    setRiwayatTagihan(tagihan ?? [])
    setRiwayatStatus(riwayat ?? [])
    setLoading(false)
  }

  useEffect(() => {
    muatData()
  }, [id])

  function bukaEdit() {
    setForm({
      nama: pelanggan.nama,
      no_hp: pelanggan.no_hp,
      alamat: pelanggan.alamat ?? '',
      paket_id: pelanggan.paket_id,
      tanggal_mulai_langganan: pelanggan.tanggal_mulai_langganan,
    })
    setError('')
    setModeEdit(true)
  }

  async function simpanEdit(e) {
    e.preventDefault()
    setError('')

    if (!form.nama.trim() || !form.no_hp.trim()) {
      setError('Nama dan No HP wajib diisi.')
      return
    }

    const { error } = await supabase
      .from('pelanggan')
      .update({
        nama: form.nama.trim(),
        no_hp: form.no_hp.trim(),
        alamat: form.alamat.trim() || null,
        paket_id: form.paket_id,
        tanggal_mulai_langganan: form.tanggal_mulai_langganan,
      })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setModeEdit(false)
    muatData()
  }

  async function ubahStatus(statusBaru, aksiLabel) {
    if (!confirm(`Yakin mau "${aksiLabel}" untuk ${pelanggan.nama}?`)) return
    setMemproses(true)

    await stubMikrotik(aksiLabel, pelanggan)

    const { error } = await supabase.rpc('ubah_status_pelanggan', {
      p_pelanggan_id: id,
      p_status_baru: statusBaru,
    })

    setMemproses(false)

    if (error) {
      alert('Gagal ubah status: ' + error.message)
      return
    }

    muatData()
  }

  async function hapusPelanggan() {
    if (!confirm(`Hapus pelanggan "${pelanggan.nama}"? Data tagihan terkait juga perlu dihapus manual.`)) return
    const { error } = await supabase.from('pelanggan').delete().eq('id', id)
    if (error) {
      alert('Gagal hapus: mungkin pelanggan ini masih punya tagihan.')
      return
    }
    navigate('/pelanggan')
  }

  if (loading)
    return (
      <div className="p-4 pb-28 max-w-lg mx-auto">
        <Skeleton jumlah={2} />
      </div>
    )
  if (!pelanggan) return <p className="p-4 text-sm text-slate-500">Pelanggan tidak ditemukan.</p>

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-3 -ml-1 px-1 py-1 active:text-indigo-600 cursor-pointer"
      >
        <IconArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      <div className={`${CARD_CLASS} p-5 mb-4`}>
        <div className="flex items-start gap-3 mb-4">
          <span className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-lg">
            {Inisial(pelanggan.nama)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">{pelanggan.nama}</h1>
              <StatusBadge status={pelanggan.status} />
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <IconPhone className="w-3.5 h-3.5 shrink-0" />
              {pelanggan.no_hp}
            </p>
            {pelanggan.alamat && (
              <p className="text-sm text-slate-500 flex items-start gap-1.5 mt-0.5">
                <IconMapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{pelanggan.alamat}</span>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-indigo-50/60 px-3.5 py-3 mb-4">
          <p className="text-sm font-semibold text-slate-700">
            {pelanggan.paket?.nama_paket} &middot; {formatRupiah(pelanggan.paket?.harga_bulanan)}/bulan
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Mulai langganan: {formatTanggal(pelanggan.tanggal_mulai_langganan)}
          </p>
        </div>

        <a
          href={`https://wa.me/${nomorWA(pelanggan.no_hp)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 min-h-11 w-full px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.97] transition-all duration-150 mb-2.5"
        >
          <IconMessageCircle className="w-4 h-4" />
          Hubungi via WhatsApp
        </a>

        <div className="flex gap-2">
          <Button variant="outline" onClick={bukaEdit} icon={<IconPencil className="w-4 h-4" />} className="flex-1">
            Edit
          </Button>
          <Button
            variant="outline-destructive"
            onClick={hapusPelanggan}
            icon={<IconTrash className="w-4 h-4" />}
            className="flex-1"
          >
            Hapus
          </Button>
        </div>
      </div>

      {/* Tombol isolir / buka akses — manual, bukan otomatis */}
      <div className={`${CARD_CLASS} p-5 mb-4`}>
        <h2 className="text-sm font-bold text-slate-700 mb-1">Akses Internet</h2>
        <p className="text-xs text-slate-400 mb-3.5">
          Aksi manual. Klik setelah cek sendiri status pembayaran/notifikasi pelanggan.
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            disabled={memproses || pelanggan.status === 'isolir'}
            onClick={() => ubahStatus('isolir', 'Isolir')}
            icon={<IconLock className="w-4 h-4" />}
            className="flex-1"
          >
            Isolir
          </Button>
          <Button
            variant="success"
            disabled={memproses || pelanggan.status === 'aktif'}
            onClick={() => ubahStatus('aktif', 'Buka Akses')}
            icon={<IconUnlock className="w-4 h-4" />}
            className="flex-1"
          >
            Buka Akses
          </Button>
        </div>

        {riwayatStatus.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
              <IconHistory className="w-3.5 h-3.5" />
              Riwayat perubahan status
            </p>
            <div className="space-y-1.5">
              {riwayatStatus.map((r) => (
                <p key={r.id} className="text-xs text-slate-400">
                  {formatTanggal(r.waktu)} &mdash;{' '}
                  <span className="capitalize">{r.status_lama}</span> &rarr;{' '}
                  <span className="capitalize font-medium text-slate-600">{r.status_baru}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`${CARD_CLASS} p-5`}>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Riwayat Tagihan</h2>
        <div className="space-y-1">
          {riwayatTagihan.map((t) => (
            <div key={t.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm text-slate-700 capitalize font-medium">{namaBulan(t.periode)}</p>
                <p className="text-xs text-slate-400">{formatRupiah(t.jumlah_tagihan)}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
          {riwayatTagihan.length === 0 && (
            <EmptyState
              icon={<IconReceipt className="w-6 h-6" />}
              title="Belum ada tagihan"
              description="Tagihan akan muncul otomatis setiap bulan sesuai tanggal mulai langganan."
            />
          )}
        </div>
      </div>

      {modeEdit && (
        <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-slate-900/40">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span className="w-9 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">Edit Pelanggan</h2>
              <button
                onClick={() => setModeEdit(false)}
                aria-label="Tutup"
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={simpanEdit} className="p-5 space-y-4">
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
          </div>
        </div>
      )}
    </div>
  )
}
