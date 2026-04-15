<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# The Modern Agrarian

Single-app Next.js project with App Router frontend and API routes backed by MongoDB.

## Stack

1. Next.js 15 (App Router)
2. React 19 + TypeScript
3. Tailwind CSS 4
4. MongoDB (official `mongodb` driver)

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Make sure a local MongoDB server is running on `127.0.0.1:27017`.
3. Create `.env.local` with:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017
   MONGODB_DB_NAME=modern_agrarian
   AUTH_SESSION_TTL_DAYS=7
   ```
4. Run the app:
   `npm run dev`

App runs on port `3000`.

## Environment Variables

The app uses local MongoDB by default.

1. `MONGODB_URI` (optional)
   - Defaults to `mongodb://127.0.0.1:27017`
2. `MONGODB_DB_NAME` (optional)
   - Defaults to `modern_agrarian`
3. `AUTH_SESSION_TTL_DAYS` (optional)
   - Defaults are handled in auth logic if omitted

After changing environment variables, restart the app so the server picks them up.

## API Endpoints

1. `GET /api/health` - health check with MongoDB ping
2. `GET /api/equipment` - list equipment
3. `POST /api/equipment` - create equipment
4. `POST /api/bookings` - create a confirmed booking for selected equipment
