import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '../supabase';

import * as repo from './repository';
import { Find, MediaType, Sighting, SiteRating, UserPhoto } from './types';

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
// drives the Fish tab lock/unlock and the Collection list/score.

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

/** The flip side of getSightingsForSpecies: every species the user has personally logged at one site. */
export async function getSightingsForSite(siteId: string): Promise<Sighting[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    const { data, error } = await supabase
      .from('sightings')
      .select('species_id, site_id, count, updated_at')
      .eq('user_id', userId)
      .eq('site_id', siteId);
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
    .filter((s) => s.siteId === siteId)
    .map(({ speciesId, siteId: sId, count, updatedAt }) => ({ speciesId, siteId: sId, count, updatedAt }));
}

/**
 * Bulk "I saw this everywhere in this area" action: ensures every listed site
 * has at least count=1 for this species, without touching sites that already
 * have a (possibly higher) count recorded.
 */
export async function markAllSightingsForSites(speciesId: string, siteIds: string[]): Promise<void> {
  const userId = await getUserId();
  const now = new Date().toISOString();

  if (userId && supabase) {
    const { data: existing, error: existingError } = await supabase
      .from('sightings')
      .select('site_id')
      .eq('user_id', userId)
      .eq('species_id', speciesId)
      .in('site_id', siteIds);
    if (existingError) throw existingError;

    const already = new Set((existing ?? []).map((row: any) => row.site_id));
    const toInsert = siteIds
      .filter((siteId) => !already.has(siteId))
      .map((siteId) => ({ user_id: userId, species_id: speciesId, site_id: siteId, count: 1, updated_at: now }));
    if (toInsert.length === 0) return;

    const { error } = await supabase.from('sightings').insert(toInsert);
    if (error) throw error;
    return;
  }

  const all = await readJson<LocalSighting[]>(KEYS.sightings, []);
  const already = new Set(all.filter((s) => s.speciesId === speciesId).map((s) => s.siteId));
  const additions: LocalSighting[] = siteIds
    .filter((siteId) => !already.has(siteId))
    .map((siteId) => ({ speciesId, siteId, count: 1, createdAt: now, updatedAt: now }));
  if (additions.length === 0) return;
  await writeJson(KEYS.sightings, [...all, ...additions]);
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

/**
 * Resolves the id every "belongs to no explicit region yet" record should be
 * treated as -- the same default a fresh RegionProvider picks (prefer Sharm el
 * Sheikh, else the first region alphabetically). Used both for legacy local
 * photos (never stamped with a regionId) and can't otherwise be reasoned about.
 */
async function resolveDefaultRegionId(): Promise<string | undefined> {
  const regions = await repo.getRegions();
  return repo.pickDefaultRegion(regions)?.id;
}

/**
 * Aggregate finds, GLOBAL across every region: a species counts as found the
 * moment it's been logged at any site, anywhere. This is what makes the Fish
 * tab/Collection's "found" state a single, unified collection instead of one
 * isolated per region -- only site-scoped things (sightings themselves,
 * photos) stay tied to where they were actually logged.
 */
export async function getFinds(): Promise<Find[]> {
  const userId = await getUserId();
  const bySpecies = new Map<string, { total: number; firstFoundAt: string; firstFoundSiteId: string; siteIds: Set<string> }>();

  function accumulate(speciesId: string, siteId: string, count: number, firstSeenCandidate: string) {
    const existing = bySpecies.get(speciesId);
    if (existing) {
      existing.total += count;
      existing.siteIds.add(siteId);
      if (firstSeenCandidate < existing.firstFoundAt) {
        existing.firstFoundAt = firstSeenCandidate;
        existing.firstFoundSiteId = siteId;
      }
    } else {
      bySpecies.set(speciesId, {
        total: count,
        firstFoundAt: firstSeenCandidate,
        firstFoundSiteId: siteId,
        siteIds: new Set([siteId]),
      });
    }
  }

  if (userId && supabase) {
    const { data, error } = await supabase
      .from('sightings')
      .select('species_id, site_id, count, created_at')
      .eq('user_id', userId);
    if (error) throw error;
    for (const row of data ?? []) accumulate(row.species_id, row.site_id, row.count, row.created_at);
  } else {
    const all = await readJson<LocalSighting[]>(KEYS.sightings, []);
    for (const row of all) accumulate(row.speciesId, row.siteId, row.count, row.createdAt);
  }

  return Array.from(bySpecies.entries()).map(([speciesId, v]) => ({
    speciesId,
    totalCount: v.total,
    firstFoundAt: v.firstFoundAt,
    firstFoundSiteId: v.firstFoundSiteId,
    siteIds: Array.from(v.siteIds),
  }));
}

// ---------- User photos (species or dive site) ----------

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Common mime types the pickers/cameras hand back -> file extension.
// Used only for the storage object's file name; the `contentType` set on
// upload (below) is what actually determines how it's served/decoded.
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
};

