import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '../supabase';

import { Find, SiteRating, UserPhoto } from './types';

const KEYS = {
  finds: 'reefdex.finds',
  photos: 'reefdex.photos',
  ratings: 'reefdex.ratings',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Best-effort mirror to Supabase; never blocks the local-first write. */
async function mirror(fn: () => Promise<unknown>) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await fn();
  } catch (err) {
    console.warn('ReefDex: Supabase mirror failed (kept locally)', err);
  }
}

// ---------- Finds ----------

export async function getFinds(): Promise<Find[]> {
  return readJson<Find[]>(KEYS.finds, []);
}

export async function isFound(speciesId: string): Promise<boolean> {
  const finds = await getFinds();
  return finds.some((f) => f.speciesId === speciesId);
}

export async function markFound(speciesId: string, siteId?: string, notes?: string): Promise<Find> {
  const finds = await getFinds();
  const existing = finds.find((f) => f.speciesId === speciesId);
  if (existing) return existing;

  const find: Find = { speciesId, siteId, notes, firstFoundAt: new Date().toISOString() };
  await writeJson(KEYS.finds, [...finds, find]);

  await mirror(async () => {
    const { data: userData } = await supabase!.auth.getUser();
    if (!userData.user) return;
    await supabase!.from('finds').insert({
      user_id: userData.user.id,
      species_id: speciesId,
      site_id: siteId ?? null,
      notes: notes ?? null,
    });
  });

  return find;
}

export async function unmarkFound(speciesId: string): Promise<void> {
  const finds = await getFinds();
  await writeJson(
    KEYS.finds,
    finds.filter((f) => f.speciesId !== speciesId),
  );
}

// ---------- User photos ----------

export async function getUserPhotos(speciesId?: string): Promise<UserPhoto[]> {
  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  return speciesId ? photos.filter((p) => p.speciesId === speciesId) : photos;
}

export async function addUserPhoto(speciesId: string, uri: string): Promise<UserPhoto> {
  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  const photo: UserPhoto = {
    id: `${speciesId}-${Date.now()}`,
    speciesId,
    uri,
    takenAt: new Date().toISOString(),
  };
  await writeJson(KEYS.photos, [...photos, photo]);

  await mirror(async () => {
    const { data: userData } = await supabase!.auth.getUser();
    if (!userData.user) return;
    const path = `${userData.user.id}/${photo.id}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase!.storage.from('user-photos').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (uploadError) throw uploadError;
    await supabase!.from('user_photos').insert({
      user_id: userData.user.id,
      species_id: speciesId,
      storage_path: path,
      taken_at: photo.takenAt,
    });
  });

  return photo;
}

// ---------- Site ratings ----------

export async function getSiteRatings(): Promise<SiteRating[]> {
  return readJson<SiteRating[]>(KEYS.ratings, []);
}

export async function getSiteRating(siteId: string): Promise<SiteRating | undefined> {
  const ratings = await getSiteRatings();
  return ratings.find((r) => r.siteId === siteId);
}

export async function rateSite(siteId: string, rating: number, notes?: string): Promise<SiteRating> {
  const ratings = await getSiteRatings();
  const updated: SiteRating = { siteId, rating, notes, updatedAt: new Date().toISOString() };
  await writeJson(KEYS.ratings, [...ratings.filter((r) => r.siteId !== siteId), updated]);

  await mirror(async () => {
    const { data: userData } = await supabase!.auth.getUser();
    if (!userData.user) return;
    await supabase!.from('site_ratings').upsert(
      {
        user_id: userData.user.id,
        site_id: siteId,
        rating,
        notes: notes ?? null,
        updated_at: updated.updatedAt,
      },
      { onConflict: 'user_id,site_id' },
    );
  });

  return updated;
}
