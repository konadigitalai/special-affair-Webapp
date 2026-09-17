# Client mockup implementation

The active storefront follows the supplied `SpecialAffair web mock up! .docx`: compact navigation, a full-width First Affair campaign, two-column house statement, four collection worlds, six featured pieces, material and movement stories, layering cards, journal, newsletter and compact footer.

`Flagship.tsx` and `src/app/flagship.css` provide the shared visual system. Shop has category, world, gender, size and colour filters and price sorting. Collection, journal and about pages share the campaign treatment. `ProductDetail.tsx` is a full product page under the site header (not a dialog): breadcrumb, editorial gallery with thumbnails and zoom, real colour/size variants, size guide link, quantity, add to bag, wishlist, details/fabric/care/shipping accordions, two fabric-story panels and cross-category 'Pair it with' recommendations. The gallery combines each product's own media with the world's campaign frame and the shared material/movement studies; the star rating is illustrative and only rendered for development samples. Bag, checkout, account and service panels retain the connected commerce flows. Direct URLs and browser back/forward work for the primary shopping routes.

## Inner Affair world landing

`WorldLanding.tsx` renders the approved Inner Affair landing when `/collections/inner-affair` opens: a campaign film hero with play/pause, the "More than basics" statement, "The Collection" with Women/Men/All tabs, filter strip and sort, a materials panel with the embroidered monogram beside "Film 01: Inner Affair", the fit section with three tiles, and the "Start within." newsletter. Other worlds keep the shared collection layout until their landing content is approved.

The ten mockup products (Boxer Brief, Boxer Short, Slim Tank, Second-Skin Tee, Bralette, Brief, Boy Short, Tank, Cami Set, Sleep Set) are seeded by `scripts.seed_flagship` with three colourways and XS–XXL sizes each. No image generation was available in this pass, so the cards reuse existing studies: the boxer-brief still life, on-model tank/tee/shorts/lounge photographs, the ivory ribbed portrait and the tank packshot. Brief, Boy Short and Cami Set show the ribbed fabric study until their packshots are approved. Both films (`public/videos/inner-affair-hero-loop.webm` and `inner-affair-film-01.webm`) are ten-second motion studies rendered from the seated Inner Affair campaign still and the boxer-brief still life; approved campaign footage can replace them at the same paths.

## Essential Affair world landing

`/collections/essential-affair` uses the same `WorldLanding.tsx` system with the approved Essential Affair composition: a still campaign hero with the Sa mark and "Basics for a brighter everyday" note, the "Our essentials" statement, All / Tops / Bottoms / Essentials tabs with Sort by, two uppercase story panels ("Made to move with you." linking to the film story, "Considered in every detail." linking to materials), the "More to explore." row (Inner, Form, Shell, Journal) and the standard "Join the affair." newsletter. The ten mockup products (Oversized Tee, Washed Boxy Tee, Crop Top, Spaghetti Top, Camisole Top, Wide-Leg Sweatpant, Relaxed Short, Casual Pant, Essential Hoodie, Essential Crew) are seeded with two or three colourways each; cards reuse existing studies until their packshots are generated (prompts in `scripts/inner-affair-artwork.json`).

## Original artwork and identity

Ten original generated photographs are stored in `public/images/flagship/` as optimized WebP files, with source PNGs under `originals/`. `prompts.json` records the prompts and actual dimensions. The seven landscapes are 1672 x 941; portrait packshots are at least 1122 x 1374. Existing individually generated product photographs in `public/images/catalog/` complete the development assortment.

The client has no local approved logo, font or campaign video files. The wordmark and available serif typography approximate the reference. The hero uses animated photography with pause and reduced-motion support; it is not a video. These assets and sample garment specifications require client approval before production use.

## Connected data

API mode is the default. Eight clearly marked development apparel products have 45 real size/colour variants in the development database, alongside the original two tote variants. The seed is insertion-only and preserves existing stock and products. Development journal and information pages are marked as review content.

The wishlist now persists in PostgreSQL and uses guest ownership tokens or the authenticated customer identity. Account merge, ownership isolation and deletion on approved privacy erasure are implemented. Cart, stock, pricing, order creation, cancellation and customer services continue to use the backend.

## Verification and release boundaries

- Isolated PostgreSQL suite: 39 tests passed, two optional tests skipped.
- Connected transport checks covered wishlist persistence, real variant selection, cart reload, totals, checkout replay, COD cancellation, sandbox decline/retry, guest order access, newsletter, support and shopping help.
- CORS preflight/rate-limit regression test passed; Python type checking passed.
- Final production build, full ESLint, focused lint after the last component changes,
  and the frontend transport/preview regression checks passed.
- See `../INTEGRATION.md` for configuration and remaining release requirements.

The supplied Auth0 SPA client ID is configured locally. Auth0 currently rejects `http://localhost:3000/` with `Callback URL mismatch`; the application allowlist must be updated before a real customer login can verify the authenticated callback. Online card/UPI payments are sandbox only; the development UI offers COD and explicitly labelled sandbox options. Real delivery, email and approved store policies are separate launch configuration/content requirements.

Browser verification on the configured development database confirmed catalogue loading,
wishlist persistence after reload, Ivory/M selection, cart image and totals after reload,
COD confirmation and cancellation. The sample variant returned to 20 available units.
At a 390px mobile viewport, navigation and Ivory filtering worked without horizontal
overflow; the product page stacks gallery, purchase column, stories and pairings without horizontal overflow, with a sticky add-to-bag row.
Review screenshots are in `../design-reference/`: `desktop-final.png`,
`mobile-final.png`, `shop-desktop.png`, `product-desktop.png`,
`product-mobile-viewport.png` and `product-mobile-controls.png`.
