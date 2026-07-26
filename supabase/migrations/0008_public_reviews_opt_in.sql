-- Opt-in public reviews: a user can choose to make their site ratings,
-- notes, and uploaded photos visible to every other signed-in user.
-- Default OFF -- existing users didn't sign up expecting to be visible to
-- strangers, so this is an explicit choice made in Profile, not automatic.
alter table profiles add column if not exists reviews_public boolean not null default false;

-- Ratings: visible to everyone if the rating's own user has opted in, in
-- addition to the existing "always see your own" policy (ratings_own_all).
-- Multiple permissive policies for the same command are OR'd together, so
-- this only ever widens access, never narrows the existing owner-only rule.
create policy "ratings_read_if_public" on site_ratings for select
  using (exists (select 1 from profiles p where p.user_id = site_ratings.user_id and p.reviews_public = true));

-- Photos: same opt-in visibility, additive to the existing owner-only policy.
create policy "photos_read_if_public" on user_photos for select
  using (exists (select 1 from profiles p where p.user_id = user_photos.user_id and p.reviews_public = true));

-- Profiles: expose the display_name of opted-in users to everyone (so a
-- public review can show whose it is) without exposing every user's row.
create policy "profiles_read_if_public" on profiles for select
  using (reviews_public = true);

-- Storage: the user-photos bucket is private by folder-prefix (see
-- 0001_init.sql's user_photos_read_own policy, keyed on auth.uid()). Add a
-- read policy for opted-in users' folders so their public review photos are
-- actually viewable as files, not just referenced by a visible DB row.
create policy "user_photos_read_if_public" on storage.objects for select
  using (
    bucket_id = 'user-photos'
    and exists (
      select 1 from profiles p
      where p.user_id::text = (storage.foldername(name))[1]
      and p.reviews_public = true
    )
  );
