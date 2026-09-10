-- LA JOAQUINA PET SHOP — esquema Supabase
-- Pegar en el editor SQL de Supabase (Dashboard > SQL Editor > New query) y Run.
-- Tablas documento (id + JSONB), igual que la nube local. RLS:
--   - catálogo y configuración: lectura pública, escritura solo dueña
--   - pedidos y alertas: cualquiera puede CREAR (checkout), solo la dueña ve/edita
--   - distribuidores: solo dueña
-- IMPORTANTE: en Authentication > Sign In / Sign ups, APAGAR "Allow new users
-- to sign up". Así la única cuenta posible es la de la dueña (la creás en
-- Authentication > Users > Add user).

create table if not exists products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  order_id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists stock_alerts (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists distributors (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists store_settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table products enable row level security;
alter table orders enable row level security;
alter table stock_alerts enable row level security;
alter table distributors enable row level security;
alter table store_settings enable row level security;

-- Limpieza si se corre dos veces (evita error de política duplicada)
drop policy if exists "products read" on products;
drop policy if exists "products write" on products;
drop policy if exists "settings read" on store_settings;
drop policy if exists "settings write" on store_settings;
drop policy if exists "orders insert" on orders;
drop policy if exists "orders admin" on orders;
drop policy if exists "alerts insert" on stock_alerts;
drop policy if exists "alerts admin" on stock_alerts;
drop policy if exists "distributors admin" on distributors;

create policy "products read" on products
  for select using (true);

create policy "products write" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "settings read" on store_settings
  for select using (true);

create policy "settings write" on store_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "orders insert" on orders
  for insert with check (true);

create policy "orders admin" on orders
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "alerts insert" on stock_alerts
  for insert with check (true);

create policy "alerts admin" on stock_alerts
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "distributors admin" on distributors
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Índices para ordenar pedidos y alertas por fecha
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists alerts_created_idx on stock_alerts (created_at desc);
