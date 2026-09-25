-- Prime Hospitality CMS schema (run in Supabase SQL editor)
-- Photos: Cloudinary URLs for slideshow/compounds; Google Drive URLs for unit galleries.

create extension if not exists "pgcrypto";

create table if not exists compounds (
  id text primary key,
  name text not null,
  region text not null default '',
  destination_id text not null default '',
  unit_count integer not null default 0,
  image text not null default '',
  sort_order integer not null default 0,
  show_on_home boolean not null default true,
  published boolean not null default true,
  kwentra_project_id text not null default '',
  kwentra_destination_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists units (
  id text primary key,
  slug text not null unique,
  title text not null,
  compound_id text references compounds (id) on delete set null,
  compound text not null default '',
  region text not null default '',
  city text not null default '',
  property_type text not null default 'Apartment',
  bedrooms integer not null default 1,
  bathrooms integer not null default 1,
  area_sqm numeric not null default 0,
  max_guests integer not null default 2,
  price_per_night numeric not null default 0,
  currency text not null default 'EGP',
  featured boolean not null default false,
  available boolean not null default true,
  published boolean not null default true,
  amenities jsonb not null default '[]'::jsonb,
  facilities jsonb not null default '[]'::jsonb,
  description text not null default '',
  images jsonb not null default '[]'::jsonb,
  drive_folder_url text not null default '',
  kwentra_room_type_id text not null default '',
  home_order integer not null default 999,
  search_order integer not null default 0,
  average_rating numeric not null default 0,
  review_count integer not null default 0,
  reviews jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists units_published_idx on units (published);
create index if not exists units_featured_idx on units (featured);
create index if not exists units_search_order_idx on units (search_order);
create index if not exists units_home_order_idx on units (home_order);

create table if not exists slideshow_slides (
  id text primary key,
  image text not null,
  alt text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  id text primary key default 'default',
  meta_pixel_id text not null default '',
  facebook_pixel_id text not null default '',
  google_ads_id text not null default '',
  gtm_id text not null default '',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into site_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'requested',
  slug text not null,
  listing_id text,
  listing_title text,
  name text not null,
  email text not null,
  phone text,
  guests integer,
  check_in date,
  check_out date,
  notes text,
  price_per_night numeric,
  currency text default 'EGP',
  created_at timestamptz not null default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password text not null,
  created_at timestamptz not null default now()
);

-- Service role bypasses RLS; still enable RLS so anon keys cannot write.
alter table compounds enable row level security;
alter table units enable row level security;
alter table slideshow_slides enable row level security;
alter table site_settings enable row level security;
alter table bookings enable row level security;
alter table guests enable row level security;

-- Public read for published content (optional; server uses service role)
create policy "Public read compounds"
  on compounds for select
  using (published = true);

create policy "Public read units"
  on units for select
  using (published = true);

create policy "Public read slides"
  on slideshow_slides for select
  using (enabled = true);

create policy "Public read settings"
  on site_settings for select
  using (true);
