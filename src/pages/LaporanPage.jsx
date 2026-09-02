import { useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah, namaBulan } from '../lib/format'
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS } from '../lib/ui'
import Button from '../components/Button'
import { IconBarChart, IconDownload } from '../components/icons'

const BULAN_OPSI = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function bulanIni() {
  const d = new Date()
  return { bulan: d.getMonth() + 1, tahun: d.getFullYear() }
}

function statusTampilan(t) {
  const hariIni = new Date().toISOString().slice(0, 10)
  if (t.status === 'belum_lunas' && t.tanggal_jatuh_tempo < hariIni) return 'Terlambat'
  return t.status === 'lunas' ? 'Lunas' : 'Belum Lunas'
}

export default function LaporanPage() {
  const [mode, setMode] = useState('bulan')
  const [{ bulan, tahun }, setPeriode] = useState(bulanIni())
  const [dariTanggal, setDariTanggal] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [sampaiTanggal, setSampaiTanggal] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const labelPeriode = useMemo(() => {
    if (mode === 'bulan') return `${BULAN_OPSI[bulan - 1]} ${tahun}`
    return `${dariTanggal} s/d ${sampaiTanggal}`
  }, [mode, bulan, tahun, dariTanggal, sampaiTanggal])

  async function ambilData() {
    let query = supabase
      .from('tagihan')
      .select('*, pelanggan:pelanggan_id(nama, no_hp, paket:paket_id(nama_paket)), pembayaran(*)')
      .order('tanggal_terbit', { ascending: true })

    if (mode === 'bulan') {
      const periode = `${tahun}-${String(bulan).padStart(2, '0')}-01`
      query = query.eq('periode', periode)
    } else {
      query = query.gte('tanggal_terbit', dariTanggal).lte('tanggal_terbit', sampaiTanggal)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }

  function buatPDF(data) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const lebar = doc.internal.pageSize.getWidth()
    const tinggi = doc.internal.pageSize.getHeight()

    const jumlahTagihan = data.length
    const totalLunas = data.filter((t) => t.status === 'lunas').reduce((j, t) => j + Number(t.jumlah_tagihan), 0)
    const totalBelumLunas = data
      .filter((t) => t.status === 'belum_lunas')
      .reduce((j, t) => j + Number(t.jumlah_tagihan), 0)
    const jumlahPelanggan = new Set(data.map((t) => t.pelanggan_id)).size

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, lebar, 74, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text('Manajemen WiFi', 40, 32)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('RT/RW Net · Laporan Rekap Tagihan', 40, 48)
    doc.setFontSize(9)
    doc.text(`Periode: ${labelPeriode}`, 40, 64)
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      lebar - 40,
      64,
      { align: 'right' },
    )

    // Kartu ringkasan
    let y = 96
    const gap = 10
    const boxW = (lebar - 80 - gap * 3) / 4
    const stat = [
      { label: 'Total Tagihan', value: String(jumlahTagihan) },
      { label: 'Pendapatan Masuk', value: formatRupiah(totalLunas) },
      { label: 'Belum Lunas', value: formatRupiah(totalBelumLunas) },
      { label: 'Pelanggan', value: String(jumlahPelanggan) },
    ]
    stat.forEach((s, i) => {
      const x = 40 + i * (boxW + gap)
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(x, y, boxW, 46, 5, 5, 'F')
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(s.label, x + 8, y + 16)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(s.value, x + 8, y + 33, { maxWidth: boxW - 16 })
    })

    y += 66

    autoTable(doc, {
      startY: y,
      head: [['No', 'Nama Pelanggan', 'No HP', 'Paket', 'Periode', 'Jumlah', 'Status', 'Tgl Bayar']],
      body: data.map((t, i) => {
        const bayar = t.pembayaran?.[0]
        return [
          i + 1,
          t.pelanggan?.nama ?? '-',
          t.pelanggan?.no_hp ?? '-',
          t.pelanggan?.paket?.nama_paket ?? '-',
          namaBulan(t.periode),
          formatRupiah(t.jumlah_tagihan),
          statusTampilan(t),
          bayar ? new Date(bayar.tanggal_bayar).toLocaleDateString('id-ID') : '-',
        ]
      }),
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8, cellPadding: 6, textColor: [51, 65, 85] },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 6) {
          if (hook.cell.raw === 'Lunas') hook.cell.styles.textColor = [4, 120, 87]
          else if (hook.cell.raw === 'Terlambat') hook.cell.styles.textColor = [185, 28, 28]
          else hook.cell.styles.textColor = [180, 83, 9]
          hook.cell.styles.fontStyle = 'bold'
        }
      },
      didDrawPage: () => {
        const halamanSkrg = doc.internal.getCurrentPageInfo().pageNumber
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.setFont('helvetica', 'normal')
        doc.text('Manajemen WiFi · RT/RW Net', 40, tinggi - 20)
        doc.text(`Halaman ${halamanSkrg}`, lebar - 40, tinggi - 20, { align: 'right' })
      },
    })

    doc.save(`laporan-tagihan-${labelPeriode.replace(/\s+/g, '-').replace(/\//g, '-')}.pdf`)
  }

  async function unduhLaporan() {
    setError('')
    setLoading(true)
    try {
      const data = await ambilData()
      if (data.length === 0) {
        setError('Tidak ada data tagihan untuk periode ini.')
        return
      }
      buatPDF(data)
    } catch (err) {
      setError('Gagal membuat laporan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-4">Laporan</h1>

      <div className={`${CARD_CLASS} p-5`}>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('bulan')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg cursor-pointer transition-colors ${
              mode === 'bulan' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Per Bulan
          </button>
          <button
            onClick={() => setMode('rentang')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg cursor-pointer transition-colors ${
              mode === 'rentang' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Rentang Tanggal
          </button>
        </div>

        {mode === 'bulan' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setPeriode((p) => ({ ...p, bulan: Number(e.target.value) }))}
                className={INPUT_CLASS}
              >
                {BULAN_OPSI.map((nama, i) => (
                  <option key={nama} value={i + 1}>
                    {nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Tahun</label>
              <input
                type="number"
                value={tahun}
                onChange={(e) => setPeriode((p) => ({ ...p, tahun: Number(e.target.value) }))}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Dari Tanggal</label>
              <input
                type="date"
                value={dariTanggal}
                onChange={(e) => setDariTanggal(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Sampai Tanggal</label>
              <input
                type="date"
                value={sampaiTanggal}
                onChange={(e) => setSampaiTanggal(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <Button
          onClick={unduhLaporan}
          disabled={loading}
          icon={<IconDownload className="w-4 h-4" />}
          className="w-full mt-5"
        >
          {loading ? 'Membuat laporan...' : `Unduh Laporan PDF — ${labelPeriode}`}
        </Button>
      </div>

      <div className="flex items-start gap-2.5 mt-4 text-xs text-slate-400 px-1">
        <IconBarChart className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Laporan berisi rincian semua tagihan pada periode yang dipilih: nama pelanggan, paket, jumlah,
          status, dan tanggal bayar — lengkap dengan ringkasan pendapatan di bagian atas.
        </p>
      </div>
    </div>
  )
}
