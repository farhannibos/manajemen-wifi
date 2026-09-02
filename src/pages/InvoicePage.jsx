import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas-pro'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah, formatTanggal, namaBulan, nomorInvoice, nomorWA } from '../lib/format'
import Skeleton from '../components/Skeleton'
import Button from '../components/Button'
import { IconArrowLeft, IconDownload, IconMessageCircle, IconShare, IconWifi } from '../components/icons'

export default function InvoicePage() {
  const { tagihanId } = useParams()
  const navigate = useNavigate()
  const invoiceRef = useRef(null)

  const [tagihan, setTagihan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memproses, setMemproses] = useState(false)

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

  async function buatGambar() {
    const canvas = await html2canvas(invoiceRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function bagikan() {
    setMemproses(true)
    try {
      const blob = await buatGambar()
      const namaFile = `${nomorInvoice(tagihan)}.png`
      const file = new File([blob], namaFile, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${nomorInvoice(tagihan)}`,
          text: `Bukti tagihan internet ${tagihan.pelanggan?.nama} - ${namaBulan(tagihan.periode)}`,
        })
      } else {
        unduh(blob, namaFile)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        alert('Gagal membuat gambar invoice: ' + err.message)
      }
    } finally {
      setMemproses(false)
    }
  }

  async function unduhGambar() {
    setMemproses(true)
    try {
      const blob = await buatGambar()
      unduh(blob, `${nomorInvoice(tagihan)}.png`)
    } catch (err) {
      alert('Gagal membuat gambar invoice: ' + err.message)
    } finally {
      setMemproses(false)
    }
  }

  function unduh(blob, namaFile) {
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

  const teksWA = [
    `Halo ${tagihan.pelanggan?.nama}, berikut invoice tagihan internet Anda:`,
    ``,
    `Nomor Invoice: ${nomorInvoice(tagihan)}`,
    `Paket: ${tagihan.pelanggan?.paket?.nama_paket} (${tagihan.pelanggan?.paket?.kecepatan})`,
    `Periode: ${namaBulan(tagihan.periode)}`,
    `Total Tagihan: ${formatRupiah(tagihan.jumlah_tagihan)}`,
    `Jatuh Tempo: ${formatTanggal(tagihan.tanggal_jatuh_tempo)}`,
    `Status: ${lunas ? 'LUNAS' : terlambat ? 'TERLAMBAT' : 'BELUM LUNAS'}`,
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

      {/* Kartu invoice — ini yang di-screenshot buat dibagikan */}
      <div ref={invoiceRef} className="bg-white rounded-2xl overflow-hidden border border-slate-100 relative">
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
          {lunas && (
            <div className="absolute top-4 right-4 border-2 border-emerald-500 text-emerald-600 rounded-lg px-3 py-1 rotate-[8deg] font-extrabold text-sm tracking-wider opacity-90 select-none">
              LUNAS
            </div>
          )}
          {terlambat && (
            <div className="absolute top-4 right-4 border-2 border-red-500 text-red-600 rounded-lg px-3 py-1 rotate-[8deg] font-extrabold text-sm tracking-wider opacity-90 select-none">
              TERLAMBAT
            </div>
          )}

          <p className="text-xs text-slate-400">Nomor Invoice</p>
          <p className="font-mono font-semibold text-slate-800 mb-4">{nomorInvoice(tagihan)}</p>

          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Pelanggan</p>
            <p className="font-semibold text-slate-800">{tagihan.pelanggan?.nama}</p>
            <p className="text-sm text-slate-500">{tagihan.pelanggan?.no_hp}</p>
            {tagihan.pelanggan?.alamat && (
              <p className="text-sm text-slate-500">{tagihan.pelanggan.alamat}</p>
            )}
          </div>

          <div className="border-t border-dashed border-slate-200 pt-4 mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Detail Langganan
            </p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Paket</span>
              <span className="text-slate-800 font-medium">
                {tagihan.pelanggan?.paket?.nama_paket} ({tagihan.pelanggan?.paket?.kecepatan})
              </span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Periode</span>
              <span className="text-slate-800 font-medium capitalize">{namaBulan(tagihan.periode)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Jatuh Tempo</span>
              <span className="text-slate-800 font-medium">{formatTanggal(tagihan.tanggal_jatuh_tempo)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 pt-4 mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Total Tagihan</span>
            <span className="text-2xl font-extrabold text-slate-800">
              {formatRupiah(tagihan.jumlah_tagihan)}
            </span>
          </div>

          <div
            className={`rounded-xl px-3.5 py-3 text-sm ${
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

        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Invoice ini dibuat otomatis oleh sistem Manajemen WiFi</p>
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
          onClick={unduhGambar}
          disabled={memproses}
          icon={<IconDownload className="w-4 h-4" />}
          className="flex-1"
        >
          Unduh
        </Button>
        <Button
          variant="outline"
          onClick={bagikan}
          disabled={memproses}
          icon={<IconShare className="w-4 h-4" />}
          className="flex-1"
        >
          {memproses ? 'Memproses...' : 'Bagikan Gambar'}
        </Button>
      </div>
      <p className="text-xs text-slate-400 text-center mt-2.5">
        "Kirim ke WhatsApp" langsung buka chat dengan ringkasan teks. "Bagikan Gambar" butuh HTTPS (aktif
        setelah di-deploy).
      </p>
    </div>
  )
}
