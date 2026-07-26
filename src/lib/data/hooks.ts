import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';
import { useActiveRegion } from '../region-context';

import * as progress from './progressStore';
import * as repo from './repository';
import type { MediaType } from './types';

// ---------- Content (species / sites) ----------
// Read-mostly, cached indefinitely by TanStack Query so the dex/sites work
// offline on a boat once loaded once.

export function useSpeciesList() {
  return useQuery({ queryKey: ['species'], queryFn: repo.getSpecies, staleTime: Infinity });
}

export function useSpecies(slug: string | undefined) {
  return useQuery({
    queryKey: ['species', slug],
    queryFn: () => repo.getSpeciesBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: Infinity,
  });
}

export function useSites() {
  return useQuery({ queryKey: ['sites'], queryFn: repo.getSites, staleTime: Infinity });
}

export function useSite(slug: string | undefined) {
  return useQuery({
    queryKey: ['sites', slug],
    queryFn: () => repo.getSiteBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: Infinity,
  });
}

export function useSpeciesForSite(siteSlug: string | undefined) {
  return useQuery({
    queryKey: ['site-species', siteSlug],
    queryFn: () => repo.getSpeciesForSite(siteSlug!),
    enabled: Boolean(siteSlug),
    staleTime: Infinity,
  });
}

export function useSitesForSpecies(speciesSlug: string | undefined) {
  return useQuery({
    queryKey: ['species-sites', speciesSlug],
    queryFn: () => repo.getSitesForSpecies(speciesSlug!),
    enabled: Boolean(speciesSlug),
    staleTime: Infinity,
  });
}

// ---------- Regions ----------
// Same queryKey (['regions']) as the internal query in region-context.tsx's
// RegionProvider -- TanStack Query dedupes by key, so both stay in sync
// without this hook needing to import the provider (and vice versa).

export function useRegions() {
  return useQuery({ queryKey: ['regions'], queryFn: repo.getRegions, staleTime: Infinity });
}

export function useSpeciesForRegion(regionSlug: string | undefined) {
  return useQuery({
    queryKey: ['species-for-region', regionSlug],
    queryFn: () => repo.getSpeciesForRegion(regionSlug!),
    enabled: Boolean(regionSlug),
    staleTime: Infinity,
  });
}

export function useSitesForRegion(regionSlug: string | undefined) {
  return useQuery({
    queryKey: ['sites-for-region', regionSlug],
    queryFn: () => repo.getSitesForRegion(regionSlug!),
    enabled: Boolean(regionSlug),
    staleTime: Infinity,
  });
}

// ---------- Personal progress (sightings / photos / ratings) ----------
// Reads/writes Supabase once signed in (same "shared source of truth" model
// as species/sites); falls back to on-device storage when signed out. Query
// keys include the user id so signing in/out/switching accounts refetches
// the right data instead of showing another user's cached results.

/** Global across every region -- a species found anywhere counts as found everywhere. See progressStore.getFinds. */
export function useFinds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['finds', user?.id ?? 'local'],
    queryFn: () => progress.getFinds(),
  });
}

export function useSightingsForSpecies(speciesId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sightings', user?.id ?? 'local', speciesId],
    queryFn: () => progress.getSightingsForSpecies(speciesId!),
    enabled: Boolean(speciesId),
  });
}

export function useSetSightingCount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ speciesId, siteId, count }: { speciesId: string; siteId: string; count: number }) =>
      progress.setSightingCount(speciesId, siteId, count),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sightings', user?.id ?? 'local', variables.speciesId] });
      queryClient.invalidateQueries({ queryKey: ['site-sightings', user?.id ?? 'local', variables.siteId] });
      // Partial key -- matches ['finds', user?.id ?? 'local', <any region id>], whichever region is active.
      queryClient.invalidateQueries({ queryKey: ['finds'] });
    },
  });
}

/** Every species the user has personally logged a sighting of at one site (the flip side of useSightingsForSpecies). */
export function useSightingsForSite(siteId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['site-sightings', user?.id ?? 'local', siteId],
    queryFn: () => progress.getSightingsForSite(siteId!),
    enabled: Boolean(siteId),
  });
}

