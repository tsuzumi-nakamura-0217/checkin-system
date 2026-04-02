# Check-in System

Research lab check-in web application built with Next.js, NextAuth, Prisma, and Turso.

## Tech Stack

- Next.js (App Router)
- NextAuth (Google OAuth)
- Prisma ORM
- Turso (libSQL)

## Prerequisites

- Node.js 20+
- npm
- Turso database URL and auth token
- Google OAuth client credentials

## Environment Variables

Configure `.env`:

```dotenv
DATABASE_URL="file:./dev.db"
TURSO_DATABASE_URL="libsql://your-db-name-your-account.turso.io"
TURSO_AUTH_TOKEN="your_turso_auth_token"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-random-secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

Notes:

- `DATABASE_URL` is used by Prisma CLI and must stay `file:` for sqlite provider.
- `TURSO_DATABASE_URL` is used by the runtime Prisma adapter to connect to Turso.
- Keep credentials out of source control.

## Setup

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Push schema to Turso:

```bash
npx prisma db push
```

Note: `prisma db push` applies schema to the local sqlite file (`DATABASE_URL`).
Runtime queries still use Turso via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

Start development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification Checklist

1. `npx prisma generate` completes without errors.
2. `npx prisma db push` succeeds against Turso.
3. `npm run lint` passes.
4. Google login works from `/login`.
5. User, Account, and Session records are created in Turso.
