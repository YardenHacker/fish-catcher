-- Extra species context shown on the detail page: honest population/range
-- info (not fabricated precise counts -- most reef fish are never counted
-- globally) and, only where it's genuinely documented, a best season.
alter table species add column if not exists population_info text;
alter table species add column if not exists best_season text;
