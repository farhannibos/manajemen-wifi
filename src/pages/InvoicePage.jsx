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

// Kartu invoice ini di-capture jadi gambar/PDF lewat html2canvas, yang
// tidak selalu bisa membaca stylesheet Tailwind v4 (pakai @layer) dengan
// benar di semua browser/hosting. Supaya hasil capture selalu konsisten,
// SEMUA elemen di dalam kartu ini pakai inline style, bukan className.
const s = {
  card: {
    background: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid #f1f5f9',
    position: 'relative',
    fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  },
  header: {
    background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
    color: '#ffffff',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#ffffff',
  },
  body: { padding: '16px 20px', position: 'relative' },
  labelKecil: { fontSize: 12, color: '#94a3b8', margin: 0 },
  nomorInvoice: {
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 600,
    color: '#1e293b',
    margin: '2px 0 0',
    paddingRight: 84,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    margin: '0 0 6px',
  },
  namaBold: { fontWeight: 600, color: '#1e293b', margin: 0, fontSize: 15 },
  teksAbu: { fontSize: 13, color: '#64748b', margin: '2px 0 0' },
  divider: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  dividerDashed: { marginTop: 16, paddingTop: 16, borderTop: '1px dashed #e2e8f0' },
  totalBox: {
    marginTop: 16,
    borderRadius: 12,
    background: '#eef2ff',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBox: (warna) => ({
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 13,
    marginTop: 12,
    background: warna.bg,
    color: warna.text,
  }),
  footer: {
    padding: '14px 20px',
    borderTop: '1px solid #f1f5f9',
    textAlign: 'center',
    background: '#fafbfc',
  },
}

const WARNA_STATUS = {
  lunas: { bg: '#ecfdf5', text: '#047857' },
  terlambat: { bg: '#fef2f2', text: '#b91c1c' },
  belum: { bg: '#fffbeb', text: '#b45309' },
}

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
  const warnaStatus = lunas ? WARNA_STATUS.lunas : terlambat ? WARNA_STATUS.terlambat : WARNA_STATUS.belum
  const warnaStempel = lunas ? '#10b981' : '#ef4444'

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

      {/* Kartu invoice — ini yang di-render jadi gambar/PDF. Semua inline style. */}
      <div ref={invoiceRef} style={s.card}>
        <div style={s.header}>
          <span style={s.headerBadge}>
            <IconWifi className="w-5 h-5" />
          </span>
          <div>
            <p style={{ fontWeight: 700, lineHeight: 1.2, margin: 0 }}>Manajemen WiFi</p>
            <p style={{ fontSize: 12, color: '#e0e7ff', lineHeight: 1.2, margin: 0 }}>RT/RW Net</p>
          </div>
        </div>

        <div style={s.body}>
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              width: 70,
              height: 70,
              borderRadius: '50%',
              border: `2px solid ${warnaStempel}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-14deg)',
              opacity: 0.9,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                border: `1px dashed ${warnaStempel}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  textAlign: 'center',
                  lineHeight: '11px',
                  letterSpacing: 0.5,
                  whiteSpace: 'pre-line',
                  color: warnaStempel,
                  fontSize: lunas ? 11 : terlambat ? 9 : 8,
                }}
              >
                {lunas ? 'LUNAS' : terlambat ? 'TERLAMBAT' : 'BELUM\nLUNAS'}
              </span>
            </div>
          </div>

          <p style={s.labelKecil}>Nomor Invoice</p>
          <p style={s.nomorInvoice}>{nomorInvoice(tagihan)}</p>
          <p style={{ ...s.labelKecil, marginTop: 4 }}>Dicetak {formatTanggal(dicetak)}</p>

          <div style={s.divider}>
            <p style={s.sectionTitle}>Ditagihkan Kepada</p>
            <p style={s.namaBold}>{tagihan.pelanggan?.nama}</p>
            <p style={s.teksAbu}>{tagihan.pelanggan?.no_hp}</p>
            {tagihan.pelanggan?.alamat && <p style={s.teksAbu}>{tagihan.pelanggan.alamat}</p>}
          </div>

          <div style={s.dividerDashed}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                paddingBottom: 12,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <IconWifi className="w-4 h-4" />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Langganan {tagihan.pelanggan?.paket?.nama_paket}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '1px 0 0' }}>
                    {tagihan.pelanggan?.paket?.kecepatan}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <IconCalendar className="w-3 h-3" />
                    <span style={{ textTransform: 'capitalize' }}>{namaBulan(tagihan.periode)}</span>
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', flexShrink: 0 }}>
                {formatRupiah(tagihan.jumlah_tagihan)}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#94a3b8',
                paddingTop: 12,
              }}
            >
              <span>Tanggal Terbit</span>
              <span>{formatTanggal(tagihan.tanggal_terbit)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#94a3b8',
                marginTop: 4,
              }}
            >
              <span>Jatuh Tempo</span>
              <span style={terlambat ? { color: '#ef4444', fontWeight: 600 } : undefined}>
                {formatTanggal(tagihan.tanggal_jatuh_tempo)}
              </span>
            </div>
          </div>

          <div style={s.totalBox}>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>Total Tagihan</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#4338ca' }}>
              {formatRupiah(tagihan.jumlah_tagihan)}
            </span>
          </div>

          <div style={s.statusBox(warnaStatus)}>
            {lunas ? (
              <>
                <p style={{ fontWeight: 600, margin: 0 }}>Sudah Dibayar</p>
                {pembayaran && (
                  <p style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                    {formatTanggal(pembayaran.tanggal_bayar)} &middot; {pembayaran.metode ?? 'tunai'}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontWeight: 600, margin: 0 }}>
                {terlambat ? 'Pembayaran Terlambat' : 'Belum Dibayar'}
              </p>
            )}
          </div>
        </div>

        <div style={s.footer}>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Manajemen WiFi &middot; RT/RW Net</p>
          <p style={{ fontSize: 11, color: '#cbd5e1', margin: '2px 0 0' }}>
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
