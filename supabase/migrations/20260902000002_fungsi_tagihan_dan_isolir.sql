create extension if not exists pg_cron;

-- Fungsi generate tagihan bulanan otomatis (dijalankan lewat pg_cron harian)
-- Menagih pelanggan yang statusnya aktif ATAU isolir (yang nonaktif tidak ditagih),
-- pada hari yang sesuai dengan tanggal_mulai_langganan tiap pelanggan.
-- Kalau bulan berjalan lebih pendek dari tanggal langganan (misal tgl 31 di bulan Februari),
-- tagihan digeser ke hari terakhir bulan itu.
create or replace function generate_tagihan_bulanan()
returns void as $$
declare
  r record;
  v_periode date := date_trunc('month', current_date)::date;
  v_akhir_bulan date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  for r in
    select p.id, pk.harga_bulanan
    from pelanggan p
    join paket pk on pk.id = p.paket_id
    where p.status in ('aktif', 'isolir')
      and (
        extract(day from p.tanggal_mulai_langganan) = extract(day from current_date)
        or (
          current_date = v_akhir_bulan
          and extract(day from p.tanggal_mulai_langganan) > extract(day from v_akhir_bulan)
        )
      )
  loop
    insert into tagihan (pelanggan_id, periode, jumlah_tagihan, tanggal_terbit, tanggal_jatuh_tempo)
    values (r.id, v_periode, r.harga_bulanan, current_date, current_date + interval '5 days')
    on conflict (pelanggan_id, periode) do nothing;
  end loop;
end;
$$ language plpgsql security definer;

-- Jadwalkan tiap hari jam 01:00. Fungsi aman dijalankan berkali-kali
-- karena constraint unique(pelanggan_id, periode) + on conflict do nothing.
select cron.schedule(
  'generate-tagihan-bulanan',
  '0 1 * * *',
  $$select generate_tagihan_bulanan();$$
);

-- RPC untuk tombol "isolir" / "buka akses" di halaman detail pelanggan.
-- Mengubah status + mencatat riwayat dalam satu transaksi (atomik).
-- CATATAN: ini HANYA update database, TIDAK menyambung ke Mikrotik.
-- Koneksi ke Mikrotik beneran menyusul belakangan di sisi aplikasi (lihat stub di frontend).
create or replace function ubah_status_pelanggan(
  p_pelanggan_id uuid,
  p_status_baru status_pelanggan,
  p_catatan text default null
)
returns pelanggan as $$
declare
  v_status_lama status_pelanggan;
  v_pelanggan pelanggan;
begin
  select status into v_status_lama from pelanggan where id = p_pelanggan_id for update;

  if v_status_lama is null then
    raise exception 'Pelanggan tidak ditemukan';
  end if;

  update pelanggan
  set status = p_status_baru
  where id = p_pelanggan_id
  returning * into v_pelanggan;

  insert into riwayat_status_pelanggan (pelanggan_id, status_lama, status_baru, catatan)
  values (p_pelanggan_id, v_status_lama, p_status_baru, p_catatan);

  return v_pelanggan;
end;
$$ language plpgsql security definer;

-- RPC untuk tombol "tandai lunas" di halaman rekap tagihan.
create or replace function tandai_lunas(p_tagihan_id uuid)
returns tagihan as $$
declare
  v_tagihan tagihan;
begin
  select * into v_tagihan from tagihan where id = p_tagihan_id for update;

  if v_tagihan.id is null then
    raise exception 'Tagihan tidak ditemukan';
  end if;

  insert into pembayaran (tagihan_id, jumlah_dibayar, metode)
  values (p_tagihan_id, v_tagihan.jumlah_tagihan, 'tunai');

  update tagihan
  set status = 'lunas'
  where id = p_tagihan_id
  returning * into v_tagihan;

  return v_tagihan;
end;
$$ language plpgsql security definer;
