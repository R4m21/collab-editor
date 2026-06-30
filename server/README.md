# WebSocket Server (Hocuspocus)

Ye server real-time collaboration ke liye hai. Next.js app se alag run hota hai.

## Setup

```bash
# 1. server/ folder mein jao
cd server

# 2. Dependencies install karo (sirf pehli baar)
npm install

# 3. Prisma client generate karo
npx prisma generate --schema=../prisma/schema.prisma

# 4. Server run karo
npm run dev        # development (auto-restart)
npm start          # production
```

## Environment

Server automatically parent folder ka `.env.local` load karta hai.
Koi alag setup nahi chahiye.

## Errors aur fix

| Error | Fix |
|-------|-----|
| `Cannot find module '@prisma/client'` | `npm install` run karo |
| `DATABASE_URL MISSING` | Root `.env.local` mein `DATABASE_URL` set karo |
| `Port 1234 already in use` | `WS_PORT=1235` set karo |
