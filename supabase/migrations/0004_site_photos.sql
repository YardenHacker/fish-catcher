-- Dive-site hero photos: mirrors the species photo_* columns + storage
-- bucket pattern (see 0001_init.sql) so every site can show a real,
-- CC-licensed hero image instead of nothing.
alter table sites add column if not exists photo_url text;
alter table sites add column if not exists photo_credit text;
alter table sites add column if not exists photo_license text;
alter table sites add column if not exists photo_source_url text;

-- ---------- Storage bucket ----------
insert into storage.buckets (id, name, public) values ('site-photos', 'site-photos', true)
  on conflict (id) do nothing;

-- site-photos: public read
create policy "site_photos_read" on storage.objects for select
  using (bucket_id = 'site-photos');
