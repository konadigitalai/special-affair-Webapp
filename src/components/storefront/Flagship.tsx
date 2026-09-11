"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const worldPages = [
  { name: "Inner Affair", image: "/images/flagship/inner-affair-hd-v2.png", tagline: "Closest to you.", title: "The foundation of everything.", description: "Everyday essentials, reimagined. Thoughtfully designed inner layers for the first part of your day.", note: "Closer. Softer. Stronger. Yours." },
  { name: "Essential Affair", image: "/images/flagship/essential-affair-hd-v2.png", tagline: "For everyday life.", title: "A better everyday starts with the basics.", description: "Refined essentials for a more intentional everyday. Thoughtfully designed. Made to move with you.", note: "Basics for a brighter everyday." },
  { name: "Form", image: "form", tagline: "Made to move.", title: "Sculpted for what moves you.", description: "Fitted and sculpted layers for real movement. Performance shapes. Everyday strength.", note: "Movement. Shapes. Strength. Always." },
  { name: "Shell", image: "shell", tagline: "For what’s next.", title: "Protection in motion.", description: "Outer layers designed for movement, transition and what’s ahead. Technical. Considered. Essential.", note: "Layer. Move. Live. Further." },
];
export type JournalStory = { slug: string; title: string; excerpt: string; hero_url: string; category?: string };
export const campaignImage = (name: string) => `/images/flagship/${name}.webp`;
export const swatchColour = (name: string) => ({ black: "#181818", ivory: "#edeae0", white: "#f7f7f4", "warm grey": "#aaa69f", grey: "#82817e", taupe: "#a29481", "oak brown": "#79614e", "black nappa": "#252320" }[name.toLowerCase()] || "#77786a");
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100);
const featuredPackshots: Record<string, string> = {
  "Core Bra": "/images/flagship/core-bra.webp",
  "Move Legging": "/images/flagship/move-legging.webp",
  "Essential Tee": "/images/flagship/essential-tee-packshot-hd-v2.png",
  "Active Short": "/images/flagship/active-short-packshot-hd-v2.png",
  "The Hoodie": "/images/flagship/hoodie-packshot-hd-v2.png",
  "Relaxed Pant": "/images/flagship/relaxed-pant-packshot-hd-v2.png",
  "Balance Bra": "/images/flagship/balance-bra-packshot-hd-v2.png",
  "Move Jacket": "/images/flagship/move-jacket-packshot-hd-v2.png",
  "Lift Tank": "/images/flagship/lift-tank-packshot-hd-v2.png",
  "Everyday Sweat": "/images/flagship/everyday-sweat-packshot-hd-v2.png",
  "Core Cap": "/images/flagship/core-cap-packshot-hd-v2.png",
  "Daily Socks (2 Pack)": "/images/flagship/daily-socks-packshot-hd-v2.png",
};
const listingBadges: Record<string, string> = {
  "Core Bra": "NEW",
  "Move Legging": "NEW",
  "Essential Tee": "NEW",
  "The Hoodie": "NEW",
  "Balance Bra": "BESTSELLER",
  "Daily Socks (2 Pack)": "NEW",
};

export function CampaignPhoto({ name, alt, priority = false, className = "" }: { name: string; alt: string; priority?: boolean; className?: string }) {
  return <div className={`campaign-photo ${className}`}><Image src={name.startsWith("/") || name.startsWith("http") ? name : campaignImage(name)} alt={alt} fill sizes={priority ? "100vw" : "(max-width: 700px) 100vw, 70vw"} priority={priority} unoptimized={priority} /></div>;
}

