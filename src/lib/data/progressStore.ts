import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '../supabase';

import { Find, Sighting, SiteRating, UserPhoto } from './types';

const KEYS = {
  sightings: 'reefdex.sightings',
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
 * Personal data (sightings, photos, ratings) lives on Supabase once a user is
 * signed in -- same "shared source of truth" model as species/sites -- and
 * falls back to on-device storage otherwise, so the app still works fully
 * offline / signed-out.
 */
async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function mapRatingRow(row: any): SiteRating {
  return {
    siteId: row.site_id,
    rating: row.rating,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
  };
}

// ---------- Sightings (per species, per site, with a count) ----------
// Presence of a row = seen there; a species' total across all its rows
// drives the Dex lock/unlock and the Collection list/score.

interface LocalSighting extends Sighting {
  createdAt: string;
}

export async function getSightingsForSpecies(speciesId: string): Promise<Sighting[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    const { data, error } = await supabase
      .from('sightings')
      .select('species_id, site_id, count, updated_at')
      .eq('user_id', userId)
      .eq('species_id', speciesId);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      speciesId: row.species_id,
      siteId: row.site_id,
      count: row.count,
      updatedAt: row.updated_at,
    }));
  }

  const all = await readJson<LocalSighting[]>(KEYS.sightings, []);
  return all
    .filter((s) => s.speciesId === speciesId)
    .map(({ speciesId: sId, siteId, count, updatedAt }) => ({ speciesId: sId, siteId, count, updatedAt }));
}

export async function setSightingCount(speciesId: string, siteId: string, count: number): Promise<void> {
  const userId = await getUserId();
  const now = new Date().toISOString();

  if (userId && supabase) {
    if (count <= 0) {
      const { error } = await supabase
        .from('sightings')
        .delete()
        .eq('user_id', userId)
        .eq('species_id', speciesId)
        .eq('site_id', siteId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from('sightings')
      .upsert(
        { user_id: userId, species_id: speciesId, site_id: siteId, count, updated_at: now },
        { onConflict: 'user_id,species_id,site_id' },
      );
    if (error) throw error;
    return;
  }

  const all = await readJson<LocalSighting[]>(KEYS.sightings, []);
  const idx = all.findIndex((s) => s.speciesId === speciesId && s.siteId === siteId);
  if (count <= 0) {
    if (idx >= 0) {
      all.splice(idx, 1);
      await writeJson(KEYS.sightings, all);
    }
    return;
  }
  if (idx >= 0) {
    all[idx] = { ...all[idx], count, updatedAt: now };
  } else {
    all.push({ speciesId, siteId, count, createdAt: now, updatedAt: now });
  }
  await writeJson(KEYS.sightings, all);
}

export async function getFinds(): Promise<Find[]> {
  const userId = await getUserId();
  const bySpecies = new Map<string, { total: number; firstFoundAt: string }>();

  function accumulate(speciesId: string, count: number, firstSeenCandidate: string) {
    const existing = bySpecies.get(speciesId);
    if (existing) {
      existing.total += count;
      if (firstSeenCandidate < existing.firstFoundAt) existing.firstFoundAt = firstSeenCandidate;
    } else {
      bySpecies.set(speciesId, { total: count, firstFoundAt: firstSeenCandidate });
    }
  }

  if (userId && supabase) {
    const { data, error } = await supabase.from('sightings').select('species_id, count, created_at').eq('user_id', userId);
    if (error) throw error;
    for (const row of data ?? []) accumulate(row.species_id, row.count, row.created_at);
  } else {
    const all = await readJson<LocalSighting[]>(KEYS.sightings, []);
    for (const row of all) accumulate(row.speciesId, row.count, row.createdAt);
  }

  return Array.from(bySpecies.entries()).map(([speciesId, v]) => ({
    speciesId,
    totalCount: v.total,
    firstFoundAt: v.firstFoundAt,
  }));
}

// ---------- User photos (species or dive site) ----------

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getUserPhotos(target: { speciesId?: string; siteId?: string }): Promise<UserPhoto[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    let query = supabase.from('user_photos').select('*').eq('user_id', userId);
    if (target.speciesId) query = query.eq('species_id', target.speciesId);
    if (target.siteId) query = query.eq('site_id', target.siteId);
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
          speciesId: row.species_id ?? undefined,
          siteId: row.site_id ?? undefined,
          uri: signedUrl?.signedUrl ?? '',
          takenAt: row.taken_at ?? row.created_at,
        };
      }),
    );
    return signed.filter((p) => p.uri);
  }

  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  return photos.filter((p) => {
    if (target.speciesId && p.speciesId !== target.speciesId) return false;
    if (target.siteId && p.siteId !== target.siteId) return false;
    return true;
  });
}

export async function addUserPhoto(target: { speciesId?: string; siteId?: string; uri: string }): Promise<UserPhoto> {
  const { speciesId, siteId, uri } = target;
  const userId = await getUserId();

  if (userId && supabase) {
    const path = `${userId}/${speciesId ?? `site-${siteId}`}-${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    const takenAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_photos')
      .insert({ user_id: userId, species_id: speciesId ?? null, site_id: siteId ?? null, storage_path: path, taken_at: takenAt })
      .select()
      .single();
    if (error) throw error;

    const { data: signedUrl } = await supabase.storage.from('user-photos').createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return { id: data.id, speciesId, siteId, uri: signedUrl?.signedUrl ?? uri, takenAt };
  }

  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  const photo: UserPhoto = {
    id: `${speciesId ?? siteId}-${Date.now()}`,
    speciesId,
    siteId,
    uri,
    takenAt: new Date().toISOString(),
  };
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
