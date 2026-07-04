import { RarityTier } from './types';

/**
 * Mirrors the scoring in supabase/scripts/compute_rarity.mjs so the on-device
 * mock data and the Supabase-computed values agree once a project is wired up.
 * Lower local sighting frequency => rarer => higher score contribution.
 */
const FREQUENCY_SCORE: Record<string, number> = {
  abundant: 5,
  common: 20,
  uncommon: 45,
  rare: 70,
  'seasonal-rare': 85,
  'very-rare': 95,
};

const IUCN_BONUS: Record<string, number> = {
  LC: 0,
  NT: 5,
  VU: 10,
  EN: 18,
  CR: 25,
  NE: 0,
};

export function computeRarityScore(frequency: string, iucnStatus: string): number {
  const base = FREQUENCY_SCORE[frequency] ?? 30;
  const bonus = IUCN_BONUS[iucnStatus] ?? 0;
  return Math.max(1, Math.min(100, Math.round(base + bonus)));
}

export function tierForScore(score: number): RarityTier {
  if (score >= 90) return 'Legendary';
  if (score >= 70) return 'Epic';
  if (score >= 50) return 'Rare';
  if (score >= 28) return 'Uncommon';
  return 'Common';
}

export const RARITY_TIER_COLOR: Record<RarityTier, string> = {
  Common: '#7A8A99',
  Uncommon: '#2E9E5B',
  Rare: '#2E7DD1',
  Epic: '#9B4FE0',
  Legendary: '#E0A62E',
};

export const RARITY_TIER_ORDER: RarityTier[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