function CampaignVideo({ paused }: { paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (paused || preference.matches) video.pause();
      else void video.play().catch(() => undefined);
    };
    syncPlayback();
    preference.addEventListener("change", syncPlayback);
    return () => preference.removeEventListener("change", syncPlayback);
  }, [paused]);

  return <div className="campaign-photo campaign-video">
    <Image className="campaign-video-poster" src="/images/flagship/first-affair-hero-hd-v2.png" alt="Athlete overlooking an Indian city at sunrise" fill sizes="100vw" priority unoptimized />
    <video ref={videoRef} className={ready ? "is-ready" : ""} autoPlay loop muted playsInline preload="metadata" poster="/images/flagship/first-affair-hero-hd-v2.png" onCanPlay={() => setReady(true)} onError={() => setReady(false)} aria-hidden="true">
      <source src="/videos/first-affair-loop-v2.webm" type="video/webm" />
      Your browser does not support background video.
    </video>
  </div>;
}

export function ProductCard({ item, products, onProduct, saved, onSave, compact = false, listing = false, imageOverride, onQuickAdd, quickAddDisabled = false }: { item: StoreProduct; products: StoreProduct[]; onProduct: (item: StoreProduct) => void; saved: boolean; onSave: (item: StoreProduct) => void; compact?: boolean; listing?: boolean; imageOverride?: string; onQuickAdd?: (item: StoreProduct) => void; quickAddDisabled?: boolean }) {
  const colours = products.filter((p, i, all) => p.product_id === item.product_id && all.findIndex(a => a.product_id === p.product_id && a.colour === p.colour) === i);
  const primaryImage = imageOverride || (listing ? featuredPackshots[item.name] : undefined) || item.media[0]?.url;
  return <article className={`flagship-product ${compact ? "compact" : ""} ${listing ? "listing-card" : ""}`}>
    <button className={`product-image-link ${imageOverride ? "has-packshot" : ""}`} onClick={() => onProduct(item)} aria-label={`View ${item.name} in ${item.colour}`}>
      {primaryImage ? <Image src={primaryImage} alt={`${item.name}, ${item.colour}`} fill unoptimized={!imageOverride} sizes="(max-width: 700px) 50vw, 25vw" /> : <span>Image coming soon</span>}
      {!imageOverride && item.media[1]?.url && <Image className="alternate-product-image" src={item.media[1].url} alt="" fill unoptimized sizes="(max-width: 700px) 50vw, 25vw" />}
      {!compact && !listing && <span className="card-world">{item.category}</span>}
      {listing && listingBadges[item.name] && <span className="product-badge">{listingBadges[item.name]}</span>}
      {listing && <span className="product-monogram" aria-hidden="true">Sa</span>}
    </button>
    {!listing && <button className="save-piece" onClick={() => onSave(item)} aria-label={`${saved ? "Remove" : "Save"} ${item.name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved}>{saved ? "♥" : "♡"}</button>}
    <div className="flagship-product-copy">{listing && <span className="card-world">{item.category}</span>}<button onClick={() => onProduct(item)}>{item.name}</button><span>{money(item.price_minor)}</span></div>
    <div className="card-actions"><div className="card-swatches">{colours.map(p => <button key={p.id} title={p.colour} aria-label={`View ${item.name} in ${p.colour}`} onClick={() => onProduct(p)} style={{ backgroundColor: swatchColour(p.colour) }} />)}</div><button className="quick-add" disabled={quickAddDisabled} onClick={() => onQuickAdd ? onQuickAdd(item) : onProduct(item)} aria-label={onQuickAdd ? `Quick add ${item.name} to bag` : `Choose size for ${item.name}`}>+</button></div>
  </article>;
}

type Props = {
  view: string; navigate: (view: string) => void; products: StoreProduct[]; ready: boolean; busy: boolean;
  count: number; onProduct: (p: StoreProduct) => void; onPanel: (p: "bag" | "search" | "account" | "support" | "help" | "wishlist") => void;
  onStory: (title: string, slug?: string) => void; stories: JournalStory[]; newsletter: (email: string) => void;
  wishlist: string[]; onSave: (p: StoreProduct) => void; onQuickAdd: (p: StoreProduct) => void; announcement: string; children?: ReactNode;
};

export default function Flagship(props: Props) {
  const { view, navigate, products, ready, busy, count, onProduct, onPanel, onStory, stories, newsletter, wishlist, onSave, onQuickAdd } = props;
  const [menu, setMenu] = useState(false);
  const [shopMenu, setShopMenu] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState("Featured");
  const [catalogView, setCatalogView] = useState<"grid" | "list">("grid");
  const [priceCap, setPriceCap] = useState(1500000);
  const [journalFilter, setJournalFilter] = useState("All");
  const [paused, setPaused] = useState(false);
  const [filmEngaged, setFilmEngaged] = useState(false);
  const home = view === "House";
  const journal = view === "Journal";
  const about = view === "About";
  const shopListing = view === "Shop" || view === "New";
  const world = worldPages.find(w => w.name === view);
  const go = (next: string) => { navigate(next); setMenu(false); setShopMenu(false); setFilters({}); setPriceCap(1500000); };
  const select = (key: string, value: string) => setFilters(current => {
    const selected = current[key] || [];
    return { ...current, [key]: selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value] };
  });
  const selected = (key: string, value: string) => (filters[key] || []).includes(value);
  const unique = (rows: StoreProduct[]) => rows.filter((p, i) => rows.findIndex(a => a.product_id === p.product_id) === i);
  const catalogOrder = ["Core Bra", "Move Legging", "Essential Tee", "Active Short", "The Hoodie", "Relaxed Pant", "Balance Bra", "Move Jacket", "Lift Tank", "Everyday Sweat", "Core Cap", "Daily Socks (2 Pack)"];
  const filtered = unique(products.filter(p =>
    (!world || p.category === world.name) &&
    (!(filters.World || []).length || filters.World.includes(p.category)) &&
    (!(filters.Category || []).length || filters.Category.some(category => p.categories?.includes(category))) &&
    (!(filters.Gender || []).length || filters.Gender.some(gender => p.categories?.includes(gender))) &&
    (!(filters.Size || []).length || (!!p.size && filters.Size.includes(p.size))) &&
    (!(filters.Colour || []).length || filters.Colour.includes(p.colour)) &&
    p.price_minor <= priceCap
  )).sort((a, b) => sort === "Price: low to high" ? a.price_minor - b.price_minor : sort === "Price: high to low" ? b.price_minor - a.price_minor : catalogOrder.indexOf(a.name) - catalogOrder.indexOf(b.name));
  const featuredOrder = catalogOrder.slice(0, 6);
  const featured = products.filter((p, i) => p.development_sample && featuredOrder.includes(p.name) && products.findIndex(v => v.product_id === p.product_id) === i).sort((a, b) => featuredOrder.indexOf(a.name) - featuredOrder.indexOf(b.name));
  const storyOrder = ["a-different-kind-of-movement", "material-matters", "the-first-affair", "people-in-motion"];
  const homeStories = [...stories].sort((a, b) => (storyOrder.includes(a.slug) ? storyOrder.indexOf(a.slug) : 99) - (storyOrder.includes(b.slug) ? storyOrder.indexOf(b.slug) : 99)).slice(0, 4);
  const cards = (rows: StoreProduct[], compact = false, listing = false) => rows.map(p => <ProductCard key={p.id} item={p} products={products} onProduct={onProduct} saved={wishlist.some(id => products.some(v => v.id === id && v.product_id === p.product_id))} onSave={onSave} compact={compact} listing={listing} imageOverride={compact ? featuredPackshots[p.name] : undefined} onQuickAdd={listing ? onQuickAdd : undefined} quickAddDisabled={busy || !ready || p.available < 1} />);
  const worlds = (small = false) => <div className={`four-worlds ${small ? "small-worlds" : ""}`}>{worldPages.map(w => <button key={w.name} onClick={() => go(w.name)} className="image-story"><CampaignPhoto name={w.image} alt={`${w.name} campaign`} /><div><h3>{w.name}</h3><p>{w.tagline}</p><span className="underlined-link">Explore <span>→</span></span></div></button>)}</div>;
  const materialPanels = (homepage = false) => <div className={`material-panels ${homepage ? "home-material-panels" : ""}`}><button className="image-story" onClick={() => onStory("Material Matters", "material-matters")}><CampaignPhoto name="material" alt="Close-up of black ribbed fabric" /><div><h2>In the details,<br />a difference.</h2><p>Considered fabrics. Thoughtful construction.<br />Made to be a part of your life.</p><span className="underlined-link">Our materials →</span></div></button><button className="image-story centered-story" onClick={() => onStory("A Closer Look", "a-closer-look")}><CampaignPhoto name={homepage ? "/images/flagship/movement-film-hd-v2.png" : world?.image || "form"} alt="A study in movement" /><div><span className="circle-arrow">▶</span><h3>A CLOSER LOOK</h3><span className="tiny-label">{homepage ? "FILM 01: MOVEMENT" : "A STUDY IN MOVEMENT"}</span></div></button></div>;
  return <>
    <div className="announcement"><span aria-hidden="true">‹</span><span>{props.announcement || "CRAFTED FOR EVERY AFFAIR"}</span><span aria-hidden="true">›</span><small>INDIA (INR)</small></div>
    <header className="flagship-header"><button className="brand" aria-label="Special Affair home" onClick={() => go("House")}>Special Affair</button>
      <nav className="flagship-nav" aria-label="Main navigation"><button aria-expanded={shopMenu} onClick={() => setShopMenu(!shopMenu)}>Shop</button>{["New", "Journal", "About"].map(n => <button className={view === n ? "active" : ""} key={n} onClick={() => go(n)}>{n}</button>)}</nav>
      <nav className="flagship-utilities" aria-label="Your account and bag"><button aria-label="Search" onClick={() => onPanel("search")}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><span className="utility-label">Search</span></button><button className="desktop-account" onClick={() => onPanel("help")}>AI Help</button><button className="desktop-account" onClick={() => onPanel("account")}>Account</button><button onClick={() => onPanel("bag")}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8h14l1 13H4L5 8Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg> Bag ({count})</button><button className="menu-trigger" aria-label={menu ? "Close navigation" : "Open navigation"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? "×" : "☰"}</button></nav>
      {shopMenu && <div className="shop-menu"><button onClick={() => go("Shop")}>Shop all</button>{worldPages.map(w => <button key={w.name} onClick={() => go(w.name)}>{w.name}</button>)}<button onClick={() => onPanel("wishlist")}>Wishlist</button></div>}
      {menu && <div className="mobile-navigation"><button className="mobile-account" onClick={() => { onPanel("account"); setMenu(false); }}>Hello<br /><small>Sign in or create account →</small></button>{["Shop", "New", "Journal", "About"].map(n => <button key={n} onClick={() => go(n)}>{n}</button>)}<details><summary>The four worlds</summary>{worldPages.map(w => <button key={w.name} onClick={() => go(w.name)}>{w.name}</button>)}</details><button onClick={() => { onPanel("wishlist"); setMenu(false); }}>♡ Wishlist</button><button onClick={() => { onPanel("search"); setMenu(false); }}>⌕ Search</button><small>India (INR)</small></div>}
    </header>
    <main id="main-content" className="flagship-main" key={view}>
      <section className={`campaign-hero ${home ? "home-hero" : ""} ${shopListing ? "shop-listing-hero" : ""} ${paused ? "paused" : ""}`}>
        {home ? <CampaignVideo paused={paused} /> : <CampaignPhoto name={shopListing ? "/images/flagship/movement-film-hd-v2.png" : world?.image || "first-affair"} alt={shopListing ? "Athlete in a black racerback top after movement" : world ? `${world.name} editorial campaign` : "Special Affair editorial campaign"} priority />}
        <div className="campaign-shade" /><div className="campaign-copy"><span className="tiny-label">{home ? "A HIGHER STANDARD OF EVERYDAY" : journal ? "JOURNAL" : about ? "OUR WORLD" : world ? "COLLECTION" : "SHOP"}</span><h1>{home ? "FIRST AFFAIR" : journal ? <>Stories for<br />a more intentional life.</> : about ? <>From the first<br />layer outward.</> : world?.name || (view === "New" ? "New arrivals" : "Shop All")}</h1>
          {(!journal && !about) && <p className="campaign-tagline">{home ? "Crafted for every affair." : world?.tagline || "Movement lives here."}</p>}
          {!home && <p className="campaign-description">{journal ? "Movement. Material. People. Places." : about ? "A contemporary lifestyle house for movement, intimacy and everyday life." : world?.description || "Apparel for every affair. Thoughtfully designed for your everyday and what’s next."}</p>}
          {!journal && !shopListing && <button className="underlined-link" onClick={() => home ? go("New") : document.getElementById(about ? "philosophy" : "collection")?.scrollIntoView({ behavior: "smooth" })}>{home ? "Discover the drop" : about ? "Our philosophy" : "Explore the collection"} <span>→</span></button>}
        </div><p className="campaign-note">{shopListing ? "A more\nconscious\ntomorrow." : world?.note || "Movement\nPeople\nA brighter you"}</p>
        {shopListing && <><div className="shop-hero-pager" aria-label="Campaign frame 1 of 3"><strong>01</strong><span>02</span><span>03</span></div><span className="shop-garment-mark" aria-hidden="true">Sa</span></>}
        {home && <span className="hero-garment-mark" aria-hidden="true">Sa</span>}
        {home && <div className="campaign-film-control"><button className="campaign-play" aria-pressed={filmEngaged && !paused} onClick={() => { if (!filmEngaged) { setFilmEngaged(true); setPaused(false); } else setPaused(!paused); }} aria-label={!filmEngaged || paused ? "Play campaign film" : "Pause campaign film"}><span aria-hidden="true">{!filmEngaged || paused ? "▶" : "Ⅱ"}</span></button><span>{!filmEngaged || paused ? "PLAY FILM" : "PAUSE FILM"}</span></div>}
      </section>
      {(home || about || world) && <section className="house-statement" id="philosophy"><div><span className="tiny-label">{world ? `THE ${world.name.toUpperCase()} COLLECTION` : "THE HOUSE"}</span><h2>{world?.title || "From the first layer outward."}</h2></div><div><p>{world?.description || "Special Affair is a contemporary lifestyle house for movement, intimacy and everyday life. Thoughtfully designed pieces that feel effortless, refined and real."}</p><button className="underlined-link" onClick={() => onStory("Our Philosophy", "our-philosophy")}>Our philosophy →</button></div>{home && <span className="statement-motto">LAYER.<br />MOVE.<br />LIVE.<br />BELONG.</span>}</section>}
      {home && <section className="worlds-section"><div className="section-intro"><span className="tiny-label">THE FOUR WORLDS</span><p>Different layers. One considered life.</p></div>{worlds()}</section>}
      {home ? <>
        <section className="featured-section"><div className="flagship-section-title"><div><span className="tiny-label">FEATURED</span><h2>Selected for now.</h2></div><button className="underlined-link" onClick={() => go("Shop")}>View all →</button></div><div className="featured-grid">{cards(featured.length ? featured : unique(products).slice(0, 6), true)}</div>{!ready && <p className="empty-state">Loading the collection…</p>}</section>
        {materialPanels(true)}
        <section className="layering-section"><div className="flagship-section-title"><div><h2>Complete the affair.</h2><p>Layer. Move. Live.</p></div><button className="underlined-link" onClick={() => go("Shop")}>Explore the looks →</button></div>{worlds(true)}</section>
        <section className="home-journal"><div className="flagship-section-title"><div><h2>Our world.</h2><p>Stories, people and the process behind Special Affair.</p></div><button className="underlined-link" onClick={() => go("Journal")}>Explore journal →</button></div><div className="journal-rail">{homeStories.map((s, index) => <button className={`image-story journal-story-${index + 1}`} key={s.slug} onClick={() => onStory(s.title, s.slug)}><CampaignPhoto name={s.hero_url || "material"} alt={s.title} /><div><span className="tiny-label">{s.category || "THE HOUSE"}</span><h3>{s.title}</h3><span>Read the story →</span></div></button>)}</div></section>
      </> : journal ? <section className="journal-page"><nav className="journal-filters" aria-label="Journal categories">{["All", "Movement", "Material", "People", "Places", "Culture"].map(c => <button key={c} aria-pressed={journalFilter === c} onClick={() => setJournalFilter(c)}>{c}</button>)}</nav><div className="journal-grid">{stories.filter(s => journalFilter === "All" || s.category === journalFilter).map(s => <button className="journal-card" key={s.slug} onClick={() => onStory(s.title, s.slug)}><CampaignPhoto name={s.hero_url || "material"} alt={s.title} /><span className="tiny-label">{s.category || "THE HOUSE"}</span><h2>{s.title}</h2><p>{s.excerpt}</p><span className="underlined-link">Read the story →</span></button>)}</div></section> : about ? <><div className="about-stories"><button className="image-story" onClick={() => onStory("Material Matters", "material-matters")}><CampaignPhoto name="material" alt="Tactile black fabric" /><div><h2>Considered.<br />Inside and out.</h2><span className="underlined-link">Our materials →</span></div></button><div><span className="tiny-label">OUR PHILOSOPHY</span><h2>A more intentional you.</h2><p>Different layers. A fuller life. Explore the four worlds that define Special Affair.</p><button className="underlined-link" onClick={() => go("Journal")}>Explore our world →</button></div></div>{worlds()}</> : <>
        <section id="collection" className={`flagship-catalog ${world ? "world-catalog" : ""}`}>
          <div className="catalog-tools">
            <button className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Filter {filtersOpen ? "−" : "+"}</button>
            <span>{filtered.length} PRODUCTS</span>
            <div className="catalog-tool-actions">
              <label>Sort by:<select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}>{["Featured", "Newest", "Price: low to high", "Price: high to low"].map(s => <option key={s}>{s}</option>)}</select></label>
              <div className="catalog-view-buttons" aria-label="Product display">
                <button aria-label="Grid view" aria-pressed={catalogView === "grid"} onClick={() => setCatalogView("grid")}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h5v5H1zM10 1h5v5h-5zM1 10h5v5H1zM10 10h5v5h-5z" /></svg></button>
                <button aria-label="List view" aria-pressed={catalogView === "list"} onClick={() => setCatalogView("list")}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2h3v3H1zM6 2h9v1H6zM1 7h3v3H1zM6 8h9v1H6zM1 12h3v3H1zM6 13h9v1H6z" /></svg></button>
              </div>
            </div>
          </div>
          <div className="catalog-body">
          <aside className={`catalog-filters ${filtersOpen ? "filters-open" : ""}`}>
            <div className="filter-heading"><span>FILTER BY</span><button onClick={() => { setFilters({}); setPriceCap(1500000); }}>Reset all</button></div>
            <details open><summary>Category</summary><div className="filter-options">
              <label><input type="checkbox" checked={!(filters.Category || []).length} onChange={() => setFilters(current => ({ ...current, Category: [] }))} />All</label>
              {["Tops", "Bottoms", "Sports Bras", "Outerwear", "Accessories"].map(option => <label key={option}><input type="checkbox" checked={selected("Category", option)} onChange={() => select("Category", option)} />{option}</label>)}
            </div></details>
            <details open><summary>World</summary><div className="filter-options">{worldPages.map(option => <label key={option.name}><input type="checkbox" checked={selected("World", option.name)} onChange={() => select("World", option.name)} />{option.name}</label>)}</div></details>
            <details open><summary>Gender</summary><div className="filter-options">{["Women", "Men", "Unisex"].map(option => <label key={option}><input type="checkbox" checked={selected("Gender", option)} onChange={() => select("Gender", option)} />{option}</label>)}</div></details>
            <details open><summary>Size</summary><div className="filter-sizes">{["XS", "S", "M", "L", "XL", "XXL"].map(option => <button key={option} aria-pressed={selected("Size", option)} onClick={() => select("Size", option)}>{option}</button>)}</div></details>
            <details open><summary>Color</summary><div className="filter-colours">{["Black", "White", "Ivory", "Warm Grey", "Taupe", "Navy", "Oak Brown"].map(option => <button key={option} title={option} aria-label={`Filter by ${option}`} aria-pressed={selected("Colour", option)} onClick={() => select("Colour", option)} style={{ backgroundColor: swatchColour(option) }} />)}</div></details>
            <details open><summary>Price (INR)</summary><div className="filter-price"><span>₹0</span><span>{money(priceCap)}</span><input aria-label="Maximum price" type="range" min="0" max="1500000" step="10000" value={priceCap} onChange={event => setPriceCap(Number(event.target.value))} /></div></details>
          </aside>
          <div><div className={`flagship-product-grid ${catalogView === "list" ? "catalog-list-view" : ""}`}>{cards(filtered, false, true)}</div>{!filtered.length && <div className="empty-state"><p>{ready ? "No pieces match this selection." : "Loading the collection…"}</p><button className="underlined-link" onClick={() => { setFilters({}); setPriceCap(1500000); }}>Reset filters</button></div>}</div>
        </div></section>{world && <>{materialPanels()}<section className="layering-section"><div className="flagship-section-title"><h2>More to explore.</h2><button className="underlined-link" onClick={() => go("Shop")}>Explore all collections →</button></div>{worlds(true)}</section></>}
      </>}
    </main>
    <footer className="flagship-footer"><div className="newsletter-bar"><div><h3>Join the affair.</h3><p>Be the first to know about new drops, stories and events.</p></div><form onSubmit={e => { e.preventDefault(); newsletter(String(new FormData(e.currentTarget).get("email"))); }}><label className="sr-only" htmlFor="flagship-email">Your email</label><input id="flagship-email" name="email" placeholder="Your email" type="email" required /><button aria-label="Subscribe to newsletter" disabled={!ready || busy}>→</button></form>{home ? <div className="newsletter-socials" aria-label="Social channels"><span title="Instagram">◎</span><span title="YouTube">▶</span><span title="Pinterest">p</span></div> : (shopListing || world) ? <div className="newsletter-links" aria-label="Social channels"><span>INSTAGRAM</span><span>YOUTUBE</span><span>PINTEREST</span></div> : <div className="newsletter-links"><button onClick={() => go("Journal")}>JOURNAL</button><button onClick={() => onPanel("support")}>CONTACT</button></div>}</div><div className="flagship-footer-bottom"><button className="brand" onClick={() => go("House")}>Special Affair</button><nav aria-label="Footer navigation">{["Shop", "Journal", "About"].map(n => <button key={n} onClick={() => go(n)}>{n}</button>)}<button onClick={() => onPanel("support")}>Help</button></nav><div><span>INDIA (INR)</span><button onClick={() => onStory("Privacy")}>Privacy</button><button onClick={() => onStory("Terms")}>Terms</button><span>© 2026 SPECIAL AFFAIR</span></div><span className="sa-seal" aria-label="SA monogram">Sa</span></div></footer>
  </>;
}
