-- Multi-region support: dive sites get an optional curated "pro tip" callout,
-- and user_photos (previously region-less) get a region reference so a photo
-- uploaded without a specific dive site (species only) still carries enough
-- location context to be scoped to the region it was logged in.
alter table sites add column if not exists pro_tip text;
alter table user_photos add column if not exists region_id uuid references regions(id);

-- Backfill: every user_photos row that exists today was logged before regions
-- existed in the app, i.e. against Sharm el Sheikh (the only region so far).
-- Stamp it explicitly rather than leaving region_id null, or region-scoped
-- queries would show it everywhere (null never matches an .eq filter) or
-- nowhere once region filtering ships.
update user_photos set region_id = (select id from regions where slug = 'sharm-el-sheikh') where region_id is null;
