# KeepALive Frontend (Consumer)

Vite + React. Consumer discovery experience only — "is it busy right now?"
No business dashboard, no auth, no map component yet (see below).

## Setup

```bash
npm install
cp .env.example .env    # points at the backend, defaults to localhost:4000
npm run dev              # http://localhost:5173
```

Needs the backend running (see `keepalive-backend/`) with at least the
demo data seeded:

```bash
cd ../keepalive-backend
npm run seed
```

The seed script now creates 5 demo locations around Carlsbad, CA (car wash,
gym, coffee shop, bar, restaurant) under a demo business set directly to
`active`, so the frontend has real data to show without you creating a
business through the API first.

## What's here

- **`/`** — location gate (use real geolocation, or a one-tap demo location
  button) → category filter → list of nearby locations, closest first, each
  showing a live/not-live pill and distance.
- **`/locations/:id`** — detail page: a placeholder where the live stream
  will eventually go (honestly labeled "Live view coming soon" rather than
  faking video), status, address, a directions link, and a website link if
  the business has one.

## Design decisions worth knowing about

- **No map component.** Google Maps / Mapbox both need an API key you'd
  have to provide and pay for; a plain sorted list gets the same "what's
  near me" job done for an MVP. Swapping in a real map later is additive,
  not a rewrite — the location data already carries `distanceMeters` and
  coordinates.
- **Status is honestly just live / not-live.** The occupancy levels
  (quiet/moderate/busy) from the original plan are a real feature but
  depend on the vision/occupancy pipeline, which isn't built yet. The
  design tokens already reserve colors for it (`--color-quiet`,
  `--color-moderate`, `--color-busy` in `src/styles/tokens.css`) so wiring
  it in later is a data change, not a redesign.
- **List rows with a status-colored left edge**, not shadowed cards — ties
  the one strong visual signal (live or not) directly to the structure of
  each row instead of a decorative badge.
- Type: **Space Grotesk** for display/headlines, **IBM Plex Sans** for
  body/UI — bundled via `@fontsource` so there's no external font CDN
  dependency.

## Not built yet

Business dashboard/login, camera connection UI, actual live video, map
view, and consumer-facing occupancy levels — all later phases per the
build sequence.
