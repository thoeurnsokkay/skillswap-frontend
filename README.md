# Skill-Swap Hub — Frontend

## Stack
- Next.js 14 (App Router) + TypeScript
- TailwindCSS + Custom CSS (no external UI lib issues)
- react-hook-form + zod (validation on all forms)
- Axios + Zustand
- react-hot-toast

## Pages (12 total)
| Page | Route | Matches UI Image |
|---|---|---|
| Landing    | /           | Image 1  |
| Login      | /login      | Image 2  |
| Register   | /register   | Image 3  |
| Dashboard  | /dashboard  | Image 4  |
| Profile    | /profile/[id] | Image 5 |
| My Skills  | /skills     | Image 6  |
| Discover   | /search     | Image 7  |
| Matches    | /matches    | Image 8  |
| Messages   | /messages   | Image 9  |
| Reviews    | /reviews    | Image 10 |
| Settings   | /settings   | Image 12 |
| Admin      | /admin      | — |

## Setup
```bash
npm install
# Edit .env.local
NEXT_PUBLIC_API_URL=http://localhost:9090

For Vercel deployment, add:

BACKEND_API_URL=https://your-backend-domain.com

Notes:
- Frontend calls are proxied through /api/proxy in production.
- BACKEND_API_URL must point to your deployed Spring Boot backend.
npm run dev   # → http://localhost:3000
```
