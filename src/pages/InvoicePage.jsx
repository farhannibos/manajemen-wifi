import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas-pro'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah, formatTanggal, namaBulan, nomorInvoice, nomorWA } from '../lib/format'
import Skeleton from '../components/Skeleton'
import Button from '../components/Button'
import {
  IconArrowLeft,
  IconCalendar,
  IconDownload,
  IconMessageCircle,
  IconShare,
  IconWifi,
} from '../components/icons'

export default function InvoicePage() {
  const { tagihanId } = useParams()
  const navigate = useNavigate()
  const invoiceRef = useRef(null)

  const [tagihan, setTagihan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memproses, setMemproses] = useState('')
  const [dicetak] = useState(() => new Date())

  useEffect(() => {
    async function muat() {
      setLoading(true)
      const { data } = await supabase
        .from('tagihan')
        .select(
          '*, pelanggan:pelanggan_id(nama, no_hp, alamat, paket:paket_id(nama_paket, kecepatan)), pembayaran(*)',
        )
        .eq('id', tagihanId)
        .single()
      setTagihan(data)
      setLoading(false)
    }
    muat()
  }, [tagihanId])

  async function buatCanvas() {
    return html2canvas(invoiceRef.current, {
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
    })
  }

  async function bagikan() {
    setMemproses('bagikan')
    try {
      const canvas = await buatCanvas()
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const namaFile = `${nomorInvoice(tagihan)}.png`
      const file = new File([blob], namaFile, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${nomorInvoice(tagihan)}`,
          text: `Bukti tagihan internet ${tagihan.pelanggan?.nama} - ${namaBulan(tagihan.periode)}`,
        })
      } else {
        unduhBlob(blob, namaFile)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') alert('Gagal membuat gambar invoice: ' + err.message)
    } finally {
      setMemproses('')
    }
  }

  async function unduhPDF() {
    setMemproses('pdf')
    try {
      const canvas = await buatCanvas()
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${nomorInvoice(tagihan)}.pdf`)
    } catch (err) {
      alert('Gagal membuat PDF: ' + err.message)
    } finally {
      setMemproses('')
    }
  }

  function unduhBlob(blob, namaFile) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = namaFile
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading)
    return (
      <div className="p-4 pb-10 max-w-lg mx-auto">
        <Skeleton jumlah={1} />
      </div>
    )
  if (!tagihan) return <p className="p-4 text-sm text-slate-500">Invoice tidak ditemukan.</p>

  const pembayaran = tagihan.pembayaran?.[0]
  const lunas = tagihan.status === 'lunas'
  const hariIni = new Date().toISOString().slice(0, 10)
  const terlambat = !lunas && tagihan.tanggal_jatuh_tempo < hariIni
  const labelStatus = lunas ? 'LUNAS' : terlambat ? 'TERLAMBAT' : 'BELUM LUNAS'

  const teksWA = [
    `Halo ${tagihan.pelanggan?.nama}, berikut invoice tagihan internet Anda:`,
    ``,
    `Nomor Invoice: ${nomorInvoice(tagihan)}`,
    `Paket: ${tagihan.pelanggan?.paket?.nama_paket} (${tagihan.pelanggan?.paket?.kecepatan})`,
    `Periode: ${namaBulan(tagihan.periode)}`,
    `Total Tagihan: ${formatRupiah(tagihan.jumlah_tagihan)}`,
    `Jatuh Tempo: ${formatTanggal(tagihan.tanggal_jatuh_tempo)}`,
    `Status: ${labelStatus}`,
    ``,
    `Terima kasih.`,
  ].join('\n')

  const linkWA = tagihan.pelanggan?.no_hp
    ? `https://wa.me/${nomorWA(tagihan.pelanggan.no_hp)}?text=${encodeURIComponent(teksWA)}`
    : null

  return (
    <div className="p-4 pb-10 max-w-lg mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-3 -ml-1 px-1 py-1 active:text-indigo-600 cursor-pointer"
      >
        <IconArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {/* Kartu invoice — ini yang di-render jadi gambar/PDF */}
      <div
        ref={invoiceRef}
        className="bg-white rounded-2xl overflow-hidden border border-slate-100 relative"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-4 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <IconWifi className="w-5 h-5" />
          </span>
          <div>
            <p className="font-bold leading-tight">Manajemen WiFi</p>
            <p className="text-xs text-indigo-100 leading-tight">RT/RW Net</p>
          </div>
        </div>

        <div className="px-5 py-4 relative">
          <div
            className={`absolute top-4 right-5 w-[70px] h-[70px] rounded-full border-2 flex items-center justify-center rotate-[-14deg] opacity-90 select-none ${
              lunas ? 'border-emerald-500' : 'border-red-500'
            }`}
          >
            <div
              className={`w-[58px] h-[58px] rounded-full border border-dashed flex items-center justify-center ${
                lunas ? 'border-emerald-500' : 'border-red-500'
              }`}
            >
              <span
                className={`font-extrabold text-center leading-[11px] tracking-wide whitespace-pre-line ${
                  lunas ? 'text-emerald-600 text-[11px]' : 'text-red-600 text-[8px]'
                }`}
              >
                {lunas ? 'LUNAS' : terlambat ? 'TERLAMBAT' : 'BELUM\nLUNAS'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400">Nomor Invoice</p>
          <p className="font-mono font-semibold text-slate-800 pr-20">{nomorInvoice(tagihan)}</p>
          <p className="text-xs text-slate-400 mt-1">Dicetak {formatTanggal(dicetak)}</p>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Ditagihkan Kepada
            </p>
            <p className="font-semibold text-slate-800">{tagihan.pelanggan?.nama}</p>
            <p className="text-sm text-slate-500">{tagihan.pelanggan?.no_hp}</p>
            {tagihan.pelanggan?.alamat && (
              <p className="text-sm text-slate-500">{tagihan.pelanggan.alamat}</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-2 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <IconWifi className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    Langganan {tagihan.pelanggan?.paket?.nama_paket}
                  </p>
                  <p className="text-xs text-slate-400">{tagihan.pelanggan?.paket?.kecepatan}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <IconCalendar className="w-3 h-3" />
                    <span className="capitalize">{namaBulan(tagihan.periode)}</span>
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800 shrink-0">
                {formatRupiah(tagihan.jumlah_tagihan)}
              </span>
            </div>

            <div className="flex justify-between text-xs text-slate-400 pt-3">
              <span>Tanggal Terbit</span>
              <span>{formatTanggal(tagihan.tanggal_terbit)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Jatuh Tempo</span>
              <span className={terlambat ? 'text-red-500 font-medium' : ''}>
                {formatTanggal(tagihan.tanggal_jatuh_tempo)}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-indigo-50/70 px-4 py-3.5 flex items-center justify-between">
            <span className="text-sm text-slate-600 font-medium">Total Tagihan</span>
            <span className="text-2xl font-extrabold text-indigo-700">
              {formatRupiah(tagihan.jumlah_tagihan)}
            </span>
          </div>

          <div
            className={`rounded-xl px-3.5 py-3 text-sm mt-3 ${
              lunas
                ? 'bg-emerald-50 text-emerald-700'
                : terlambat
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700'
            }`}
          >
            {lunas ? (
              <>
                <p className="font-semibold">Sudah Dibayar</p>
                {pembayaran && (
                  <p className="text-xs mt-0.5 opacity-80">
                    {formatTanggal(pembayaran.tanggal_bayar)} &middot; {pembayaran.metode ?? 'tunai'}
                  </p>
                )}
              </>
            ) : (
              <p className="font-semibold">{terlambat ? 'Pembayaran Terlambat' : 'Belum Dibayar'}</p>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 text-center bg-slate-50/50">
          <p className="text-xs text-slate-400">Manajemen WiFi &middot; RT/RW Net</p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Invoice ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan
          </p>
        </div>
      </div>

      {linkWA && (
        <a
          href={linkWA}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 min-h-11 w-full px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.97] transition-all duration-150 mt-4"
        >
          <IconMessageCircle className="w-4 h-4" />
          Kirim ke WhatsApp Pelanggan
        </a>
      )}

      <div className="flex gap-2 mt-2.5">
        <Button
          variant="outline"
          onClick={unduhPDF}
          disabled={!!memproses}
          icon={<IconDownload className="w-4 h-4" />}
          className="flex-1"
        >
          {memproses === 'pdf' ? 'Memproses...' : 'Unduh PDF'}
        </Button>
        <Button
          variant="outline"
          onClick={bagikan}
          disabled={!!memproses}
          icon={<IconShare className="w-4 h-4" />}
          className="flex-1"
        >
          {memproses === 'bagikan' ? 'Memproses...' : 'Bagikan Gambar'}
        </Button>
      </div>
      <p className="text-xs text-slate-400 text-center mt-2.5">
        "Kirim ke WhatsApp" langsung buka chat dengan ringkasan teks. "Bagikan Gambar" butuh HTTPS
        (aktif setelah di-deploy).
      </p>
    </div>
  )
}
