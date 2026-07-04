// One-off: insert the curated Sharm el Sheikh region/sites/species from
// supabase/seed/species_seed.json into a freshly-migrated Supabase project.
// Run supabase/migrations/0001_init.sql first. Idempotent (upserts by slug).
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/seed.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(readFileSync(path.join(__dirname, '../seed/species_seed.json'), 'utf-8'))

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function main() {
  const { data: region, error: regionErr } = await supabase
    .from('regions')
    .upsert({ name: seed.region.name, slug: seed.region.slug }, { onConflict: 'slug' })
    .select()
    .single()
  if (regionErr) throw regionErr
  console.log(`region: ${region.name}`)

  const siteIdBySlug = new Map()
  for (const s of seed.sites) {
    const { data, error } = await supabase
      .from('sites')
      .upsert(
        {
          region_id: region.id,
          slug: s.slug,
          name: s.name,
          area: s.area,
          type: s.type,
          lat: s.lat,
          lng: s.lng,
          depth_min: s.depth_min,
          depth_max: s.depth_max,
          difficulty: s.difficulty,
          description: s.description,
        },
        { onConflict: 'slug' },
      )
      .select()
      .single()
    if (error) throw error
    siteIdBySlug.set(s.slug, data.id)
    console.log(`site: ${s.name}`)
  }

  const speciesIdBySlug = new Map()
  for (const sp of seed.species) {
    const slug = slugify(sp.common_name)
    const { data, error } = await supabase
      .from('species')
      .upsert(
        {
          slug,
          common_name: sp.common_name,
          scientific_name: sp.scientific_name,
          group: sp.group,
          description: sp.description,
          habitat: sp.habitat,
          max_size_cm: sp.max_size_cm,
          depth_range: sp.depth_range,
          iucn_status: sp.iucn_status,
          rarity_tier: sp.rarity_tier,
        },
        { onConflict: 'slug' },
      )
      .select()
      .single()
    if (error) throw error
    speciesIdBySlug.set(slug, data.id)
    console.log(`species: ${sp.common_name}`)

    for (const siteSlug of sp.sites) {
      const siteId = siteIdBySlug.get(siteSlug)
      if (!siteId) { console.warn(`  unknown site slug "${siteSlug}" for ${sp.common_name}`); continue }
      const { error: linkErr } = await supabase
        .from('site_species')
        .upsert({ site_id: siteId, species_id: data.id, frequency: sp.frequency }, { onConflict: 'site_id,species_id' })
      if (linkErr) throw linkErr
    }
  }

  console.log(`\nSeeded ${siteIdBySlug.size} sites and ${speciesIdBySlug.size} species.`)
  console.log('Next: node supabase/scripts/compute_rarity.mjs && node supabase/scripts/fetch_photos.mjs')
}

main().catch((e) => { console.error(e); process.exit(1) })
