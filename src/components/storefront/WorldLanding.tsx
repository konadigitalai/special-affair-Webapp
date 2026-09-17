"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CampaignPhoto, CampaignVideo, ProductCard, swatchColour } from "./Flagship";

type StoryAction = { story: string; slug: string } | { view: string } | { scroll: string };
type Tile = { label: string; text: string; image: string; position?: string; action: StoryAction };
type Panel =
  | { kind: "story"; image: string; position?: string; title: string; body: string; link: string; action: StoryAction; embroidery?: boolean; uppercase?: boolean }
  | { kind: "film"; label: string; src: string; poster: string; alt: string; action: StoryAction };

export type WorldLanding = {
  kicker: string; title: string; tagline: string; description: string; note: string;
  hero: { poster: string; alt: string; film?: string; position?: string; mark?: boolean };
  statement: { kicker: string; title: string; body: string };
  collection: { title?: string; tabs: { kind: "audience" | "category"; items: string[]; initial: string }; filterStrip: boolean; sortLabel: string };
  order: string[];
  cover: Record<string, string>;
  panels: Panel[];
  fit?: { title: string; body: string; tiles: Tile[] };
  explore?: { title: string; link: string; tiles: { title: string; text: string; image: string; position?: string; action: StoryAction }[] };
  newsletter: { title: string; body: string };
};

// Approved world landings. Photography reuses existing studies until per-product campaign assets are approved (scripts/inner-affair-artwork.json).
export const worldLandings: Record<string, WorldLanding> = {
  "Inner Affair": {
    kicker: "The Inner Affair", title: "Inner Affair", tagline: "Closest to you.",
    description: "Everyday essentials, reimagined. Thoughtfully designed inner layers that feel like a second skin — intimate, refined and made for real life.",
    note: "Closer\nSofter\nStronger\nYours",
    hero: { film: "/videos/inner-affair-hero-loop.webm", poster: "/images/flagship/inner-affair.webp", alt: "Woman in a cream ribbed inner layer resting against a warm wall", position: "62% 40%" },
    statement: { kicker: "More than basics", title: "The foundation of everything.", body: "Inner Affair is a collection of essential inner layers for her and him. Designed with purpose, elevated in every detail — because what you wear underneath changes how you move through the world." },
    collection: { title: "The Collection", tabs: { kind: "audience", items: ["Women", "Men", "All"], initial: "All" }, filterStrip: true, sortLabel: "Sort" },
    order: ["Boxer Brief", "Boxer Short", "Slim Tank", "Second-Skin Tee", "Bralette", "Brief", "Boy Short", "Tank", "Cami Set", "Sleep Set", "Core Bra", "Balance Bra"],
    cover: { "Boxer Brief": "center 62%", "Boxer Short": "center 38%", "Slim Tank": "center 42%", "Second-Skin Tee": "center 44%", "Bralette": "center 40%", "Sleep Set": "center 52%", "Brief": "center", "Boy Short": "center", "Cami Set": "center" },
    panels: [
      { kind: "story", image: "material", position: "40% center", title: "Thoughtful\nin every layer.", body: "Premium fabrics. Considered construction.\nMade to be a part of your life.", link: "Our materials", action: { story: "Material Matters", slug: "material-matters" }, embroidery: true },
      { kind: "film", label: "Film 01: Inner Affair", src: "/videos/inner-affair-film-01.webm", poster: "/images/catalog/world-inner-underwear.png", alt: "Black cotton boxer briefs on warm stone", action: { story: "A Closer Look", slug: "a-closer-look" } },
    ],
    fit: {
      title: "The right fit\nfeels different.", body: "Find your size. Find your feel.",
      tiles: [
        { label: "Fabrics", text: "Made to move", image: "material", position: "30% center", action: { story: "Material Matters", slug: "material-matters" } },
        { label: "Fit", text: "Comfy, never compromising", image: "/images/flagship/inner-affair-hd-v2.png", position: "center 30%", action: { story: "Size guide", slug: "size-guide" } },
        { label: "Details", text: "Subtle by design", image: "/images/flagship/movement-film-hd-v2.png", position: "60% 45%", action: { story: "A Closer Look", slug: "a-closer-look" } },
      ],
    },
    newsletter: { title: "Start within.", body: "Be the first to know about new drops, stories and more." },
  },
  "Essential Affair": {
    kicker: "Collection", title: "Essential Affair", tagline: "Everyday, elevated.",
    description: "Refined essentials for a more intentional everyday. Thoughtfully designed. Made to move with you.",
    note: "Basics\nfor a\nbrighter\neveryday",
    hero: { poster: "/images/flagship/essential-affair.webp", alt: "Woman in an oversized ivory tee seated against a concrete wall", position: "68% 30%", mark: true },
    statement: { kicker: "Our essentials", title: "A better everyday\nstarts with the basics.", body: "Essential Affair is a curation of timeless staples — designed with intention, made for real life. Elevated fits, considered fabrics, and effortless style for wherever the day takes you." },
    collection: { tabs: { kind: "category", items: ["All", "Tops", "Bottoms", "Essentials"], initial: "All" }, filterStrip: false, sortLabel: "Sort by" },
    order: ["Oversized Tee", "Washed Boxy Tee", "Crop Top", "Spaghetti Top", "Camisole Top", "Wide-Leg Sweatpant", "Relaxed Short", "Casual Pant", "Essential Hoodie", "Essential Crew", "Essential Tee", "Everyday Sweat", "Relaxed Pant", "Daily Socks (2 Pack)"],
    cover: { "Oversized Tee": "center 40%", "Washed Boxy Tee": "center 44%", "Camisole Top": "center 42%", "Wide-Leg Sweatpant": "center 78%", "Essential Crew": "center 48%" },
    panels: [
      { kind: "story", image: "form", position: "88% 32%", title: "Made to\nmove with you.", body: "From early mornings to late nights,\nessentials that feel like you.", link: "View the film", action: { story: "A Closer Look", slug: "a-closer-look" }, uppercase: true },
      { kind: "story", image: "material", position: "55% center", title: "Considered\nin every detail.", body: "Premium fabrics. Lasting quality.\nMade for a longer tomorrow.", link: "Our materials", action: { story: "Material Matters", slug: "material-matters" }, uppercase: true },
    ],
    explore: {
      title: "More to explore.", link: "Explore all collections",
      tiles: [
        { title: "Inner", text: "For what’s close.", image: "/images/flagship/inner-affair-hd-v2.png", position: "center 30%", action: { view: "Inner Affair" } },
        { title: "Form", text: "Made to move.", image: "form", position: "68% center", action: { view: "Form" } },
        { title: "Shell", text: "For what’s next.", image: "shell", position: "68% center", action: { view: "Shell" } },
        { title: "Journal", text: "Stories in motion.", image: "coast", action: { view: "Journal" } },
      ],
    },
    newsletter: { title: "Join the affair.", body: "Be the first to know about new drops, stories and events." },
  },
};

