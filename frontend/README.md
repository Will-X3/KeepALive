# KeepALive Frontend

Vite + React. Two experiences in one app:

- **Consumer** (`/`, `/locations/:id`) — "is it busy right now?" No account
  needed.
- **Business dashboard** (`/login`, `/register`, `/dashboard/...`) — where
  business owners register, add locations, connect cameras, and go live.

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

## Consumer experience

- **`/`** — location gate (use real geolocation, or a one-tap demo location
  button) → category filter → list of nearby locations, closest first, each
  showing a live/not-live pill and distance.
- **`/locations/:id`** — detail page: a placeholder where the live stream
  will eventually go (honestly labeled "Live view coming soon" rather than
  faking video), status, address, a directions link, and a website link if
  the business has one.

## Business dashboard

- **`/register`** / **`/login`** — business owner auth, JWT persisted in
  `localStorage`, attached to every dashboard API call automatically (see
  `src/api/client.js`'s request interceptor).
- **`/dashboard`** — list your businesses, create a new one (starts
  `pending` until admin review).
- **`/dashboard/businesses/:id`** — business detail, list/create locations.
  Location creation uses the browser's geolocation to set coordinates
  (reuses the same `useGeolocation` hook as the consumer home page).
- **`/dashboard/locations/:id/cameras`** — the core of the camera flow:
  - **Connect a camera** → generates an ingest key and shows it exactly
    once in a prominent banner with a copy button, matching the backend's
    "shown once, never again" behavior. The key is never stored client-side
    — if you lose it, rotate instead.
  - Camera status badges (connected/pending/disconnected/error) and stream
    status badges (live/offline/fail-closed), pulled from
    `GET /api/locations/:id/cameras`.
  - **Rotate ingest key** / **Remove camera**.
  - **Go live / Pause** toggle for the location — calling `Go live` will
    fail with a clear error if no camera's stream is currently reporting
    healthy (i.e. the backend's fail-closed rule from
    `locationController.setVisibility`), which is intentional, not a bug.

All dashboard routes are behind `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) — logged-out visitors get redirected to `/login`.

## Design decisions worth knowing about

- **No map component.** Google Maps / Mapbox both need an API key you'd
  have to provide and pay for; a plain sorted list gets the same "what's
  near me" job done for an MVP. Swapping in a real map later is additive,
  not a rewrite — the location data already carries `distanceMeters` and
  coordinates.
- **Status is honestly just live / not-live** on the consumer side. The
  occupancy levels (quiet/moderate/busy) from the original plan are a real
  feature but depend on the vision/occupancy pipeline. The design tokens
  already reserve colors for it (`--color-quiet`, `--color-moderate`,
  `--color-busy` in `src/styles/tokens.css`) — the dashboard's business/
  camera status badges already reuse these same tokens as a general
  good/waiting/blocked signal, so wiring in real occupancy later is a data
  change, not a redesign.
- **List rows with a status-colored left edge**, not shadowed cards — ties
  the one strong visual signal (live or not) directly to the structure of
  each row instead of a decorative badge.
- Type: **Space Grotesk** for display/headlines, **IBM Plex Sans** for
  body/UI — bundled via `@fontsource` so there's no external font CDN
  dependency.
- Theme colors (navy `#001231`, brand red `#C3112E`) were sampled directly
  from the KeepALive logo, not eyeballed.

## Not built yet

Actual live video playback, map view, camera privacy-zone masking UI, and
admin console — all later phases per the build sequence.
