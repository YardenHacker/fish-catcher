import { isSupabaseConfigured, supabase } from '../supabase';

import { MOCK_SITE_SPECIES, MOCK_SITES, MOCK_SPECIES } from './mockData';
import { DiveSite, Species } from './types';

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
  };
}

export async function getSpecies(): Promise<Species[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('species').select('*').order('rarity_score', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSpeciesRow);
  }
  return MOCK_SPECIES;
}

export async function getSpeciesBySlug(slug: string): Promise<Species | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('species').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? mapSpeciesRow(data) : undefined;
  }
  return MOCK_SPECIES.find((s) => s.slug === slug);
}

export async function getSites(): Promise<DiveSite[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('sites').select('*').order('area', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSiteRow);
  }
  return MOCK_SITES;
}

export async function getSiteBySlug(slug: string): Promise<DiveSite | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? mapSiteRow(data) : undefined;
  }
  return MOCK_SITES.find((s) => s.slug === slug);
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
