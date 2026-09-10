# Frontend features

The frontend connects to the sibling FastAPI project, `special-affair-api`.
See `../INTEGRATION.md` for complete setup, flow coverage and verification.

The active storefront now uses native React and the client's clothing reference
boards. Its entry is `src/components/storefront/Storefront.tsx`, styled by
`src/app/storefront.css` and `src/app/flagship.css`. The earlier embedded prototype is retained as a legacy
asset; it is no longer the homepage. See `DESIGN_IMPLEMENTATION.md` for artwork
and motion details.

Implemented customer interfaces:

- Product search; category, world, gender, size and colour filters; price sorting.
- Four collection worlds, journal categories, about page and original campaign photography.
- Backend-persisted guest/account wishlist and a product image/colour/size gallery.
- Persistent bag, quantity changes, removal, coupon entry and total breakdown.
- Product details and actual backend size variants; garment measurements still need catalogue content.
- Contact/address validation, payment handoff and simulated declined/confirmed
  payment views. No card numbers or CVVs are collected.
- Guest/account order history, cancellation, payment retry, tracking and item/quantity return requests.
- Profile updates, saved addresses, consent withdrawal, data download and erasure requests.
- Guest/account support conversations and newsletter subscription forms.
- Published backend stories/pages and shopping copilot conversations.
- Browser-only Auth0 sign-in integration, enabled with public SPA configuration.

## Previewing the frontend

Run `pnpm dev` (or `npm.cmd run dev` on this computer). Explicitly setting `NEXT_PUBLIC_COMMERCE_MODE=preview` uses isolated
browser fixtures, including six apparel products. The checkout and service
panels identify preview mode. No purchase, reservation, payment, email or support
request is sent. Preview a successful payment or a decline from the payment panel.
The sample coupon is `WELCOME10`. Preview cart/order data is stored separately
from API-mode session identifiers. Contact and shipping fields are not persisted.

## Connecting the existing backend

Set `NEXT_PUBLIC_COMMERCE_MODE=api` and `NEXT_PUBLIC_API_URL` in `.env.local`.
The browser calls that API directly. Configure the backend's CORS origins for the
frontend URL; there is no Next.js API proxy or server-side commerce implementation.
API mode never silently falls back to preview data on an error.

`src/lib/api/backend.ts` maps the backend contract to the React view models, including
guest tokens, cart quotes, order snapshots and idempotent checkout recovery.
`scripts/test-api.mjs` exercises this transport against an isolated real FastAPI/PostgreSQL instance.

API mode is now the default. COD and sandbox card/UPI flows use the backend's order
status; redirects never confirm payment. Live card/UPI providers and external email
delivery remain backend integration work. Catalogue imagery and policies need store data.

For Auth0, use a Single Page Application client with the frontend origin in allowed
web origins and `http://localhost:3000/` (or your deployed origin) as callback/logout
URL. Set public domain, client ID and API audience variables from `.env.example`.
No client secret belongs in this frontend. Access tokens are held in memory and
sent as Bearer tokens. The backend remains responsible for authorization and all
commerce decisions.

Transactions, reservations, webhooks, refund approvals and workers remain in the backend.
Run migrations through `0010` before using the connected storefront and wishlist with an existing database. Follow the documented backup/setup procedure before migration on shared development data.
