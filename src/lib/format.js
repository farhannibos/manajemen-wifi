export function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka ?? 0)
}

export function formatTanggal(tanggal) {
  if (!tanggal) return '-'
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function nomorWA(noHp) {
  const digit = noHp.replace(/\D/g, '')
  if (digit.startsWith('0')) return '62' + digit.slice(1)
  if (digit.startsWith('62')) return digit
  return '62' + digit
}

export function namaBulan(tanggal) {
  if (!tanggal) return '-'
  return new Date(tanggal).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}
