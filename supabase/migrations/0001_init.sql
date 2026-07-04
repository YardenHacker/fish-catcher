-- Fish Catcher schema: shared content (public read) + per-user data (RLS)
create extension if not exists "pgcrypto";

-- ---------- Shared content ----------
create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references regions(id) on delete cascade,
  slug text not null unique,
  name text not null,
  area text,
  type text,
  lat double precision,
  lng double precision,
  depth_min int,
  depth_max int,
  difficulty text,
  description text,
  hero_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  common_name text not null,
  scientific_name text not null,
  "group" text not null,
  description text,
  habitat text,
  max_size_cm int,
  depth_range text,
  iucn_status text,
  rarity_score int,          -- 1..100
  rarity_tier text,          -- Common | Uncommon | Rare | Epic | Legendary
  photo_url text,
  photo_credit text,
  photo_license text,
  photo_source_url text,
  created_at timestamptz not null default now()
);

create table if not exists site_species (
  site_id uuid not null references sites(id) on delete cascade,
  species_id uuid not null references species(id) on delete cascade,
  frequency text,            -- abundant | common | uncommon | rare | seasonal-rare | very-rare
  primary key (site_id, species_id)
);

-- ---------- Per-user ----------
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists finds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id uuid not null references species(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  notes text,
  first_found_at timestamptz not null default now(),
  unique (user_id, species_id)
);

create table if not exists user_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id uuid references species(id) on delete set null,
  find_id uuid references finds(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists site_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, site_id)
);

-- ---------- RLS ----------
alter table regions        enable row level security;
alter table sites          enable row level security;
alter table species        enable row level security;
alter table site_species   enable row level security;
alter table profiles       enable row level security;
alter table finds          enable row level security;
alter table user_photos    enable row level security;
alter table site_ratings   enable row level security;

-- Shared content: readable by everyone (incl. anon)
create policy "content_read_regions"      on regions      for select using (true);
create policy "content_read_sites"        on sites        for select using (true);
create policy "content_read_species"      on species      for select using (true);
create policy "content_read_site_species" on site_species for select using (true);

-- Profiles: a user manages their own row
create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_upsert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id);

-- Finds / photos / ratings: full CRUD limited to the owner
create policy "finds_own_all"   on finds        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "photos_own_all"  on user_photos  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ratings_own_all" on site_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public) values ('species-photos', 'species-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('user-photos', 'user-photos', false)
  on conflict (id) do nothing;

-- species-photos: public read
create policy "species_photos_read" on storage.objects for select
  using (bucket_id = 'species-photos');

-- user-photos: owner-scoped (path prefixed with the user's uid)
create policy "user_photos_read_own" on storage.objects for select
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_photos_write_own" on storage.objects for insert
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_photos_delete_own" on storage.objects for delete
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
