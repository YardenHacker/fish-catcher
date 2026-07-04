// Compute a reproducible rarity_score (1..100) and rarity_tier for every species
// from (a) how often it is seen locally and (b) its IUCN conservation status.
// Idempotent: run any time the species/site_species data changes.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/compute_rarity.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Lower frequency => rarer => higher score contribution.
const FREQ_SCORE = {
  'abundant': 5, 'common': 20, 'uncommon': 45, 'rare': 70, 'seasonal-rare': 85, 'very-rare': 95,
}
// Higher threat status nudges rarity up.
const IUCN_BONUS = { LC: 0, NT: 5, VU: 10, EN: 18, CR: 25, NE: 0 }

function tierFor(score) {
  if (score >= 90) return 'Legendary'
  if (score >= 70) return 'Epic'
  if (score >= 50) return 'Rare'
  if (score >= 28) return 'Uncommon'
  return 'Common'
}

async function main() {
  const { data: species } = await supabase.from('species').select('id, iucn_status')
  const { data: links } = await supabase.from('site_species').select('species_id, frequency')

  // Rarest observed frequency per species drives the base score.
  const rarestBySpecies = new Map()
  for (const l of links) {
    const s = FREQ_SCORE[l.frequency] ?? 30
    rarestBySpecies.set(l.species_id, Math.max(rarestBySpecies.get(l.species_id) ?? 0, s))
  }

  for (const sp of species) {
    const base = rarestBySpecies.get(sp.id) ?? 40
    const bonus = IUCN_BONUS[sp.iucn_status] ?? 0
    const score = Math.max(1, Math.min(100, Math.round(base + bonus)))
    const tier = tierFor(score)
    const { error } = await supabase.from('species')
      .update({ rarity_score: score, rarity_tier: tier }).eq('id', sp.id)
    if (error) console.warn('update failed', sp.id, error.message)
    else console.log(`${sp.id}  score=${score}  tier=${tier}`)
  }
  console.log('rarity computed.')
}

main().catch((e) => { console.error(e); process.exit(1) })
