-- Distinguish photos from videos in user_photos so the app can render each
-- correctly (Image vs video player) and upload with the right content type.
-- Existing rows are all photos (video upload didn't exist before this),
-- hence the 'photo' default.
alter table user_photos add column if not exists media_type text not null default 'photo';