function FilmPanel({ film }: { film: Extract<Panel, { kind: "film" }> }) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (playing) void el.play().catch(() => setPlaying(false)); else el.pause();
  }, [playing]);
  return <div className={`image-story film-panel ${playing ? "is-playing" : ""}`}>
    <CampaignPhoto name={film.poster} alt={film.alt} />
    <video ref={video} loop muted playsInline preload="metadata" poster={film.poster} aria-label={film.label} onEnded={() => setPlaying(false)}><source src={film.src} type="video/webm" /></video>
    <button className="film-panel-control" aria-pressed={playing} aria-label={playing ? `Pause ${film.label}` : `Play ${film.label}`} onClick={() => setPlaying(!playing)}>
      <span className="circle-arrow" aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      <span className="film-panel-title">A closer look</span>
      <span className="tiny-label">{film.label}</span>
    </button>
  </div>;
}

function Artwork({ image, alt = "" }: { image: string; alt?: string }) {
  return image.startsWith("/") ? <div className="campaign-photo"><Image src={image} alt={alt} fill unoptimized sizes="(max-width: 700px) 100vw, 50vw" /></div> : <CampaignPhoto name={image} alt={alt} />;
}

type Props = {
  world: { name: string; image: string }; landing: WorldLanding; products: StoreProduct[]; ready: boolean; busy: boolean;
  wishlist: string[]; onProduct: (p: StoreProduct) => void; onSave: (p: StoreProduct) => void; onQuickAdd: (p: StoreProduct) => void;
  onStory: (title: string, slug?: string) => void; go: (view: string) => void;
};

