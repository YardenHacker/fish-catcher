export type RarityTier = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface Species {
  id: string;
  slug: string;
  commonName: string;
  scientificName: string;
  group: string;
  description: string;
  habitat: string;
  maxSizeCm: number;
  depthRange: string;
  iucnStatus: string;
  rarityScore: number;
  rarityTier: RarityTier;
  photoUrl?: string;
  photoCredit?: string;
  photoLicense?: string;
  photoSourceUrl?: string;
  /** Honest population/range context -- not a precise "world count", which doesn't exist for most reef fish. */
  populationInfo?: string;
  /** Only set when genuinely seasonal (e.g. "Summer (June–August)"); absent for year-round residents. */
  bestSeason?: string;
}

export interface DiveSite {
  id: string;
  slug: string;
  name: string;
  area: string;
  type: string;
  lat: number;
  lng: number;
  depthMin: number;
  depthMax: number;
  difficulty: string;
  description: string;
  heroImageUrl?: string;
}

export interface SiteSpeciesLink {
  siteSlug: string;
  speciesSlug: string;
  frequency: string;
}

/** A per-site tally: how many of this species the user has seen at one site. */
export interface Sighting {
  speciesId: string;
  siteId: string;
  count: number;
  updatedAt: string;
}

/** Aggregate across all of a species' sightings -- drives the Fish tab lock/unlock and Collection list. */
export interface Find {
  speciesId: string;
  totalCount: number;
  firstFoundAt: string;
}

export interface UserPhoto {
  id: string;
  speciesId?: string;
  siteId?: string;
  uri: string;
  takenAt: string;
}

export interface SiteRating {
  siteId: string;
  rating: number;
  notes?: string;
  updatedAt: string;
}
