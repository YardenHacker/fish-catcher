export type RarityTier = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface Region {
  id: string;
  slug: string;
  name: string;
}

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
  photoUrl?: string;
  photoCredit?: string;
  photoLicense?: string;
  photoSourceUrl?: string;
  /** Which region this site belongs to -- drives all region-scoping (species-for-region, map default center, etc.). */
  regionId: string;
  /** Optional curated callout, rendered distinctly from the regular description; absent for most sites. */
  proTip?: string;
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

/**
 * Aggregate across ALL of a species' sightings, everywhere -- drives the Fish
 * tab lock/unlock and Collection list. Global by design: seeing a species
 * once at any site, in any region, is enough to count it "found" everywhere
 * it's later encountered in the app. `siteIds`/`firstFoundSiteId` retain
 * *where* it was seen so the Collection screen can still show that, even
 * though the found status itself no longer depends on which region is active.
 */
export interface Find {
  speciesId: string;
  totalCount: number;
  firstFoundAt: string;
  /** The site of the earliest-logged sighting. */
  firstFoundSiteId: string;
  /** Every distinct site this species has ever been logged at (includes firstFoundSiteId). */
  siteIds: string[];
}

export type MediaType = 'photo' | 'video';

export interface UserPhoto {
  id: string;
  speciesId?: string;
  siteId?: string;
  uri: string;
  /** Every row has one -- old rows default to 'photo' (see migration 0005). */
  mediaType: MediaType;
  /** Supabase Storage object path (bucket `user-photos`); absent for the offline/local fallback. Needed to delete the underlying file. */
  storagePath?: string;
  takenAt: string;
  /**
   * The region this photo was logged in (see migration 0006). Every new photo
   * gets one; local/offline photos saved before this field existed won't have
   * it (see progressStore.getUserPhotos, which treats a missing value as
   * belonging to the default region).
   */
  regionId?: string;
}

export interface SiteRating {
  siteId: string;
  rating: number;
  notes?: string;
  updatedAt: string;
}
