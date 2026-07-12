import seed from '../../../supabase/seed/species_seed.json';

import { computeRarityScore } from './rarity';
import { DiveSite, Region, RarityTier, SiteSpeciesLink, Species } from './types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface SeedSpecies {
  common_name: string;
  scientific_name: string;
  group: string;
  iucn_status: string;
  rarity_tier: string;
  max_size_cm: number;
  depth_range: string;
  description: string;
  habitat: string;
  sites: string[];
  frequency: string;
  population_info?: string;
  best_season?: string | null;
}

interface SeedSite {
  slug: string;
  name: string;
  area: string;
  type: string;
  lat: number;
  lng: number;
  depth_min: number;
  depth_max: number;
  difficulty: string;
  description: string;
}

interface SeedRegion {
  name: string;
  slug: string;
}

const seedSpecies = seed.species as SeedSpecies[];
const seedSites = seed.sites as SeedSite[];
const seedRegion = seed.region as SeedRegion;

// The mock/offline fallback only ever has one region's worth of data bundled
// (whatever's in species_seed.json), so its id can just be the slug -- same
// convention MOCK_SITES/MOCK_SPECIES already use for ids below.
export const MOCK_REGIONS: Region[] = [{ id: seedRegion.slug, slug: seedRegion.slug, name: seedRegion.name }];

export const MOCK_SITES: DiveSite[] = seedSites.map((s) => ({
  id: s.slug,
  slug: s.slug,
  name: s.name,
  area: s.area,
  type: s.type,
  lat: s.lat,
  lng: s.lng,
  depthMin: s.depth_min,
  depthMax: s.depth_max,
  difficulty: s.difficulty,
  description: s.description,
  regionId: seedRegion.slug,
}));

export const MOCK_SPECIES: Species[] = seedSpecies.map((s) => {
  const slug = slugify(s.common_name);
  return {
    id: slug,
    slug,
    commonName: s.common_name,
    scientificName: s.scientific_name,
    group: s.group,
    description: s.description,
    habitat: s.habitat,
    maxSizeCm: s.max_size_cm,
    depthRange: s.depth_range,
    iucnStatus: s.iucn_status,
    rarityScore: computeRarityScore(s.frequency, s.iucn_status),
    // Hand-curated tier from the seed data (matches the Pokémon-style feel);
    // rarityScore above is the reproducible numeric value used for sorting.
    rarityTier: s.rarity_tier as RarityTier,
    // No bundled photo yet — populated by supabase/scripts/fetch_photos.mjs
    // once a Supabase project is configured; the UI must handle this being unset.
    photoUrl: undefined,
    photoCredit: undefined,
    photoLicense: undefined,
    photoSourceUrl: undefined,
    populationInfo: s.population_info,
    bestSeason: s.best_season ?? undefined,
  };
});

export const MOCK_SITE_SPECIES: SiteSpeciesLink[] = seedSpecies.flatMap((s) =>
  s.sites.map((siteSlug) => ({
    siteSlug,
    speciesSlug: slugify(s.common_name),
    frequency: s.frequency,
  })),
);
