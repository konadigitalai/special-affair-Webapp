# Special Affair frontend structure

This Next.js App Router application is the customer storefront and staff admin surface described in `Special_Affair_Architecture_v2.docx`.

## Boundaries

- `src/app/(storefront)` contains public catalog, account, cart, checkout, order, return, policy, search, and support routes.
- `src/app/admin` contains staff routes in the same deployment. Every admin API request must be authorized by the backend.
- `src/components` contains reusable presentation components grouped by experience.
- `src/features` contains domain workflows and client-side state. Domain folders may call API services, but must not access PostgreSQL directly.
- `src/lib/api/generated` is reserved for the generated TypeScript client from the FastAPI OpenAPI artifact. Do not hand-edit generated files.
- `src/lib/auth` owns Auth0 browser/server integration and role-aware session helpers.
- `src/types` contains shared UI and API contract types that are not generated.
- `public` contains static product and brand assets.

## API contract workflow

The backend publishes a versioned OpenAPI schema. The frontend client under `src/lib/api/generated` should be regenerated in CI from that schema; a generated diff is reviewed as part of the change. The browser talks to FastAPI over HTTPS and never connects directly to PostgreSQL.

## Route policy

Public catalog responses may be cached when the backend marks them cacheable. Account, cart, checkout, order, return, support, and admin responses must remain private and must not be placed in public caches.
