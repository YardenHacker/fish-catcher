# ReefDex — Execution Brief (for Sonnet)

Opus did the planning + scaffolding. You (Sonnet) execute the build. Work through the
branches in order, committing per feature, and verify with the preview tools.

## Hard constraints
- **Cost = $0.** Only free tiers: Supabase free project, npm, Expo, CC-licensed photos.
- **Higgsfield: FREE PLAN ONLY.** Before any `generate_image`, check the free balance
  (`show_plans_and_credits` / `balance`). If a generation would cost money, SKIP it and
  leave the placeholder theme colors. Never incur a charge.
- Do not commit secrets. Supabase keys go in `.env` (gitignored) and `app.config` extra.

## Current repo state
- Path: `reefdex/` (Expo SDK 57, TypeScript, expo-router in `src/app/`, `expo-image` incl.).
- Custom tabs live in `src/components/app-tabs.tsx`; theme in `src/constants/theme.ts`.
- Git: on branch **`master`**, single "Initial commit". `develop` NOT created yet.
- Extra deps NOT installed yet.
- Approved plan: `../.claude/plans/lexical-wobbling-bunny.md` (read it first).

## Already written (in repo, ready to use)
- `supabase/migrations/0001_init.sql` — full schema + RLS + storage buckets.
- `supabase/seed/species_seed.json` — 26 curated Sharm species + 13 dive sites (real, with scientific names).
- `supabase/scripts/fetch_photos.mjs` — CC photo pipeline (iNaturalist + Wikimedia), records attribution.
- `supabase/scripts/compute_rarity.mjs` — rarity_score/tier from frequency + IUCN.

## Step 0 — git flow + deps (do first)
```
cd reefdex
git branch -m master main && git branch develop && git checkout develop
npx expo install @supabase/supabase-js @tanstack/react-query \
  @react-native-async-storage/async-storage expo-image-picker
```
Each feature below = its own branch off `develop` → implement → commit → merge back to `develop`
(`git checkout develop && git merge --no-ff <branch>`). No GitHub remote required.

## Data layer decision (important)
Build a **local mock fallback** so the app runs on the Expo web preview WITHOUT Supabase creds:
- `src/lib/data/mockData.ts` — import `supabase/seed/species_seed.json`, expose species/sites.
- `src/lib/supabase.ts` — create client only if `EXPO_PUBLIC_SUPABASE_URL` + anon key exist.
- `src/lib/data/index.ts` — repository layer: if Supabase configured, query it; else use mock.
- User progress (finds, ratings, notes, uploaded photo URIs): persist to AsyncStorage locally,
  and mirror to Supabase when configured. This keeps everything demoable offline + free.
Wrap the app in a TanStack Query provider in `src/app/_layout.tsx`.

## Branches / order
1. `feat/supabase-schema` — `src/lib/supabase.ts`, `.env.example`, gitignore `.env`, README note on running the migration.
2. `feat/data-layer` — mock data + repository + AsyncStorage progress store + Query provider.
3. `feat/dex-grid` — replace `src/app/index.tsx` with a 2-col creature grid; locked (silhouette/greyed) vs
   found; rarity-tier color badge; filter chips (group, rarity, site). Reuse `themed-text/view`.
4. `feat/species-detail` — `src/app/creature/[id].tsx`: photo (`expo-image`), rarity, description, habitat,
   depth, IUCN, **photo attribution line**, "Mark as found" button, user-photo gallery.
5. `feat/dive-sites` — `src/app/sites.tsx` list (group by area) + `src/app/site/[id].tsx` detail with
   species-seen-here and coordinates. Maps optional (list is fine for web preview; note native map as later).
6. `feat/collection` — `src/app/collection.tsx`: found list + collection score (sum of rarity of found species) + stats.
7. `feat/mark-found` — wire the button → progress store (+ Supabase `finds` when configured).
8. `feat/photo-upload` — `expo-image-picker` → local store now; upload to `user-photos` bucket when configured.
9. `feat/site-ratings-notes` — 1–5 rating + notes per site, persisted.
10. `feat/design-higgsfield` — icon/splash/rarity badges/site hero art via Higgsfield **free plan only**
    (else keep placeholders). Put assets in `assets/` and `src/design/`.
11. `chore/ci-eas-deploy` — add EAS config + `expo export --platform web` script for a static web deploy.

Register the tab routes (Dex / Sites / Collection / Profile) in `src/components/app-tabs.tsx`.

## Multitasking with sub-agents (as requested)
After steps 0–2 (shared foundation) land on `develop`, you may fan out Sonnet sub-agents in
isolated worktrees for independent branches — good non-conflicting split:
- Agent A: `feat/dex-grid` + `feat/species-detail`
- Agent B: `feat/dive-sites`
- Agent C: `feat/collection` + `feat/mark-found` + `feat/site-ratings-notes`
Merge them back sequentially, resolving the tab-registration file last.

## Supabase setup (ask the user when ready; all free tier)
1. User creates a free project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Seed: insert `species_seed.json` rows (write a small `seed.mjs` using the service-role key),
   then run `compute_rarity.mjs`, then `fetch_photos.mjs`.
4. User pastes `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` into `.env`.
Until then the app runs fully on mock + AsyncStorage.

## Verification (per <verification_workflow>)
- `npx expo start --web` (or preview_start). Walk: Dex grid → open creature → Mark found →
  (upload photo) → Collection score updates → open a Site → rate + note → reopen persists.
- Check `preview_console_logs`/`preview_snapshot` for errors; `preview_screenshot` as proof.
- Confirm each feature landed on its own branch merged into `develop` (`git log --oneline --graph`).
