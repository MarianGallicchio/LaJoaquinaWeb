-- LA JOAQUINA PET SHOP — esquema Supabase
-- Pegar en el editor SQL de Supabase (Dashboard > SQL Editor > New query) y Run.
-- Se puede correr todas las veces que quieras (no duplica nada).
-- ROLES: dueña (user_metadata.role = 'admin') vs clientes (registro libre).
--   - catálogo y configuración: lectura pública, escritura solo dueña
--   - pedidos: cualquiera puede CREAR; cada cliente ve SOLO los suyos;
--     la dueña ve y edita todo
--   - alertas: cualquiera puede crear; cada uno ve las suyas; dueña todo
--   - distribuidores: solo dueña
-- DESPUÉS DEL SQL: dale rol admin a tu usuaria con (cambiá el email):
--   update auth.users set raw_user_meta_data =
--     coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--   where email = 'tu-email@ejemplo.com';
-- Los clientes se registran solos desde la tienda (NO apagues el registro).

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
drop policy if exists "orders own" on orders;
drop policy if exists "alerts insert" on stock_alerts;
drop policy if exists "alerts admin" on stock_alerts;
drop policy if exists "alerts own" on stock_alerts;
drop policy if exists "distributors admin" on distributors;

create policy "products read" on products
  for select using (true);

create policy "products write" on products
  for all using (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'))
  with check (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

create policy "settings read" on store_settings
  for select using (true);

create policy "settings write" on store_settings
  for all using (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'))
  with check (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

create policy "orders insert" on orders
  for insert with check (true);

create policy "orders admin" on orders
  for all using (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'))
  with check (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

create policy "orders own" on orders
  for select using (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    or ((data ->> 'customerEmail') = (auth.jwt() ->> 'email'))
  );

create policy "alerts insert" on stock_alerts
  for insert with check (true);

create policy "alerts admin" on stock_alerts
  for all using (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'))
  with check (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

create policy "alerts own" on stock_alerts
  for select using (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    or ((data ->> 'customerEmail') = (auth.jwt() ->> 'email'))
  );

create policy "distributors admin" on distributors
  for all using (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'))
  with check (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

-- Índices para ordenar pedidos y alertas por fecha
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists alerts_created_idx on stock_alerts (created_at desc);

-- Perfiles de clientes (direcciones, pago favorito, favoritos). Cada cliente
-- ve y edita SOLO su fila. La dueña no necesita leerlos para operar.
create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles own" on profiles;

create policy "profiles own" on profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
