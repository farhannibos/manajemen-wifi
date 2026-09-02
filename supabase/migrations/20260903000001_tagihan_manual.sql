-- RPC untuk tombol "Buat Tagihan Bulan Ini" di halaman detail pelanggan.
-- Dipakai kalau paman mau langsung generate tagihan bulan berjalan untuk
-- pelanggan tertentu, tanpa nunggu jadwal cron (misal: pelanggan baru
-- daftar dan butuh tagihan pertama langsung, bukan bulan depan).
create or replace function buat_tagihan_manual(p_pelanggan_id uuid)
returns tagihan as $$
declare
  v_harga numeric(12,2);
  v_periode date := date_trunc('month', current_date)::date;
  v_tagihan tagihan;
begin
  select pk.harga_bulanan into v_harga
  from pelanggan p
  join paket pk on pk.id = p.paket_id
  where p.id = p_pelanggan_id;

  if v_harga is null then
    raise exception 'Pelanggan tidak ditemukan';
  end if;

  insert into tagihan (pelanggan_id, periode, jumlah_tagihan, tanggal_terbit, tanggal_jatuh_tempo)
  values (p_pelanggan_id, v_periode, v_harga, current_date, current_date + interval '5 days')
  on conflict (pelanggan_id, periode) do nothing
  returning * into v_tagihan;

  if v_tagihan.id is null then
    raise exception 'Tagihan bulan ini untuk pelanggan tersebut sudah ada';
  end if;

  return v_tagihan;
end;
$$ language plpgsql security definer;
