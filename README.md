# Fish Catcher 🎣

A Pokémon-Go-style collection app for real marine life around **Sharm el Sheikh** — Ras
Mohammed, the Straits of Tiran, and the local reefs. Browse a "dex" of real Red Sea species
with rarity scores, mark them as found, upload your own dive photos, browse dive sites, and
rate/annotate the sites you've visited.

Built with Expo (React Native + TypeScript) and Supabase.

## Running it

```bash
npm install
npx expo start        # then press w for web, or scan the QR code with Expo Go
```

The app works **fully offline out of the box** — no account or backend required. Species and
dive-site content ships bundled in `supabase/seed/species_seed.json`; your personal progress
(finds, uploaded photos, site ratings/notes) is saved on-device via AsyncStorage.

## Wiring up a real (free) Supabase backend

This is optional and only needed once you want cross-device sync. Everything below is on
Supabase's free tier.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql` — it creates the schema,
   row-level security policies, and the two storage buckets (`species-photos`, `user-photos`).
3. Copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — from Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page. **Only used by the one-off scripts below, never
     shipped in the app.**
4. Seed the content tables:
   ```bash
   node supabase/scripts/seed.mjs           # inserts species_seed.json into Supabase
   node supabase/scripts/compute_rarity.mjs # computes rarity_score/tier from frequency + IUCN status
   node supabase/scripts/fetch_photos.mjs   # pulls CC-licensed photos (iNaturalist/Wikimedia), with attribution
   ```
5. Restart the app — it now reads/writes Supabase instead of the bundled mock data.

Until step 3 is done, the app silently runs on mock data — nothing breaks if you skip this
entirely.

## Deploying

- **Web (static export, free):** `npm run build:web` → outputs a static site under `dist/`
  that can be hosted anywhere (Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.).
- **Native builds (iOS/Android):** this repo includes `eas.json` with `development` / `preview`
  / `production` profiles for [EAS Build](https://docs.expo.dev/build/introduction/) once you're
  ready to produce installable app binaries or submit to the app stores (requires a free Expo
  account; store submission itself is a later step, not part of this build).

## Project layout

```
src/app/            expo-router screens (file-based routing)
src/components/      shared UI (themed text/view, tab bars, etc.)
src/lib/supabase.ts  conditional Supabase client (only initializes if env vars are set)
src/lib/data/        types, mock data loader, repository (mock ⇄ Supabase), local progress
                     store (AsyncStorage), and React Query hooks screens consume
supabase/migrations/ SQL schema + RLS + storage buckets
supabase/seed/       curated Sharm el Sheikh species + dive site data
supabase/scripts/    one-off Node scripts: seed, rarity computation, CC photo fetch
```

## Git flow

`main` is the stable branch; `develop` integrates finished features. Each feature lives on its
own branch (`feat/...`) and is merged into `develop` via a merge commit, mirroring a normal
production workflow.
