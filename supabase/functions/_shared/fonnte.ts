// Modul terpisah untuk integrasi API gateway WhatsApp (Fonnte).
// Sengaja dipisah dari logic utama supaya gampang disambungkan nanti
// begitu API key Fonnte yang asli sudah ada.
//
// Cara pakai nanti:
// 1. Daftar di https://fonnte.com, dapatkan token device
// 2. Simpan sebagai secret: `supabase secrets set FONNTE_TOKEN=xxxxx`
// 3. Hapus mode simulasi di bawah (blok `if (!token)`)

export interface PesanWA {
  tujuan: string; // nomor HP format 62xxxxxxxxxx
  pesan: string;
}

export async function kirimPesanWA({ tujuan, pesan }: PesanWA): Promise<{ terkirim: boolean; detail: string }> {
  const token = Deno.env.get("FONNTE_TOKEN");

  if (!token) {
    // Mode simulasi: belum ada API key asli, jadi cuma dicatat di log.
    console.log(`[SIMULASI WA] ke ${tujuan}: ${pesan}`);
    return { terkirim: true, detail: "simulasi (belum ada FONNTE_TOKEN)" };
  }

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: tujuan, message: pesan }),
  });

  if (!res.ok) {
    const teks = await res.text();
    console.error(`Gagal kirim WA ke ${tujuan}: ${teks}`);
    return { terkirim: false, detail: teks };
  }

  return { terkirim: true, detail: "terkirim via Fonnte" };
}
