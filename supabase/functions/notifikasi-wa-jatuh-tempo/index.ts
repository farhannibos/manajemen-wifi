// Edge Function: cek tagihan yang jatuh tempo 3 hari lagi dan belum lunas,
// lalu kirim notifikasi WA (lewat modul fonnte.ts) ke pelanggan bersangkutan.
// Dipicu terjadwal (pg_cron + pg_net) sekali sehari, atau bisa dipanggil manual untuk testing:
//   npx supabase functions serve notifikasi-wa-jatuh-tempo
//   curl -i http://127.0.0.1:54321/functions/v1/notifikasi-wa-jatuh-tempo

import { createClient } from "jsr:@supabase/supabase-js@2";
import { kirimPesanWA } from "../_shared/fonnte.ts";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tagihanJatuhTempo, error } = await supabase
    .from("tagihan")
    .select("id, jumlah_tagihan, tanggal_jatuh_tempo, pelanggan:pelanggan_id(nama, no_hp)")
    .eq("status", "belum_lunas")
    .eq("notifikasi_wa_terkirim", false)
    .eq("tanggal_jatuh_tempo", tanggalHPlus(3));

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const hasil = [];

  for (const t of tagihanJatuhTempo ?? []) {
    const pelanggan = Array.isArray(t.pelanggan) ? t.pelanggan[0] : t.pelanggan;
    const pesan =
      `Halo ${pelanggan.nama}, tagihan internet bulan ini sebesar ` +
      `Rp${Number(t.jumlah_tagihan).toLocaleString("id-ID")} jatuh tempo pada ${t.tanggal_jatuh_tempo}. ` +
      `Mohon segera dilunasi. Terima kasih.`;

    const kirim = await kirimPesanWA({ tujuan: pelanggan.no_hp, pesan });

    if (kirim.terkirim) {
      await supabase.from("tagihan").update({ notifikasi_wa_terkirim: true }).eq("id", t.id);
    }

    hasil.push({ tagihan_id: t.id, pelanggan: pelanggan.nama, ...kirim });
  }

  return new Response(JSON.stringify({ jumlah_diproses: hasil.length, hasil }), {
    headers: { "Content-Type": "application/json" },
  });
});

function tanggalHPlus(hari: number): string {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  return d.toISOString().slice(0, 10);
}
