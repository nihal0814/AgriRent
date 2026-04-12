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
2. Create local env file from [.env.example](.env.example):
   `copy .env.example .env.local`
3. Update `.env.local` with your MongoDB connection settings.
3. Run the app:
   `npm run dev`

App runs on port `3000`.

## Deployment (Important)

Do not rely on `.env.local` in production. Configure environment variables in your hosting provider dashboard.

Required variables:

1. `MONGODB_URI` (for example: `mongodb://127.0.0.1:27017` for local Mongo, or your Atlas URI in production)
2. `MONGODB_DB_NAME` (optional, defaults to `modern_agrarian`)

After setting variables, restart or redeploy so the server picks them up.

## Move to MongoDB Atlas

1. Create an Atlas cluster.
2. Create a database user with `readWrite` access to your app database.
3. Add network access entries for all app egress IPs.
4. Copy the Atlas Node.js connection string and fill in your user/password.
5. Set environment variables:
   - `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?retryWrites=true&w=majority`
   - `MONGODB_DB_NAME=modern_agrarian`
6. Restart local dev server or redeploy production.

Notes:

1. URL-encode special characters in passwords.
2. Keep `MONGODB_DB_NAME` explicit so data lands in the expected database.
3. Use `GET /api/health` to verify app + database connectivity after migration.

## API Endpoints

1. `GET /api/health` - health check with MongoDB ping
2. `GET /api/equipment` - list equipment
3. `POST /api/equipment` - create equipment
4. `POST /api/bookings` - create a confirmed booking for selected equipment