function deriveExtension(mediaType: MediaType, mimeType?: string | null, fileName?: string | null): string {
  if (mimeType && MIME_EXTENSION_MAP[mimeType]) return MIME_EXTENSION_MAP[mimeType];
  if (fileName) {
    const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
    if (match) return match[1].toLowerCase();
  }
  if (mimeType) {
    const subtype = mimeType.split('/')[1]?.split(';')[0];
    if (subtype) return subtype.toLowerCase();
  }
  return mediaType === 'video' ? 'mp4' : 'jpg';
}

function resolveContentType(mediaType: MediaType, mimeType?: string | null): string {
  if (mimeType) return mimeType;
  return mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
}

/**
 * Every uploaded photo/video is stamped with the region it was logged in
 * (see migration 0006) and this always filters by it -- including photos
 * uploaded with no site (species only), which previously had zero location
 * info. This is what keeps "mark a fish and upload a photo while in Eilat"
 * from ever showing up under Sharm, and vice versa.
 */
export async function getUserPhotos(target: { speciesId?: string; siteId?: string }, regionId: string): Promise<UserPhoto[]> {
  const userId = await getUserId();
  if (userId && supabase) {
    let query = supabase.from('user_photos').select('*').eq('user_id', userId).eq('region_id', regionId);
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
          mediaType: (row.media_type as MediaType | null) ?? 'photo',
          storagePath: row.storage_path,
          takenAt: row.taken_at ?? row.created_at,
          regionId: row.region_id ?? undefined,
        };
      }),
    );
    return signed.filter((p) => p.uri);
  }

  // Offline/local fallback: pre-existing photos saved before regions existed
  // never got a regionId stamped on them. Treat those as belonging to
  // whichever region is currently the default (same rule the region switcher
  // itself falls back to), rather than dropping them or showing them everywhere.
  const [photos, defaultRegionId] = await Promise.all([readJson<UserPhoto[]>(KEYS.photos, []), resolveDefaultRegionId()]);
  return photos
    .filter((p) => {
      if (target.speciesId && p.speciesId !== target.speciesId) return false;
      if (target.siteId && p.siteId !== target.siteId) return false;
      const effectiveRegionId = p.regionId ?? defaultRegionId;
      if (effectiveRegionId !== regionId) return false;
      return true;
    })
    .map((p) => ({ ...p, mediaType: p.mediaType ?? 'photo' }));
}

export async function addUserPhoto(target: {
  speciesId?: string;
  siteId?: string;
  uri: string;
  mediaType: MediaType;
  mimeType?: string | null;
  fileName?: string | null;
  regionId: string;
}): Promise<UserPhoto> {
  const { speciesId, siteId, uri, mediaType, mimeType, fileName, regionId } = target;
  const userId = await getUserId();
  const contentType = resolveContentType(mediaType, mimeType);

  if (userId && supabase) {
    const extension = deriveExtension(mediaType, mimeType, fileName);
    const path = `${userId}/${speciesId ?? `site-${siteId}`}-${Date.now()}.${extension}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('user-photos').upload(path, blob, { contentType });
    if (uploadError) throw uploadError;

    const takenAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_photos')
      .insert({
        user_id: userId,
        species_id: speciesId ?? null,
        site_id: siteId ?? null,
        region_id: regionId,
        storage_path: path,
        taken_at: takenAt,
        media_type: mediaType,
      })
      .select()
      .single();
    if (error) throw error;

    const { data: signedUrl } = await supabase.storage.from('user-photos').createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return {
      id: data.id,
      speciesId,
      siteId,
      regionId,
      uri: signedUrl?.signedUrl ?? uri,
      mediaType,
      storagePath: path,
      takenAt,
    };
  }

  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  const photo: UserPhoto = {
    id: `${speciesId ?? siteId}-${Date.now()}`,
    speciesId,
    siteId,
    regionId,
    uri,
    mediaType,
    takenAt: new Date().toISOString(),
  };
  await writeJson(KEYS.photos, [...photos, photo]);
  return photo;
}

/** Deletes both the Supabase Storage object and the `user_photos` row (or, offline, the local entry). */
export async function deleteUserPhoto(photoId: string, storagePath?: string): Promise<void> {
  const userId = await getUserId();

  if (userId && supabase) {
    let path = storagePath;
    if (!path) {
      const { data, error } = await supabase
        .from('user_photos')
        .select('storage_path')
        .eq('id', photoId)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      path = data?.storage_path ?? undefined;
    }

    if (path) {
      const { error: removeError } = await supabase.storage.from('user-photos').remove([path]);
      if (removeError) throw removeError;
    }

    const { error } = await supabase.from('user_photos').delete().eq('id', photoId).eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const photos = await readJson<UserPhoto[]>(KEYS.photos, []);
  await writeJson(
    KEYS.photos,
    photos.filter((p) => p.id !== photoId),
  );
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

// Returns `null` (never `undefined`) when there's no rating yet -- same
// "Query data cannot be undefined" React Query constraint as
// getSiteBySlug/getSpeciesBySlug in repository.ts.
export async function getSiteRating(siteId: string): Promise<SiteRating | null> {
  const ratings = await getSiteRatings();
  return ratings.find((r) => r.siteId === siteId) ?? null;
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
