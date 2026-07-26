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
  /** Whether this specific photo is visible to other users (migration 0010) -- chosen at upload time, off by default. */
  isPublic?: boolean;
}

export interface SiteRating {
  siteId: string;
  rating: number;
  notes?: string;
  updatedAt: string;
  /** Whether this specific review is visible to other users (migration 0010) -- chosen at save time, off by default. */
  isPublic: boolean;
}

/** The current user's own public-facing profile settings. */
export interface Profile {
  displayName?: string;
}

/**
 * One other user's public review of a site -- only ever returned for
 * reviews marked public at save time (migration 0010, enforced by RLS, not
 * just this app's UI). `visitedAt` reuses the rating's own timestamp as the
 * "dive date" rather than a separate dive-log entry, which doesn't exist yet.
 */
export interface PublicReview {
  userId: string;
  displayName: string;
  rating: number;
  notes?: string;
  visitedAt: string;
  photos: { id: string; uri: string; mediaType: MediaType }[];
}

/**
 * One entry in a region's activity feed -- a rare+ find or a public site
 * rating. A find only ever appears once the same user has also made their
 * rating of that same site public (see migration 0010's
 * sightings_read_if_site_rating_public policy) -- RLS is what actually
 * enforces this, not just this app's UI.
 */
export type ActivityEvent =
  | { kind: 'find'; id: string; displayName: string; speciesName: string; rarityTier: RarityTier; siteName: string; at: string }
  | { kind: 'rating'; id: string; displayName: string; siteName: string; rating: number; at: string };
