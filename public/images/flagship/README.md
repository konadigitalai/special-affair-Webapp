# Original flagship photography

Eighteen original images were generated for the client mockup implementation. The first delivery set is optimized as WebP with source PNGs in `originals/`; the client-reference additions remain as measured HD PNGs. `prompts.json` records every prompt and actual pixel dimensions. No image was upscaled to claim a larger source resolution.

- `first-affair`, `inner-affair`, `essential-affair`, `form`, `shell`: homepage and collection campaigns.
- `first-affair-motion`: refined 2560 x 1440 homepage master with cleaner detail and
  extra atmospheric depth for the restrained camera, light and pointer motion.
- `material`: fabric close-up and product detail secondary image.
- `coast`: journal landscape.
- `core-bra`, `core-bra-ivory`, `move-legging`: product-specific development packshots.

The remaining development apparel uses the individually generated catalogue photographs in `../catalog/`. All images illustrate development apparel; they do not certify real garment construction, fit or fabric specifications.

The client-reference homepage uses eight additional original HD assets generated with the built-in image generation tool: `first-affair-hero-hd-v2.png`, `inner-affair-hd-v2.png`, `essential-affair-hd-v2.png`, `movement-film-hd-v2.png`, plus isolated product studies for the tee, shorts, hoodie, and relaxed pant. Their normalized production prompts and measured dimensions are recorded in `prompts.json`.

The homepage uses the silent seamless 10-second `../../videos/first-affair-loop-v2.webm` motion study derived from `first-affair-hero-hd-v2.png`; that still remains its poster and reduced-motion fallback. The final approved campaign film can replace the WebM at the same path without changing the interface.

The Inner Affair landing uses two further motion studies in `../../videos/`: `inner-affair-hero-loop.webm` (from `inner-affair.webp`) and `inner-affair-film-01.webm` (from `../catalog/world-inner-underwear.png`), each a ten-second seamless camera drift recorded from a canvas in headless Chrome. They are placeholders for the approved campaign films.
