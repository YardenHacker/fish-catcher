import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';

import * as progress from './progressStore';
import * as repo from './repository';

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

// ---------- Personal progress (finds / photos / ratings) ----------
// Reads/writes Supabase once signed in (same "shared source of truth" model
// as species/sites); falls back to on-device storage when signed out. Query
// keys include the user id so signing in/out/switching accounts refetches
// the right data instead of showing another user's cached results.

export function useFinds() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['finds', user?.id ?? 'local'], queryFn: progress.getFinds });
}

export function useIsFound(speciesId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['finds', user?.id ?? 'local', speciesId],
    queryFn: () => progress.isFound(speciesId!),
    enabled: Boolean(speciesId),
  });
}

export function useMarkFound() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ speciesId, siteId, notes }: { speciesId: string; siteId?: string; notes?: string }) =>
      progress.markFound(speciesId, siteId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finds', user?.id ?? 'local'] });
    },
  });
}

export function useUserPhotos(speciesId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-photos', user?.id ?? 'local', speciesId],
    queryFn: () => progress.getUserPhotos(speciesId),
  });
}

export function useAddUserPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ speciesId, uri }: { speciesId: string; uri: string }) => progress.addUserPhoto(speciesId, uri),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: ['user-photos', user?.id ?? 'local', photo.speciesId] });
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
