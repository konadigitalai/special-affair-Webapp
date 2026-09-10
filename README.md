# Special Affair Webapp

Next.js frontend for the Special Affair storefront. The root page uses the native React
storefront in `src/components/storefront/Storefront.tsx` and connects to the sibling
`special-affair-api` project. See `../INTEGRATION.md` for the integrated setup and flow coverage.

## Requirements

- Node.js 20+
- pnpm 11+
- Special Affair API running locally on port `8000`

## Run Locally

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

The default frontend API URL is:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

If the backend is running on another computer, replace `127.0.0.1` with that computer's local network IP address. The backend must allow requests from the frontend origin.

## Backend integration

API mode is the default. `src/lib/api/backend.ts` adapts the backend contract, persists guest
ownership tokens, normalizes cart/order responses and handles checkout replay/recovery.
The browser client is rebuilt by `scripts/build-storefront.mjs` before dev/build.

Use `NEXT_PUBLIC_COMMERCE_MODE=preview` for isolated design work. Connected API failures
are displayed to the user and never silently replaced by demo orders or catalogue data.
The default API URL is:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

When the backend and frontend run on different computers, use the backend computer's LAN address, for example:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.25:8000/api/v1
```

The backend should listen on `0.0.0.0:8000` and allow CORS from `http://localhost:3000`.

## Commands

```bash
pnpm dev       # Start development server
pnpm lint      # Run ESLint
pnpm build     # Create production build
pnpm start     # Serve production build
```

## Important Files

- `src/app/page.tsx` - Root route and public runtime configuration
- `src/components/storefront/Storefront.tsx` - Active React storefront
- `src/components/storefront/CustomerFlows.tsx` - Account, returns, support and shopping help
- `src/lib/api/backend.ts` - FastAPI transport adapter
- `public/special-affair-reference.html` - Retained legacy prototype
- `.env.example` - Safe environment template to share
- `.env.local` - Local environment values; do not commit or share secrets

## Sharing With A Friend

Share the `special-affair-webapp` folder or repository, excluding `node_modules`, `.next`, and `.env.local`. Your friend should copy `.env.example` to `.env.local`, install dependencies, and start the app with `pnpm dev`.

For frontend and backend on the same computer, the default API URL works. For separate computers on the same network, use the backend computer's LAN IP instead of `127.0.0.1`.
