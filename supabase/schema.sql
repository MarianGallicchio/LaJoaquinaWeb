-- LA JOAQUINA PET SHOP — esquema Supabase v2
-- Pegar en SQL Editor > New query > Run. Reejecutable sin duplicar nada.
--
-- MODELO DE ACCESO (sin agujeros, sin depender de metadata editable):
--   - DUEÑA: el email fijo de abajo. Acceso total, haga lo que haga el resto.
--   - EMPLEADOS: tabla staff (los agrega la dueña desde el panel).
--     * admin   -> todo menos Equipo
--     * stock   -> solo Productos
--     * ventas  -> solo Ventas
--     Se crean su cuenta en la TIENDA con su email; la dueña les asigna el
--     puesto en Equipo por ese mismo email.
--   - CLIENTES: registro libre en la tienda; ven SOLO sus pedidos.
--   - Anónimos: leen catálogo/config y crean pedidos/alertas. Nada más.

-- ================= TABLAS =================
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

create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists staff (
  email text primary key,
  name text not null default '',
  role text not null default 'ventas' check (role in ('admin', 'stock', 'ventas')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products enable row level security;
alter table orders enable row level security;
alter table stock_alerts enable row level security;
alter table distributors enable row level security;
alter table store_settings enable row level security;
alter table profiles enable row level security;
alter table staff enable row level security;

-- ================= LIMPIEZA (requisito para re-correr) =================
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
drop policy if exists "profiles own" on profiles;
drop policy if exists "staff read" on staff;
drop policy if exists "staff write" on staff;

-- ================= POLÍTICAS =================
-- Catálogo y config: lectura pública, escritura dueña + admin/stock
create policy "products read" on products
  for select using (true);

create policy "products write" on products
  for all using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role in ('admin', 'stock')
    ))
  )
  with check (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role in ('admin', 'stock')
    ))
  );

create policy "settings read" on store_settings
  for select using (true);

create policy "settings write" on store_settings
  for all using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role = 'admin'
    ))
  )
  with check (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role = 'admin'
    ))
  );

-- Pedidos: crear (público), ver todos (dueña/admin/ventas), propio (cliente)
create policy "orders insert" on orders
  for insert with check (true);

create policy "orders admin" on orders
  for all using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role in ('admin', 'ventas')
    ))
  )
  with check (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role in ('admin', 'ventas')
    ))
  );

create policy "orders own" on orders
  for select using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
    ))
    or ((data ->> 'customerEmail') = (auth.jwt() ->> 'email'))
  );

-- Alertas: crear (público), gestionar (dueña/admin)
create policy "alerts insert" on stock_alerts
  for insert with check (true);

create policy "alerts admin" on stock_alerts
  for all using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role = 'admin'
    ))
  )
  with check (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role = 'admin'
    ))
  );

create policy "alerts own" on stock_alerts
  for select using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
    ))
    or ((data ->> 'customerEmail') = (auth.jwt() ->> 'email'))
  );

-- Distribuidores: dueña + admin
create policy "distributors admin" on distributors
  for all using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role = 'admin'
    ))
  )
  with check (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (exists (
      select 1 from staff
      where staff.email = (auth.jwt() ->> 'email')
        and staff.active = true
        and staff.role = 'admin'
    ))
  );

-- Perfiles de cliente: cada uno el suyo (la dueña no los necesita leer)
create policy "profiles own" on profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Empleados: la dueña todo; cada empleado lee su propia fila
create policy "staff read" on staff
  for select using (
    ((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com')
    or (staff.email = (auth.jwt() ->> 'email'))
  );

create policy "staff write" on staff
  for all using (((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com'))
  with check (((auth.jwt() ->> 'email') = 'marianoagusting1996@gmail.com'));

-- ================= ÍNDICES =================
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists alerts_created_idx on stock_alerts (created_at desc);
create index if not exists staff_active_idx on staff (active);
