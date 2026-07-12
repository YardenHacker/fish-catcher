import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';

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

// ---------- Personal progress (sightings / photos / ratings) ----------
// Reads/writes Supabase once signed in (same "shared source of truth" model
// as species/sites); falls back to on-device storage when signed out. Query
// keys include the user id so signing in/out/switching accounts refetches
// the right data instead of showing another user's cached results.

export function useFinds() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['finds', user?.id ?? 'local'], queryFn: progress.getFinds });
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
      queryClient.invalidateQueries({ queryKey: ['finds', user?.id ?? 'local'] });
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
      queryClient.invalidateQueries({ queryKey: ['finds', user?.id ?? 'local'] });
    },
  });
}

export function useUserPhotos(target: { speciesId?: string; siteId?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-photos', user?.id ?? 'local', target.speciesId ?? null, target.siteId ?? null],
    queryFn: () => progress.getUserPhotos(target),
    enabled: Boolean(target.speciesId || target.siteId),
  });
}

export function useAddUserPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (target: {
      speciesId?: string;
      siteId?: string;
      uri: string;
      mediaType: MediaType;
      mimeType?: string | null;
      fileName?: string | null;
    }) => progress.addUserPhoto(target),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({
        queryKey: ['user-photos', user?.id ?? 'local', photo.speciesId ?? null, photo.siteId ?? null],
      });
    },
  });
}

/** Deletes a photo/video the user uploaded -- see progressStore.deleteUserPhoto for the storage + row cleanup. */
export function useDeleteUserPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ photoId, storagePath }: { photoId: string; storagePath?: string; speciesId?: string; siteId?: string }) =>
      progress.deleteUserPhoto(photoId, storagePath),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user-photos', user?.id ?? 'local', variables.speciesId ?? null, variables.siteId ?? null],
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

export function useRateSite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ siteId, rating, notes }: { siteId: string; rating: number; notes?: string }) =>
      progress.rateSite(siteId, rating, notes),
    onSuccess: (rating) => {
      queryClient.invalidateQueries({ queryKey: ['site-rating', user?.id ?? 'local', rating.siteId] });
    },
  });
}
