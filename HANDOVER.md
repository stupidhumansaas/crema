# Crema — developer handover

Crema is a UK speciality-coffee directory, currently a **private preview**. It's live on Vercel, reads its data from Supabase, and is built from Rory's prototype (the original handover package, Nov 2026).

> Search engines are told not to index the site. Roasters haven't agreed to a public launch yet.

---

## 1. Where things are

```
crema/
├── HANDOVER.md                 ← this file
├── web/                        ← the website (Vercel root directory)
│   ├── app/
│   │   ├── shell.html          ← page markup (all views)
│   │   ├── globals.css         ← base styles from the prototype
│   │   ├── editorial.css       ← the editorial reskin, layered on top
│   │   ├── layout.tsx, page.tsx
│   │   └── api/
│   │       ├── directory/      ← GET: the whole directory from Supabase (cached 10 min at the edge)
│   │       ├── profile/        ← GET/PUT/DELETE: saved taste profiles
│   │       └── enquiry/        ← POST: wholesale enquiries
│   ├── components/Boot.tsx     ← loads /api/directory, then starts public/crema.js; mobile menu
│   ├── public/crema.js         ← the app script (routing, rendering, matching, portal demo)
│   ├── lib/supabase.ts
│   ├── supabase/migrations/    ← database schema (apply in order)
│   ├── scripts/seed.mjs        ← pushes data/directory.json into Supabase
│   ├── scripts/copy-logos.mjs  ← data/logos → public/logos at build
│   ├── data/                   ← directory.json, Master_Coffee_Data.xlsx, logos/, manual fixes
│   ├── tools/                  ← Python data pipeline (spreadsheet → directory.json)
│   └── src/index.html          ← Rory's latest single-file prototype, kept as the design reference
└── Crema/, Crema.xcodeproj     ← a separate iOS app idea (camera / Vibe Score), not part of the website
```

## 2. How it works

- **Front-end.** Still the prototype's vanilla JS with hash routing (`#roasters`, `#roaster-<id>`, `#bean-<id>`, `#find`, `#blog`, `#article-<slug>`, `#portal`, `#wholesale`, `#pricing`, …). Next.js serves the page and the API. Nothing is split into React components yet.
- **Data.** Supabase holds the directory in the tables `roasters`, `beans`, `pods`, `supermarket`, `guides` and `pod_tips`, which the public can read but not change. `/api/directory` turns the rows back into the shape the script expects.
- **Saved data.** `profiles` holds taste profiles, keyed by a random token kept in the visitor's browser. `wholesale_enquiries` holds enquiries. Neither table can be reached directly: the site goes through SQL functions that check the input.
- **Hosting.** On Vercel, every push to `main` deploys to production and every other branch gets a preview URL. The root directory is `web`.

## 3. Updating the data

```bash
cd web
python3 tools/import_master.py data/Master_Coffee_Data.xlsx   # → data/directory.json
python3 tools/geocode.py                                      # adds lat/lng
npm run seed                                                  # → Supabase (needs SUPABASE_SECRET_KEY in .env.local)
```

The live site shows the changes within 10 minutes, with no deploy needed. The seed deletes rows that are no longer in `directory.json`. If the spreadsheet gains a new field, the seed stops with a message: add a column in a new migration and to `COLUMNS` in `scripts/seed.mjs`.

**Local development:** `npm install`, then `npm run dev`. This needs `.env.local` (see `.env.example`). On Node 20 the scripts pass `--experimental-websocket`; Node 22+ doesn't need it.

## 4. Bag imagery (`bagImg`)

About 4,300 of the 6,283 coffees have a `bagImg` URL pointing at the roaster's own site. The site hotlinks them, and if one fails to load it falls back to a branded placeholder pouch. Rory's recommended plan still applies:
1. Hotlink by default (done).
2. Later, cache the images to your own CDN so roaster site changes don't break them.
3. Let roasters upload their own photos through the portal.

## 5. What is real vs. placeholder

| Area | Status now | Needs for production |
|---|---|---|
| Roaster/coffee data | **Real**, in Supabase, loaded from the spreadsheet | An admin UI (today it's spreadsheet → seed) |
| Bag photos | **Real** hotlinks, with a placeholder fallback | Cache to own CDN; roaster uploads |
| Taste matching, Find your coffee, search, filters | **Working**, in the browser | Can stay client-side |
| Taste profiles / email preferences | **Saved to Supabase**, tied to one browser | Email sign-in (Supabase Auth); an email service for the fortnightly emails |
| Wholesale enquiries | **Saved to Supabase**, including brew setup and training | **Nobody is notified yet.** Needs email routing to roasters and a lead manager |
| Roaster portal, listing edits, approval queue | Front-end demo; nothing is saved | Roaster auth, image storage, moderation queue, auto-ingest from roaster shops |
| Referral tracking | UTM tags are on outbound links; counts are samples | Analytics to count tagged visits |
| Pricing tiers / Example roasteries | Demo: five "Example Roastery" profiles, one per tier | Billing |
| Blog | Four **example** articles | A CMS and real content |
| Social links | Placeholders | Real accounts |

## 6. Principles (please keep)

- **Complete and curated.** Cover the roasters worth knowing, and surface the best.
- **Discovery is never for sale.** Paid tiers buy a richer profile, never a better ranking or matching position.
- **No cut of roaster sales.** Crema is funded by listings and a small equipment affiliate commission.
- **Honest metrics.** ROI is shown as an estimate until a roaster confirms a win.
- **Protect the free tier.** "Worth discovering" is a spot chosen on merit that can't be bought. It's hidden while every roaster is on the launch Premium tier.

## 7. Next steps

1. Email: route wholesale enquiries to roasters, and send the fortnightly picks.
2. Roaster accounts: Supabase Auth, the real portal, listing edits with an approval queue, and photo uploads.
3. Visitor sign-in, so profiles follow people across devices.
4. Cache bag images; count referrals.
5. Gradually move views from `shell.html` and `crema.js` into React routes with real URLs, which helps SEO once public.

_Private preview. The name, branding and some data are not final._
