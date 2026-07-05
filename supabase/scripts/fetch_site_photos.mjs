// Fetch real, CC-licensed dive-site hero photos from Wikimedia Commons,
// download the best one, upload to Supabase Storage (bucket: site-photos),
// and write url + attribution back onto the sites row.
//
// Mirrors supabase/scripts/fetch_photos.mjs (species pipeline) closely --
// same fetchWithRetry backoff on HTTP 429 (rate limiting was previously
// silently mistaken for "no photo exists"), same Commons search + license
// filtering, same "update the row directly, never via the seed JSON" rule.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/fetch_site_photos.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wikimedia's APIs (Wikipedia + Commons) rate-limit (429) under sustained
// traffic across an 18-site run. Retry a couple of times with backoff
// instead of silently treating a transient 429 as "no photo exists".
async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options)
    if (res.status !== 429) return res
    await sleep(2000 * (attempt + 1))
  }
  return fetch(url, options)
}

async function fromCommonsSearch(query) {
  // Searches the whole Commons File: namespace for a query string.
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|size&format=json&origin=*`
  const res = await fetchWithRetry(api, { headers: { 'User-Agent': 'FishCatcher/1.0 (site photo pipeline)' } })
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

// Search terms to try in order, most specific first. Each site gets its
// own list built from name + area/type context so wreck sites search for
// "wreck diving" rather than "reef", etc.
function searchTermsFor(site) {
  const terms = []
  const name = site.name
  const isWreck = site.type === 'wreck'

  if (isWreck) {
    terms.push(`${name} wreck diving Red Sea`)
    terms.push(`${name} wreck Egypt`)
    terms.push(`${name} Red Sea`)
  } else {
    terms.push(`${name} diving Sharm el Sheikh`)
    terms.push(`${name} Red Sea reef`)
    terms.push(`${name} Sharm el Sheikh`)
  }
  terms.push(`${name} Red Sea`)
  return terms
}

// Representative real Red Sea reef/wreck photos used only when an exact
// site-name match can't be found on Commons. Same fallback philosophy as
// the species pipeline (fetch_photos.mjs): never leave a site with no
// photo at all, but always prefer an exact match first.
const FALLBACK_QUERIES = {
  wreck: ['SS Thistlegorm wreck Red Sea diving', 'shipwreck diving Red Sea'],
  reef: ['coral reef Red Sea Sharm el Sheikh diving', 'Red Sea coral reef'],
}

async function findPhotoFor(site) {
  for (const term of searchTermsFor(site)) {
    const pick = await fromCommonsSearch(term)
    if (pick) return { pick, exact: true }
    await sleep(600)
  }
  const fallbackTerms = site.type === 'wreck' ? FALLBACK_QUERIES.wreck : FALLBACK_QUERIES.reef
  for (const term of fallbackTerms) {
    const pick = await fromCommonsSearch(term)
    if (pick) return { pick, exact: false }
    await sleep(600)
  }
  return { pick: null, exact: false }
}

async function main() {
  const { data: siteRows, error } = await supabase
    .from('sites')
    .select('id, slug, name, type, photo_url')
  if (error) throw error

  const exactMatches = []
  const fallbacks = []
  const failures = []

  for (const site of siteRows) {
    if (site.photo_url) { console.log(`skip ${site.slug} (already has photo)`); continue }

    const { pick, exact } = await findPhotoFor(site)
    if (!pick?.imageUrl) { console.warn(`NO PHOTO: ${site.slug} (${site.name}) -- flag for manual pick`); failures.push(site.slug); continue }

    const img = await fetchWithRetry(pick.imageUrl)
    if (!img.ok) { console.warn(`download failed ${site.slug} (HTTP ${img.status})`); failures.push(site.slug); continue }
    const buf = Buffer.from(await img.arrayBuffer())
    const ext = (pick.imageUrl.split('.').pop() || 'jpg').split('?')[0].slice(0, 4)
    const path = `${site.slug}.${ext}`

    const up = await supabase.storage.from('site-photos')
      .upload(path, buf, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true })
    if (up.error) { console.warn(`upload failed ${site.slug}: ${up.error.message}`); failures.push(site.slug); continue }
    const { data: pub } = supabase.storage.from('site-photos').getPublicUrl(path)

    const { error: uerr } = await supabase.from('sites').update({
      photo_url: pub.publicUrl,
      photo_credit: pick.credit,
      photo_license: pick.license,
      photo_source_url: pick.sourceUrl,
    }).eq('id', site.id)
    if (uerr) { console.warn(`db update failed ${site.slug}: ${uerr.message}`); failures.push(site.slug); continue }

    if (exact) { console.log(`OK (exact) ${site.slug} <- ${pick.license}`); exactMatches.push(site.slug) }
    else { console.log(`OK (fallback) ${site.slug} <- ${pick.license}`); fallbacks.push(site.slug) }
    await sleep(1200) // be polite to the APIs
  }

  console.log('\n--- summary ---')
  console.log(`exact matches (${exactMatches.length}):`, exactMatches.join(', ') || '(none)')
  console.log(`fallback photos (${fallbacks.length}):`, fallbacks.join(', ') || '(none)')
  console.log(`failures (${failures.length}):`, failures.join(', ') || '(none)')
  console.log('done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
