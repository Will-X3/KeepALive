# KeepALive Backend (MERN)

Auth, businesses, locations, categories — the same feature set as before,
rebuilt on your preferred stack: Express + MongoDB/Mongoose, JWT auth,
classic controllers/routes/middleware structure.

## Stack

- Node.js + Express (CommonJS)
- MongoDB + Mongoose
- JWT auth (jsonwebtoken + bcryptjs)
- express-async-handler so controllers can `throw` instead of manual
  try/catch everywhere

## Setup

```bash
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm run seed               # creates starter categories + first admin
npm run dev                 # http://localhost:4000 (nodemon)
```

`npm run seed` creates an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
in `.env` (defaults to `admin@keepalive.local` / `change-me-now-12345` if
unset). Change that password immediately outside local dev.

Needs a running MongoDB — either local (`mongod`) or a free Atlas cluster;
just point `MONGO_URI` at it.

## Structure

```
server.js                  entry point
src/
  config/db.js              mongoose connection
  models/                   Mongoose schemas
  controllers/               request handlers
  routes/                    route -> controller wiring
  middleware/
    auth.js                  protect (JWT) + authorize(...roles)
    errorHandler.js           notFound + centralized error handler
  utils/
    generateToken.js
    ownership.js              assertOwnsBusiness / assertOwnsLocation
  seed/seed.js
```

## Notable decisions carried over from the schema discussion

- **Geo search uses a real `2dsphere` index** (`Location.geo`, GeoJSON
  Point) and Mongo's native `$near` — no manual bounding-box/Haversine math
  needed, which was the one place Mongo is a straight upgrade over the
  earlier Postgres version.
- **`Stream.publicState` stays separate from `ingestState`** — a camera can
  be connected while the public feed stays `fail_closed`. Ambiguous privacy
  state should never resolve permissively.
- **Ownership checks return 404, not 403**, on cross-tenant access
  (`src/utils/ownership.js`), so resource IDs can't be probed by comparing
  error codes.
- **No consumer accounts.** Only `business_owner` and `admin` roles exist;
  browsing/discovery routes are public.
- **`StreamEvent` has a 90-day TTL index** so the event log doesn't grow
  forever by default — adjust once you know what you want to keep.

## API quick reference

```
POST   /api/auth/register          { email, password }
POST   /api/auth/login             { email, password }
GET    /api/auth/me                (auth)

GET    /api/categories
POST   /api/categories             (admin)   { name, slug }
DELETE /api/categories/:id         (admin)

POST   /api/businesses             (auth)              { name, website?, phone? }
GET    /api/businesses/mine        (auth)
GET    /api/businesses/:id         (auth, owner/admin)
PATCH  /api/businesses/:id         (auth, owner/admin)
PATCH  /api/businesses/:id/status  (admin)              { status }

GET    /api/locations              (public)  ?lat=&lng=&radiusKm=&category=&liveOnly=
GET    /api/locations/:id          (public)
POST   /api/locations              (auth, owner)         { businessId, categoryId, name, address, lat, lng, timezone, hours? }
PATCH  /api/locations/:id          (auth, owner/admin)
PATCH  /api/locations/:id/visibility     (auth, owner/admin)   { status: live | paused }
PATCH  /api/locations/:id/admin-status   (admin)               { status }
```

## Not built yet (next: camera ingestion, week 2 of the original sequence)

Camera/Stream/StreamEvent models already exist in `src/models/` so those
routes are a straightforward addition — camera connect, ingest key
rotation, stream health, and eventually the face-blur pipeline.
