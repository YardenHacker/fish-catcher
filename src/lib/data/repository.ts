import { isSupabaseConfigured, supabase } from '../supabase';

import { MOCK_REGIONS, MOCK_SITE_SPECIES, MOCK_SITES, MOCK_SPECIES } from './mockData';
import { DiveSite, Region, Species } from './types';

function mapSpeciesRow(row: any): Species {
  return {
    id: row.id,
    slug: row.slug,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    group: row.group,
    description: row.description,
    habitat: row.habitat,
    maxSizeCm: row.max_size_cm,
    depthRange: row.depth_range,
    iucnStatus: row.iucn_status,
    rarityScore: row.rarity_score,
    rarityTier: row.rarity_tier,
    photoUrl: row.photo_url ?? undefined,
    photoCredit: row.photo_credit ?? undefined,
    photoLicense: row.photo_license ?? undefined,
    photoSourceUrl: row.photo_source_url ?? undefined,
    populationInfo: row.population_info ?? undefined,
    bestSeason: row.best_season ?? undefined,
  };
}

function mapSiteRow(row: any): DiveSite {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    area: row.area,
    type: row.type,
    lat: row.lat,
    lng: row.lng,
    depthMin: row.depth_min,
    depthMax: row.depth_max,
    difficulty: row.difficulty,
    description: row.description,
    heroImageUrl: row.hero_image_url ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    photoCredit: row.photo_credit ?? undefined,
    photoLicense: row.photo_license ?? undefined,
    photoSourceUrl: row.photo_source_url ?? undefined,
    regionId: row.region_id,
    proTip: row.pro_tip ?? undefined,
  };
}

function mapRegionRow(row: any): Region {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
  };
}

/**
 * Given every region, picks the one that should be active by default for a
 * user who has never touched the region switcher: prefer the pre-existing
 * "Sharm el Sheikh" region so existing users see exactly what they see today,
 * otherwise fall back to the first region alphabetically.
 */
export function pickDefaultRegion(regions: Region[]): Region | undefined {
  if (regions.length === 0) return undefined;
  const existing = regions.find((r) => r.slug === 'sharm-el-sheikh');
  if (existing) return existing;
  return [...regions].sort((a, b) => a.name.localeCompare(b.name))[0];
}

export async function getSpecies(): Promise<Species[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('species').select('*').order('rarity_score', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSpeciesRow);
  }
  return MOCK_SPECIES;
}

// Returns `null` (never `undefined`) when nothing matches -- React Query
// throws "Query data cannot be undefined" if a queryFn resolves to
// undefined, and useSpecies/useSite pass this straight through as queryFn.
export async function getSpeciesBySlug(slug: string): Promise<Species | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('species').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? mapSpeciesRow(data) : null;
  }
  return MOCK_SPECIES.find((s) => s.slug === slug) ?? null;
}

export async function getSites(): Promise<DiveSite[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('sites').select('*').order('area', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSiteRow);
  }
  return MOCK_SITES;
}

export async function getSiteBySlug(slug: string): Promise<DiveSite | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? mapSiteRow(data) : null;
  }
  return MOCK_SITES.find((s) => s.slug === slug) ?? null;
}

export async function getSpeciesForSite(siteSlug: string): Promise<Species[]> {
  if (isSupabaseConfigured && supabase) {
    const site = await getSiteBySlug(siteSlug);
    if (!site) return [];
    const { data, error } = await supabase
      .from('site_species')
      .select('frequency, species:species_id(*)')
      .eq('site_id', site.id);
    if (error) throw error;
    return (data ?? []).map((row: any) => mapSpeciesRow(row.species));
  }
  const slugs = new Set(MOCK_SITE_SPECIES.filter((l) => l.siteSlug === siteSlug).map((l) => l.speciesSlug));
  return MOCK_SPECIES.filter((s) => slugs.has(s.slug));
}

export async function getSitesForSpecies(speciesSlug: string): Promise<DiveSite[]> {
  if (isSupabaseConfigured && supabase) {
    const species = await getSpeciesBySlug(speciesSlug);
    if (!species) return [];
    const { data, error } = await supabase
      .from('site_species')
      .select('frequency, site:site_id(*)')
      .eq('species_id', species.id);
    if (error) throw error;
    return (data ?? []).map((row: any) => mapSiteRow(row.site));
  }
  const slugs = new Set(MOCK_SITE_SPECIES.filter((l) => l.speciesSlug === speciesSlug).map((l) => l.siteSlug));
  return MOCK_SITES.filter((s) => slugs.has(s.slug));
}

// ---------- Regions ----------
// A region groups sites geographically (e.g. Sharm el Sheikh, Eilat). Species
// stay a single shared global catalog -- only their site associations (via
// site_species) differ by region, which is what getSpeciesForRegion below
// mirrors.

export async function getRegions(): Promise<Region[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('regions').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRegionRow);
  }
  return MOCK_REGIONS;
}

async function getRegionBySlug(slug: string): Promise<Region | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('regions').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? mapRegionRow(data) : undefined;
  }
  return MOCK_REGIONS.find((r) => r.slug === slug);
}

export async function getSitesForRegion(regionSlug: string): Promise<DiveSite[]> {
  if (isSupabaseConfigured && supabase) {
    const region = await getRegionBySlug(regionSlug);
    if (!region) return [];
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('region_id', region.id)
      .order('area', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSiteRow);
  }
  return MOCK_REGIONS.some((r) => r.slug === regionSlug) ? MOCK_SITES : [];
}

/** Species with at least one site_species link to a site in this region -- the join that makes the Fish tab region-scoped. */
export async function getSpeciesForRegion(regionSlug: string): Promise<Species[]> {
  if (isSupabaseConfigured && supabase) {
    const sites = await getSitesForRegion(regionSlug);
    if (sites.length === 0) return [];
    const { data, error } = await supabase
      .from('site_species')
      .select('species:species_id(*)')
      .in(
        'site_id',
        sites.map((s) => s.id),
      );
    if (error) throw error;
    const bySpeciesId = new Map<string, Species>();
    for (const row of data ?? []) {
      const species = mapSpeciesRow((row as any).species);
      bySpeciesId.set(species.id, species);
    }
    return Array.from(bySpeciesId.values());
  }
  const siteSlugs = new Set(MOCK_SITES.map((s) => s.slug));
  if (!MOCK_REGIONS.some((r) => r.slug === regionSlug)) return [];
  const speciesSlugs = new Set(MOCK_SITE_SPECIES.filter((l) => siteSlugs.has(l.siteSlug)).map((l) => l.speciesSlug));
  return MOCK_SPECIES.filter((s) => speciesSlugs.has(s.slug));
}