/** "I saw this everywhere in this area" bulk action -- see progressStore.markAllSightingsForSites. */
export function useMarkAllSightingsForSites() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ speciesId, siteIds }: { speciesId: string; siteIds: string[] }) =>
      progress.markAllSightingsForSites(speciesId, siteIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sightings', user?.id ?? 'local', variables.speciesId] });
      for (const siteId of variables.siteIds) {
        queryClient.invalidateQueries({ queryKey: ['site-sightings', user?.id ?? 'local', siteId] });
      }
      queryClient.invalidateQueries({ queryKey: ['finds'] });
    },
  });
}

/** Region-scoped under the hood (reads the active region from context) so a photo logged in one region never appears while viewing another. */
export function useUserPhotos(target: { speciesId?: string; siteId?: string }) {
  const { user } = useAuth();
  const activeRegion = useActiveRegion();
  return useQuery({
    queryKey: ['user-photos', user?.id ?? 'local', activeRegion?.id ?? 'no-region', target.speciesId ?? null, target.siteId ?? null],
    queryFn: () => progress.getUserPhotos(target, activeRegion!.id),
    enabled: Boolean((target.speciesId || target.siteId) && activeRegion),
  });
}

/** Stamps every upload with the currently active region -- callers never need to pass one explicitly. */
export function useAddUserPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeRegion = useActiveRegion();
  return useMutation({
    mutationFn: (target: {
      speciesId?: string;
      siteId?: string;
      uri: string;
      mediaType: MediaType;
      mimeType?: string | null;
      fileName?: string | null;
    }) => {
      if (!activeRegion) throw new Error('No active region selected yet.');
      return progress.addUserPhoto({ ...target, regionId: activeRegion.id });
    },
    onSuccess: (photo) => {
      queryClient.invalidateQueries({
        queryKey: ['user-photos', user?.id ?? 'local', activeRegion?.id ?? 'no-region', photo.speciesId ?? null, photo.siteId ?? null],
      });
    },
  });
}

/** Deletes a photo/video the user uploaded -- see progressStore.deleteUserPhoto for the storage + row cleanup. */
export function useDeleteUserPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeRegion = useActiveRegion();
  return useMutation({
    mutationFn: ({ photoId, storagePath }: { photoId: string; storagePath?: string; speciesId?: string; siteId?: string }) =>
      progress.deleteUserPhoto(photoId, storagePath),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'user-photos',
          user?.id ?? 'local',
          activeRegion?.id ?? 'no-region',
          variables.speciesId ?? null,
          variables.siteId ?? null,
        ],
      });
    },
  });
}

export function useSiteRating(siteId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['site-rating', user?.id ?? 'local', siteId],
    queryFn: () => progress.getSiteRating(siteId!),
    enabled: Boolean(siteId),
  });
}

/** Every dive site the user has personally rated, across every region -- drives the star/notes preview and star filter on the Sites list. */
export function useSiteRatings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['site-ratings', user?.id ?? 'local'],
    queryFn: () => progress.getSiteRatings(),
  });
}

export function useRateSite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ siteId, rating, notes }: { siteId: string; rating: number; notes?: string }) =>
      progress.rateSite(siteId, rating, notes),
    onSuccess: (rating) => {
      queryClient.invalidateQueries({ queryKey: ['site-rating', user?.id ?? 'local', rating.siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-ratings', user?.id ?? 'local'] });
    },
  });
}

// ---------- Profile / public reviews ----------

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id ?? 'local'],
    queryFn: () => progress.getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (updates: { displayName?: string; reviewsPublic?: boolean }) => progress.updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id ?? 'local'] });
    },
  });
}

/** Every opted-in user's review of one site (not just the current user's own). See progressStore.getPublicReviewsForSite. */
export function usePublicReviewsForSite(siteId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['public-reviews', user?.id ?? 'local', siteId],
    queryFn: () => progress.getPublicReviewsForSite(siteId!),
    enabled: Boolean(siteId),
  });
}
