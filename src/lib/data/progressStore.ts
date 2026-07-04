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

/**
 * Personal data (finds, photos, ratings) lives on Supabase once a user is
 * signed in -- same "shared source of truth" model as species/sites -- and
 * falls back to on-device storage otherwise, so the app still works fully
 * offline / signed-out.
 */
async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function mapFindRow(row: any): Find {
  return {
    speciesId: row.species_id,
    siteId: row.site_id ?? undefined,
    notes: row.notes ?? undefined,
    firstFoundAt: row.first_found_at,
  };
}

function mapRatingRow(row: any): SiteRating {
  return {
    siteId: row.site_id,
    rating: row.rating,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
  };
}

// ---------- Finds ----------

export async function getFinds(): Promise<Find[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    const { data, error } = await supabase.from('finds').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(mapFindRow);
  }
  return readJson<Find[]>(KEYS.finds, []);
}

export async function isFound(speciesId: string): Promise<boolean> {
  const finds = await getFinds();
  return finds.some((f) => f.speciesId === speciesId);
}

export async function markFound(speciesId: string, siteId?: string, notes?: string): Promise<Find> {
  const userId = await getUserId();
  if (userId && supabase) {
    const { data: existing } = await supabase
      .from('finds')
      .select('*')
      .eq('user_id', userId)
      .eq('species_id', speciesId)
      .maybeSingle();
    if (existing) return mapFindRow(existing);

    const { data, error } = await supabase
      .from('finds')
      .insert({ user_id: userId, species_id: speciesId, site_id: siteId ?? null, notes: notes ?? null })
      .select()
      .single();
    if (error) throw error;
    return mapFindRow(data);
  }

  const finds = await readJson<Find[]>(KEYS.finds, []);
  const existing = finds.find((f) => f.speciesId === speciesId);
  if (existing) return existing;

  const find: Find = { speciesId, siteId, notes, firstFoundAt: new Date().toISOString() };
  await writeJson(KEYS.finds, [...finds, find]);
  return find;
}

export async function unmarkFound(speciesId: string): Promise<void> {
  const userId = await getUserId();
  if (userId && supabase) {
    const { error } = await supabase.from('finds').delete().eq('user_id', userId).eq('species_id', speciesId);
    if (error) throw error;
    return;
  }

  const finds = await readJson<Find[]>(KEYS.finds, []);
  await writeJson(
    KEYS.finds,
    finds.filter((f) => f.speciesId !== speciesId),
  );
}

// ---------- User photos ----------

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getUserPhotos(speciesId?: string): Promise<UserPhoto[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    let query = supabase.from('user_photos').select('*').eq('user_id', userId);
    if (speciesId) query = query.eq('species_id', speciesId);
    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const signed = await Promise.all(
      rows.map(async (row: any) => {
        const { data: signedUrl } = await supabase!.storage
          .from('user-photos')
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        return {
          id: row.id,
          speciesId: row.species_id,
          uri: signedUrl?.signedUrl ?? '',
          takenAt: row.taken_at ?? row.created_at,
        };
      }),
    );
    return signed.filter((p) => p.uri);
  }

  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  return speciesId ? photos.filter((p) => p.speciesId === speciesId) : photos;
}

export async function addUserPhoto(speciesId: string, uri: string): Promise<UserPhoto> {
  const userId = await getUserId();
  if (userId && supabase) {
    const path = `${userId}/${speciesId}-${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    const takenAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_photos')
      .insert({ user_id: userId, species_id: speciesId, storage_path: path, taken_at: takenAt })
      .select()
      .single();
    if (error) throw error;

    const { data: signedUrl } = await supabase.storage.from('user-photos').createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return { id: data.id, speciesId, uri: signedUrl?.signedUrl ?? uri, takenAt };
  }

  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  const photo: UserPhoto = { id: `${speciesId}-${Date.now()}`, speciesId, uri, takenAt: new Date().toISOString() };
  await writeJson(KEYS.photos, [...photos, photo]);
  return photo;
}

// ---------- Site ratings ----------

export async function getSiteRatings(): Promise<SiteRating[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    const { data, error } = await supabase.from('site_ratings').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(mapRatingRow);
  }
  return readJson<SiteRating[]>(KEYS.ratings, []);
}

export async function getSiteRating(siteId: string): Promise<SiteRating | undefined> {
  const ratings = await getSiteRatings();
  return ratings.find((r) => r.siteId === siteId);
}

export async function rateSite(siteId: string, rating: number, notes?: string): Promise<SiteRating> {
  const userId = await getUserId();
  const updatedAt = new Date().toISOString();

  if (userId && supabase) {
    const { data, error } = await supabase
      .from('site_ratings')
      .upsert(
        { user_id: userId, site_id: siteId, rating, notes: notes ?? null, updated_at: updatedAt },
        { onConflict: 'user_id,site_id' },
      )
      .select()
      .single();
    if (error) throw error;
    return mapRatingRow(data);
  }

  const ratings = await readJson<SiteRating[]>(KEYS.ratings, []);
  const updated: SiteRating = { siteId, rating, notes, updatedAt };
  await writeJson(KEYS.ratings, [...ratings.filter((r) => r.siteId !== siteId), updated]);
  return updated;
}
