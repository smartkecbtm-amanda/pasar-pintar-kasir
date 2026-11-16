-- Pasar Pintar Kasir: skema inti. Semua tulis data operasional lewat RPC (lihat migrasi 2).
create extension if not exists pgcrypto with schema extensions;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index stores_owner_idx on public.stores(owner_id);

create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'device')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_members_user_idx on public.store_members(user_id);

create sequence public.sync_seq;

-- Data toko tersinkron: satu baris per entitas (products, sales, stock_moves, dst.).
create table public.sync_entities (
  store_id uuid not null references public.stores(id) on delete cascade,
  entity text not null,
  entity_id text not null,
  data jsonb,
  deleted boolean not null default false,
  ts bigint not null,
  seq bigint not null default nextval('public.sync_seq'),
  primary key (store_id, entity, entity_id)
);
create index sync_entities_pull_idx on public.sync_entities(store_id, seq);
create index sync_entities_entity_idx on public.sync_entities(store_id, entity) where not deleted;

-- Idempotensi: satu peristiwa dari perangkat hanya diproses sekali.
create table public.sync_events (
  id text primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  received_at timestamptz not null default now()
);
create index sync_events_store_idx on public.sync_events(store_id, received_at);

-- PIN pegawai: hanya hash bcrypt, tidak pernah dikirim ke klien.
create table public.employee_pins (
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id text not null,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  primary key (store_id, employee_id)
);

-- Rantai hash jejak audit (anti-ubah).
create table public.audit_chain (
  store_id uuid not null references public.stores(id) on delete cascade,
  entity_id text not null,
  seq bigint not null,
  prev_hash text not null,
  hash text not null,
  primary key (store_id, entity_id)
);
create index audit_chain_seq_idx on public.audit_chain(store_id, seq);

-- Surat jalan antar-cabang (lintas toko, pemilik sama).
create table public.transfers (
  id text primary key,
  from_store uuid not null references public.stores(id),
  to_store uuid not null references public.stores(id),
  status text not null default 'dikirim' check (status in ('dikirim', 'diterima', 'dibatalkan')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_store <> to_store)
);
create index transfers_from_idx on public.transfers(from_store);
create index transfers_to_idx on public.transfers(to_store);

-- QRIS dinamis.
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  provider text not null,
  order_id text not null unique,
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  qr_string text,
  qr_url text,
  expires_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payment_intents_store_idx on public.payment_intents(store_id, created_at desc);

-- PPOB (pulsa, data, token PLN, e-wallet, transfer).
create table public.ppob_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  provider text not null,
  ref_id text not null unique,
  kind text not null,
  sku text not null,
  target text not null,
  price numeric(14, 2),
  status text not null default 'pending' check (status in ('pending', 'sukses', 'gagal')),
  sn text,
  message text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ppob_orders_store_idx on public.ppob_orders(store_id, created_at desc);
