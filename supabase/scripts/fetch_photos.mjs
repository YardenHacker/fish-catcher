// Fetch CC-licensed species photos from iNaturalist (primary) with a Wikimedia
// Commons fallback, download the best one, and upload to Supabase Storage
// (bucket: species-photos), writing url + attribution back onto the species row.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/fetch_photos.mjs
//
// Requires only Node 18+ (global fetch). Attribution/license are always recorded
// so the images are legal to publish. Run compute_rarity first (or after) to fill
// rarity_score/tier; this script only touches photo_* columns.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const OK_LICENSES = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wikimedia's APIs (Wikipedia + Commons) rate-limit (429) under sustained
// traffic across a 45+ species run. Retry a couple of times with backoff
// instead of silently treating a transient 429 as "no photo exists".
async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options)
    if (res.status !== 429) return res
    await sleep(2000 * (attempt + 1))
  }
  return fetch(url, options)
}

async function fromINaturalist(sciName) {
  // iNaturalist's `q` search is a fuzzy text match, not an exact scientific-name
  // lookup -- it ranks by popularity/observation count, so a query like
  // "Monachus monachus" (Mediterranean Monk Seal) can come back with an
  // unrelated species that merely shares the epithet "monachus" (e.g. the
  // Monk Parakeet, Myiopsitta monachus) ranked above the actual target, or
  // the target may not appear in the first page at all. Blindly taking
  // results[0] silently attaches the wrong animal's photo. Guard by only
  // accepting a result whose own scientific name matches the query.
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sciName)}&rank=species&per_page=10`
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'FishCatcher/1.0 (seed pipeline)' } })
  if (!res.ok) return null
  const data = await res.json()
  const taxon = data.results?.find((t) => (t.name || '').toLowerCase() === sciName.toLowerCase())
  const photo = taxon?.default_photo
  if (!photo || !OK_LICENSES.has((photo.license_code || '').toLowerCase())) return null
  return {
    imageUrl: photo.medium_url || photo.url?.replace('square', 'medium'),
    credit: photo.attribution,
    license: (photo.license_code || '').toUpperCase(),
    sourceUrl: `https://www.inaturalist.org/taxa/${taxon.id}`,
  }
}

async function fromWikimedia(sciName) {
  // Grab the lead image of the species' Wikipedia page (Commons-hosted, CC/PD).
  // redirects=1 is required: most species articles are titled by common name
  // (e.g. "Monachus monachus" redirects to "Mediterranean monk seal"), and
  // without it the query silently returns no image for any such species.
  const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(sciName)}&redirects=1&origin=*`
  const res = await fetchWithRetry(api, { headers: { 'User-Agent': 'FishCatcher/1.0'} })
  if (!res.ok) return null
  const data = await res.json()
  const pages = data.query?.pages || {}
  const page = Object.values(pages)[0]
  const src = page?.original?.source
  if (!src) return null
  return {
    imageUrl: src,
    credit: `Wikimedia Commons — see ${sciName} on Wikipedia`,
    license: 'CC/PD (verify on Commons)',
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(sciName)}`,
  }
}

async function fromCommonsSearch(sciName) {
  // Broader than fromWikimedia: searches the whole Commons File: namespace
  // instead of relying on one Wikipedia article having a usable lead image.
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(sciName)}&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|size&format=json&origin=*`
  const res = await fetchWithRetry(api, { headers: { 'User-Agent': 'FishCatcher/1.0' } })
  if (!res.ok) return null
  const data = await res.json()
  const pages = Object.values(data.query?.pages || {})
  for (const p of pages) {
    const info = p.imageinfo?.[0]
    if (!info) continue
    if ((info.width || 0) < 300) continue // skip icons/thumbnails
    const licenseName = (info.extmetadata?.LicenseShortName?.value || '').trim()
    if (!/^(cc0|cc[\s-]?by|public domain)/i.test(licenseName)) continue
    const artistRaw = info.extmetadata?.Artist?.value || 'Wikimedia Commons contributor'
    const credit = artistRaw.replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons contributor'
    return {
      imageUrl: info.url,
      credit,
      license: licenseName,
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
    }
  }
  return null
}

async function main() {
  const { data: speciesRows, error } = await supabase
    .from('species')
    .select('id, slug, scientific_name, photo_url')
  if (error) throw error

  for (const sp of speciesRows) {
    if (sp.photo_url) { console.log(`skip ${sp.slug} (already has photo)`); continue }
    let pick = await fromINaturalist(sp.scientific_name)
    if (!pick) pick = await fromWikimedia(sp.scientific_name)
    if (!pick) pick = await fromCommonsSearch(sp.scientific_name)
    if (!pick?.imageUrl) { console.warn(`NO PHOTO: ${sp.slug} (${sp.scientific_name}) — flag for manual pick`); continue }

    const img = await fetchWithRetry(pick.imageUrl)
    if (!img.ok) { console.warn(`download failed ${sp.slug} (HTTP ${img.status})`); continue }
    const buf = Buffer.from(await img.arrayBuffer())
    const ext = (pick.imageUrl.split('.').pop() || 'jpg').split('?')[0].slice(0, 4)
    const path = `${sp.slug}.${ext}`

    const up = await supabase.storage.from('species-photos')
      .upload(path, buf, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true })
    if (up.error) { console.warn(`upload failed ${sp.slug}: ${up.error.message}`); continue }
    const { data: pub } = supabase.storage.from('species-photos').getPublicUrl(path)

    const { error: uerr } = await supabase.from('species').update({
      photo_url: pub.publicUrl,
      photo_credit: pick.credit,
      photo_license: pick.license,
      photo_source_url: pick.sourceUrl,
    }).eq('id', sp.id)
    if (uerr) console.warn(`db update failed ${sp.slug}: ${uerr.message}`)
    else console.log(`OK ${sp.slug} <- ${pick.license}`)
    await sleep(1200) // be polite to the APIs
  }
  console.log('done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
