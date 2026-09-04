# Special Affair Webapp

Next.js frontend for the Special Affair storefront. The root page serves the exact bundled design from `public/special-affair-reference.html`.

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

## Backend Testing Status

The exact design at `/` is the supplied bundled prototype. Its catalog, bag, checkout, and confirmation flows use the bundle's local demo state; `NEXT_PUBLIC_API_URL` does not automatically connect those flows to the API.

To test API requests, the frontend still needs an API client and feature calls wired to the backend's OpenAPI endpoints. The value below is ready for that integration:

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

- `src/app/page.tsx` - Root route that loads the exact reference design
- `public/special-affair-reference.html` - Byte-for-byte reference artifact
- `src/app/(storefront)/page.tsx` - React storefront implementation kept as the maintainable app route
- `.env.example` - Safe environment template to share
- `.env.local` - Local environment values; do not commit or share secrets

## Sharing With A Friend

Share the `special-affair-webapp` folder or repository, excluding `node_modules`, `.next`, and `.env.local`. Your friend should copy `.env.example` to `.env.local`, install dependencies, and start the app with `pnpm dev`.

For frontend and backend on the same computer, the default API URL works. For separate computers on the same network, use the backend computer's LAN IP instead of `127.0.0.1`.
