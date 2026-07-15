# Veil waitlist

Private, referral-based waitlist for Veil. Built with Next.js, tRPC, Better Auth,
Drizzle, Neon Postgres, Tailwind, and Resend.

## Flow

1. Visitor opens a referral link at `/r/{code}`.
2. Veil securely retains the referral code for 30 days.
3. Visitor signs in with Google and claims a unique handle.
4. Enrollment creates the waitlist place. The inviter earns one point.
5. Public leaderboard exposes only masked handles and points. Members see their
   own exact rank in `/dashboard`.

## Local setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Required environment variables:

```bash
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM="Veil <hello@yourdomain.com>"
```

For Google OAuth, add `${BETTER_AUTH_URL}/api/auth/callback/google` as an
authorized redirect URI. Verify the `RESEND_FROM` domain in Resend before
sending production email.

## Checks

```bash
npm run check
npm run typecheck
npm run build
```