export default function WorldLanding({ world, landing, products, ready, busy, wishlist, onProduct, onSave, onQuickAdd, onStory, go }: Props) {
  const [paused, setPaused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [tab, setTab] = useState(landing.collection.tabs.initial);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("Featured");
  const [filters, setFilters] = useState<{ Category: string[]; Size: string[]; Colour: string[] }>({ Category: [], Size: [], Colour: [] });
  const toggle = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(v => v !== value) : [...current[key], value] }));
  const act = (action: StoryAction) => "story" in action ? onStory(action.story, action.slug) : "view" in action ? go(action.view) : document.getElementById(action.scroll)?.scrollIntoView({ behavior: "smooth" });
  const rank = (p: StoreProduct) => { const i = landing.order.indexOf(p.name); return i < 0 ? 99 : i; };
  const range = products.filter(p => p.category === world.name);
  const audiences = ["Women", "Men", "Unisex"];
  const categories = Array.from(new Set(range.flatMap(p => (p.categories || []).filter(c => !audiences.includes(c)))));
  const colours = Array.from(new Set(range.map(p => p.colour)));
  const tabMatches = (p: StoreProduct) => tab === "All" || (landing.collection.tabs.kind === "audience" ? (p.categories?.includes(tab) || p.categories?.includes("Unisex")) : p.categories?.includes(tab));
  const visible = range
    .filter(p => tabMatches(p) &&
      (!filters.Category.length || filters.Category.some(c => p.categories?.includes(c))) &&
      (!filters.Colour.length || filters.Colour.includes(p.colour)) &&
      (!filters.Size.length || (!!p.size && filters.Size.includes(p.size))))
    .filter((p, i, all) => all.findIndex(v => v.product_id === p.product_id) === i)
    .sort((a, b) => sort === "Price: low to high" ? a.price_minor - b.price_minor : sort === "Price: high to low" ? b.price_minor - a.price_minor : rank(a) - rank(b));
  const style = (position?: string) => ({ "--focus": position || "center" } as React.CSSProperties);

  return <div className={`world-landing landing-${world.name.toLowerCase().replaceAll(" ", "-")}`}>
    <section className={`campaign-hero landing-hero ${paused ? "paused" : ""} ${landing.hero.film ? "" : "landing-hero-still"}`} style={style(landing.hero.position)}>
      {landing.hero.film ? <CampaignVideo paused={paused} src={landing.hero.film} poster={landing.hero.poster} alt={landing.hero.alt} /> : <CampaignPhoto name={landing.hero.poster} alt={landing.hero.alt} priority />}
      <div className="campaign-shade" />
      <div className="campaign-copy">
        <span className="tiny-label">{landing.kicker}</span>
        <h1>{landing.title}</h1>
        <p className="campaign-tagline">{landing.tagline}</p>
        <p className="campaign-description">{landing.description}</p>
        <button className="underlined-link" onClick={() => act({ scroll: "collection" })}>Explore the collection <span>→</span></button>
      </div>
      {landing.hero.film && <div className="campaign-film-control"><button className="campaign-play" aria-pressed={engaged && !paused} onClick={() => { if (!engaged) { setEngaged(true); setPaused(false); } else setPaused(!paused); }} aria-label={!engaged || paused ? "Play campaign film" : "Pause campaign film"}><span aria-hidden="true">{!engaged || paused ? "▶" : "Ⅱ"}</span></button><span>{!engaged || paused ? "Play film" : "Pause film"}</span></div>}
      <p className="campaign-note">{landing.note}</p>
      {landing.hero.mark && <span className="landing-hero-mark" aria-hidden="true">Sa</span>}
    </section>

    <section className="house-statement landing-statement" id="philosophy">
      <div><span className="tiny-label">{landing.statement.kicker}</span><h2>{landing.statement.title}</h2></div>
      <div><p>{landing.statement.body}</p><button className="underlined-link" onClick={() => onStory("Our Philosophy", "our-philosophy")}>Our philosophy <span>→</span></button></div>
    </section>

    <section className="landing-collection" id="collection">
      <div className="landing-collection-head">
        <div className="landing-collection-title">{landing.collection.title && <h2>{landing.collection.title}</h2>}
          <nav className={`landing-tabs ${landing.collection.tabs.kind === "category" ? "landing-tabs-caps" : ""}`} aria-label={landing.collection.tabs.kind === "audience" ? "Audience" : "Category"}>{landing.collection.tabs.items.map(item => <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}</nav>
        </div>
        <div className="landing-tools">
          {landing.collection.filterStrip && <button className="landing-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Filter <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span></button>}
          <label className="landing-sort">{landing.collection.sortLabel} <span aria-hidden="true">⌄</span><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}>{["Featured", "Price: low to high", "Price: high to low"].map(s => <option key={s}>{s}</option>)}</select></label>
        </div>
      </div>
      {filtersOpen && <div className="landing-filters">
        <div><span className="tiny-label">Category</span><div className="landing-filter-chips">{categories.map(c => <button key={c} aria-pressed={filters.Category.includes(c)} onClick={() => toggle("Category", c)}>{c}</button>)}</div></div>
        <div><span className="tiny-label">Size</span><div className="landing-filter-chips">{["XS", "S", "M", "L", "XL", "XXL"].map(s => <button key={s} aria-pressed={filters.Size.includes(s)} onClick={() => toggle("Size", s)}>{s}</button>)}</div></div>
        <div><span className="tiny-label">Colour</span><div className="landing-filter-chips landing-filter-colours">{colours.map(c => <button key={c} title={c} aria-label={`Filter by ${c}`} aria-pressed={filters.Colour.includes(c)} onClick={() => toggle("Colour", c)} style={{ backgroundColor: swatchColour(c) }} />)}</div></div>
        <button className="landing-filter-reset" onClick={() => setFilters({ Category: [], Size: [], Colour: [] })}>Reset</button>
      </div>}
      <div className="landing-grid">{visible.map(p => <div key={p.id} className={landing.cover[p.name] ? "cover-card" : "packshot-card"} style={style(landing.cover[p.name])}><ProductCard item={p} products={products} listing onProduct={onProduct} saved={wishlist.some(id => products.some(v => v.id === id && v.product_id === p.product_id))} onSave={onSave} onQuickAdd={onQuickAdd} quickAddDisabled={busy || !ready || p.available < 1} /></div>)}</div>
      {!visible.length && <p className="empty-state">{ready ? "No pieces match this selection." : "Loading the collection…"}</p>}
    </section>

    <section className="material-panels landing-panels">
      {landing.panels.map((panel, index) => panel.kind === "film" ? <FilmPanel key={index} film={panel} /> :
        <button key={index} className={`image-story landing-story ${panel.uppercase ? "landing-story-caps" : ""}`} style={style(panel.position)} onClick={() => act(panel.action)}>
          <Artwork image={panel.image} />
          {panel.embroidery && <span className="landing-embroidery" aria-hidden="true">Sa</span>}
          <div><h2>{panel.title}</h2><p>{panel.body}</p><span className="underlined-link">{panel.link} <span>→</span></span></div>
        </button>)}
    </section>

    {landing.fit && <section className="landing-fit">
      <div className="landing-fit-copy"><h2>{landing.fit.title}</h2><p>{landing.fit.body}</p><button className="underlined-link" onClick={() => onStory("Size guide", "size-guide")}>View size guide <span>→</span></button></div>
      <div className="landing-fit-tiles">{landing.fit.tiles.map(tile => <button key={tile.label} className="image-story landing-tile" onClick={() => act(tile.action)} style={style(tile.position)}>
        <Artwork image={tile.image} />
        <div><span className="tiny-label">{tile.label}</span><span>{tile.text} <span aria-hidden="true">→</span></span></div>
      </button>)}</div>
    </section>}

    {landing.explore && <section className="landing-explore">
      <div className="flagship-section-title"><h2>{landing.explore.title}</h2><button className="underlined-link" onClick={() => go("Shop")}>{landing.explore.link} <span>→</span></button></div>
      <div className="landing-explore-tiles">{landing.explore.tiles.map(tile => <button key={tile.title} className="image-story landing-explore-tile" onClick={() => act(tile.action)} style={style(tile.position)}>
        <Artwork image={tile.image} />
        <div><h3>{tile.title}</h3><p>{tile.text}</p></div>
      </button>)}</div>
    </section>}
  </div>;
}
