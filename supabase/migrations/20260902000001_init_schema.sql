-- Skema awal: RT/RW Net billing & manajemen pelanggan

create extension if not exists pgcrypto;

-- 1. PAKET INTERNET
create table paket (
  id uuid primary key default gen_random_uuid(),
  nama_paket text not null,
  kecepatan text not null,
  harga_bulanan numeric(12,2) not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. PELANGGAN
create type status_pelanggan as enum ('aktif', 'nonaktif', 'isolir');

create table pelanggan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  no_hp text not null,
  alamat text,
  paket_id uuid not null references paket(id),
  tanggal_mulai_langganan date not null,
  status status_pelanggan not null default 'aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TAGIHAN
create type status_tagihan as enum ('belum_lunas', 'lunas');

create table tagihan (
  id uuid primary key default gen_random_uuid(),
  pelanggan_id uuid not null references pelanggan(id),
  periode date not null,
  jumlah_tagihan numeric(12,2) not null,
  tanggal_terbit date not null,
  tanggal_jatuh_tempo date not null,
  status status_tagihan not null default 'belum_lunas',
  notifikasi_wa_terkirim boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pelanggan_id, periode)
);

-- 4. PEMBAYARAN
create table pembayaran (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references tagihan(id),
  tanggal_bayar timestamptz not null default now(),
  jumlah_dibayar numeric(12,2) not null,
  metode text,
  catatan text,
  created_at timestamptz not null default now()
);

-- 5. RIWAYAT STATUS PELANGGAN (audit trail isolir/buka akses)
create table riwayat_status_pelanggan (
  id uuid primary key default gen_random_uuid(),
  pelanggan_id uuid not null references pelanggan(id),
  status_lama status_pelanggan not null,
  status_baru status_pelanggan not null,
  waktu timestamptz not null default now(),
  catatan text,
  created_at timestamptz not null default now()
);

-- indexes untuk query yang sering dipakai
create index idx_pelanggan_paket_id on pelanggan(paket_id);
create index idx_tagihan_pelanggan_id on tagihan(pelanggan_id);
create index idx_tagihan_status on tagihan(status);
create index idx_tagihan_jatuh_tempo on tagihan(tanggal_jatuh_tempo);
create index idx_pembayaran_tagihan_id on pembayaran(tagihan_id);
create index idx_riwayat_pelanggan_id on riwayat_status_pelanggan(pelanggan_id);

-- trigger sederhana buat updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_paket_updated_at before update on paket
  for each row execute function set_updated_at();
create trigger trg_pelanggan_updated_at before update on pelanggan
  for each row execute function set_updated_at();
create trigger trg_tagihan_updated_at before update on tagihan
  for each row execute function set_updated_at();

-- RLS: hanya user yang sudah login (paman) yang boleh akses
alter table paket enable row level security;
alter table pelanggan enable row level security;
alter table tagihan enable row level security;
alter table pembayaran enable row level security;
alter table riwayat_status_pelanggan enable row level security;

create policy "authenticated_full_access" on paket
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on pelanggan
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on tagihan
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on pembayaran
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on riwayat_status_pelanggan
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
