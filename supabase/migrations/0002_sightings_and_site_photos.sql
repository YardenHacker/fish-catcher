-- Sightings: per (user, species, site) tally, replacing the old single
-- found/not-found flag with "which sites did I see this at, and how many".
-- Presence of a row = seen; totalCount for a species = sum across its rows.
create table if not exists sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id uuid not null references species(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  count int not null default 1 check (count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, species_id, site_id)
);

alter table sightings enable row level security;
create policy "sightings_own_all" on sightings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dive-site photos reuse the existing user_photos table: a photo is either
-- for a species (species_id set) or a dive site (site_id set).
alter table user_photos add column if not exists site_id uuid references sites(id) on delete set null;
alter table user_photos add constraint user_photos_species_or_site
  check (species_id is not null or site_id is not null);
