-- Per-item privacy: replaces the single account-wide "reviews_public" toggle
-- (migration 0008) with a public/private choice made at save time for each
-- site review and each photo -- more granular than one all-or-nothing
-- account setting. profiles.reviews_public is left in place (unused) rather
-- than dropped, since this project doesn't drop columns in migrations.
alter table site_ratings add column if not exists is_public boolean not null default false;
alter table user_photos add column if not exists is_public boolean not null default false;

drop policy if exists "ratings_read_if_public" on site_ratings;
drop policy if exists "photos_read_if_public" on user_photos;
drop policy if exists "profiles_read_if_public" on profiles;
drop policy if exists "user_photos_read_if_public" on storage.objects;

create policy "ratings_read_if_public" on site_ratings for select
  using (is_public = true);

create policy "photos_read_if_public" on user_photos for select
  using (is_public = true);

-- Sightings (species finds) don't get their own privacy toggle -- adding a
-- public/private choice to a lightweight, frequently-tapped "mark as seen"
-- checkbox would be too much friction for that interaction. Instead, a
-- user's finds at a site are visible (and can appear in the activity feed)
-- only once they've made their own rating of that same site public -- the
-- one deliberate "make this visible" action that already exists for sites.
-- This also directly powers the region activity feed's rare+ find events.
create policy "sightings_read_if_site_rating_public" on sightings for select
  using (
    exists (
      select 1 from site_ratings sr
      where sr.user_id = sightings.user_id
      and sr.site_id = sightings.site_id
      and sr.is_public = true
    )
  );

-- A user's display name is visible if they have at least one public rating
-- or photo (computed from actual public rows, not a separate stored flag).
create policy "profiles_read_if_has_public_content" on profiles for select
  using (
    exists (select 1 from site_ratings sr where sr.user_id = profiles.user_id and sr.is_public = true)
    or exists (select 1 from user_photos up where up.user_id = profiles.user_id and up.is_public = true)
  );

-- Storage: a specific photo file is readable once its own DB row is public
-- (exact path match), replacing the old whole-folder / account-wide check.
create policy "user_photos_read_if_public" on storage.objects for select
  using (
    bucket_id = 'user-photos'
    and exists (select 1 from user_photos up where up.storage_path = name and up.is_public = true)
  );
