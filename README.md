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

## API Endpoints

1. `GET /api/health` - health check
2. `GET /api/equipment` - list equipment
3. `POST /api/equipment` - create equipment
4. `POST /api/bookings` - create a confirmed booking for selected equipment
