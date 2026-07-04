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

export interface Find {
  speciesId: string;
  siteId?: string;
  notes?: string;
  firstFoundAt: string;
}

export interface UserPhoto {
  id: string;
  speciesId: string;
  uri: string;
  takenAt: string;
}

export interface SiteRating {
  siteId: string;
  rating: number;
  notes?: string;
  updatedAt: string;
}
