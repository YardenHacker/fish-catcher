import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getRegions, pickDefaultRegion } from './data/repository';
import type { Region } from './data/types';

/**
 * UI/session state for "which region am I currently viewing" -- distinct from
 * the data layer (src/lib/data/): this is a user preference persisted on
 * device, not fetched content. The region *list* itself is still fetched
 * content, so it's queried here the same way src/lib/data/hooks.ts's
 * useRegions() does (same query key -- TanStack Query dedupes the fetch)
 * rather than importing that hook directly, which would create a circular
 * import (hooks.ts needs useActiveRegion from this file for
 * useUserPhotos/useAddUserPhoto/useFinds).
 */

const ACTIVE_REGION_STORAGE_KEY = 'reefdex.activeRegion';

/**
 * Which country each region belongs to. Not modeled server-side -- with only
 * two countries and four regions today, a client-side map is simpler than a
 * schema/migration change. A new region just needs an entry added here
 * alongside its seed data. Shared by the Area tab (the country/area picker
 * page) -- there's no other UI surface for switching regions anymore.
 */
export const REGION_COUNTRY: Record<string, string> = {
  'sharm-el-sheikh': 'Egypt',
  dahab: 'Egypt',
  eilat: 'Israel',
  mediterranean: 'Israel',
};
export const COUNTRY_ORDER = ['Israel', 'Egypt'];

interface RegionContextValue {
  regions: Region[];
  /** True until both the regions list has loaded once and the persisted choice has been read. */
  isLoading: boolean;
  /**
   * The region currently being viewed. Falls back to the persisted choice, or
   * (for a fresh install / a persisted id that no longer exists) the default
   * region -- "Sharm el Sheikh" if present, else the first region
   * alphabetically -- so the app behaves exactly as it does today for anyone
   * who never touches the switcher.
   */
  activeRegion: Region | undefined;
  setActiveRegionId: (regionId: string) => void;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const { data: regions, isLoading: regionsLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: Infinity,
  });

  const [storedRegionId, setStoredRegionId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ACTIVE_REGION_STORAGE_KEY).then((value) => {
      if (cancelled) return;
      setStoredRegionId(value);
      setHasHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRegion = useMemo<Region | undefined>(() => {
    if (!regions || regions.length === 0) return undefined;
    if (storedRegionId) {
      const match = regions.find((r) => r.id === storedRegionId);
      if (match) return match;
    }
    return pickDefaultRegion(regions);
  }, [regions, storedRegionId]);

  function setActiveRegionId(regionId: string) {
    setStoredRegionId(regionId);
    AsyncStorage.setItem(ACTIVE_REGION_STORAGE_KEY, regionId).catch(() => {
      // Best-effort persistence -- the in-memory selection above still applies for this session.
    });
  }

  const value = useMemo<RegionContextValue>(
    () => ({
      regions: regions ?? [],
      isLoading: regionsLoading || !hasHydrated,
      activeRegion,
      setActiveRegionId,
    }),
    [regions, regionsLoading, hasHydrated, activeRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

function useRegionContext(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('Region hooks must be used within a RegionProvider');
  return ctx;
}

/** The region currently being viewed (undefined only until the regions list first loads). */
export function useActiveRegion(): Region | undefined {
  return useRegionContext().activeRegion;
}

/** Returns a setter: call it with a region id to switch the active region (persists across restarts). */
export function useSetActiveRegion(): (regionId: string) => void {
  return useRegionContext().setActiveRegionId;
}

export function useActiveRegionLoading(): boolean {
  return useRegionContext().isLoading;
}
