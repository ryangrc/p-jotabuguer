create extension if not exists "pgcrypto";

do $$
begin
  create type user_role as enum ('admin', 'operator');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type stock_unit as enum ('un', 'g', 'kg', 'ml', 'l');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type stock_movement_type as enum ('in', 'out', 'adjustment');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type order_status as enum (
    'awaiting_acceptance',
    'in_production',
    'ready',
    'dispatching',
    'payment_confirmed',
    'canceled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type order_destination as enum ('delivery', 'table', 'pickup');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type table_status as enum ('available', 'occupied', 'reserved', 'closed');
exception when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role user_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  menu_name text,
  category text,
  description text,
  image_url text,
  price numeric(12, 2) not null default 0,
  menu_active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit stock_unit not null default 'un',
  stock numeric(14, 3) not null default 0,
  min_stock numeric(14, 3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_stock_non_negative check (stock >= 0),
  constraint ingredients_min_stock_non_negative check (min_stock >= 0)
);

create table if not exists product_recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric(14, 3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, ingredient_id),
  constraint recipe_quantity_positive check (quantity > 0)
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric(14, 3) not null,
  total_cost numeric(12, 2) not null default 0,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchases_quantity_positive check (quantity > 0),
  constraint purchases_total_cost_non_negative check (total_cost >= 0)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  total numeric(12, 2) not null,
  cmv_total numeric(12, 2),
  gross_profit numeric(12, 2),
  source text not null default 'manual',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_quantity_positive check (quantity > 0)
);

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  label text,
  status table_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  destination order_destination not null default 'delivery',
  table_id uuid references restaurant_tables(id) on delete set null,
  note text,
  status order_status not null default 'awaiting_acceptance',
  total numeric(12, 2) not null default 0,
  created_by uuid references users(id) on delete set null,
  accepted_at timestamptz,
  ready_at timestamptz,
  dispatched_at timestamptz,
  paid_at timestamptz,
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  type stock_movement_type not null,
  quantity numeric(14, 3) not null,
  source text not null,
  source_id uuid,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_quantity_positive check (quantity > 0)
);

create index if not exists idx_products_menu_active on products(menu_active);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_table_id on orders(table_id);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_recipe_product_id on product_recipe_items(product_id);
create index if not exists idx_stock_movements_ingredient_id on stock_movements(ingredient_id);
