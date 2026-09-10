"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const worldPages = [
  { name: "Inner Affair", image: "inner-affair", tagline: "Closest to you.", title: "The foundation of everything.", description: "Everyday essentials, reimagined. Thoughtfully designed inner layers for the first part of your day.", note: "Closer. Softer. Stronger. Yours." },
  { name: "Essential Affair", image: "essential-affair", tagline: "Everyday, elevated.", title: "A better everyday starts with the basics.", description: "Refined essentials for a more intentional everyday. Thoughtfully designed. Made to move with you.", note: "Basics for a brighter everyday." },
  { name: "Form", image: "form", tagline: "Made to move. Designed to hold.", title: "Sculpted for what moves you.", description: "Fitted and sculpted layers for real movement. Performance shapes. Everyday strength.", note: "Movement. Shapes. Strength. Always." },
  { name: "Shell", image: "shell", tagline: "For what’s next.", title: "Protection in motion.", description: "Outer layers designed for movement, transition and what’s ahead. Technical. Considered. Essential.", note: "Layer. Move. Live. Further." },
];
export type JournalStory = { slug: string; title: string; excerpt: string; hero_url: string; category?: string };
export const campaignImage = (name: string) => `/images/flagship/${name}.webp`;
export const swatchColour = (name: string) => ({ black: "#181818", ivory: "#edeae0", white: "#f7f7f4", "warm grey": "#aaa69f", grey: "#82817e", taupe: "#a29481", "oak brown": "#79614e", "black nappa": "#252320" }[name.toLowerCase()] || "#77786a");
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100);

export function CampaignPhoto({ name, alt, priority = false, className = "" }: { name: string; alt: string; priority?: boolean; className?: string }) {
  return <div className={`campaign-photo ${className}`}><Image src={name.startsWith("/") || name.startsWith("http") ? name : campaignImage(name)} alt={alt} fill sizes={priority ? "100vw" : "(max-width: 700px) 100vw, 70vw"} priority={priority} unoptimized={priority} /></div>;
}

export function ProductCard({ item, products, onProduct, saved, onSave, compact = false }: { item: StoreProduct; products: StoreProduct[]; onProduct: (item: StoreProduct) => void; saved: boolean; onSave: (item: StoreProduct) => void; compact?: boolean }) {
  const colours = products.filter((p, i, all) => p.product_id === item.product_id && all.findIndex(a => a.product_id === p.product_id && a.colour === p.colour) === i);
  return <article className={`flagship-product ${compact ? "compact" : ""}`}>
    <button className="product-image-link" onClick={() => onProduct(item)} aria-label={`View ${item.name} in ${item.colour}`}>
      {item.media[0]?.url ? <Image src={item.media[0].url} alt={`${item.name}, ${item.colour}`} fill unoptimized sizes="(max-width: 700px) 50vw, 25vw" /> : <span>Image coming soon</span>}
      {item.media[1]?.url && <Image className="alternate-product-image" src={item.media[1].url} alt="" fill unoptimized sizes="(max-width: 700px) 50vw, 25vw" />}
      {!compact && <span className="card-world">{item.category}</span>}
    </button>
    <button className="save-piece" onClick={() => onSave(item)} aria-label={`${saved ? "Remove" : "Save"} ${item.name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved}>{saved ? "♥" : "♡"}</button>
    <div className="flagship-product-copy"><button onClick={() => onProduct(item)}>{item.name}</button><span>{money(item.price_minor)}</span></div>
    <div className="card-actions"><div className="card-swatches">{colours.map(p => <button key={p.id} title={p.colour} aria-label={`View ${item.name} in ${p.colour}`} onClick={() => onProduct(p)} style={{ backgroundColor: swatchColour(p.colour) }} />)}</div><button className="quick-add" onClick={() => onProduct(item)} aria-label={`Choose size for ${item.name}`}>+</button></div>
  </article>;
}

type Props = {
  view: string; navigate: (view: string) => void; products: StoreProduct[]; ready: boolean; busy: boolean;
  count: number; onProduct: (p: StoreProduct) => void; onPanel: (p: "bag" | "search" | "account" | "support" | "help" | "wishlist") => void;
  onStory: (title: string, slug?: string) => void; stories: JournalStory[]; newsletter: (email: string) => void;
  wishlist: string[]; onSave: (p: StoreProduct) => void; announcement: string; children?: ReactNode;
};

export default function Flagship(props: Props) {
  const { view, navigate, products, ready, busy, count, onProduct, onPanel, onStory, stories, newsletter, wishlist, onSave } = props;
  const [menu, setMenu] = useState(false);
  const [shopMenu, setShopMenu] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("Featured");
  const [journalFilter, setJournalFilter] = useState("All");
  const [paused, setPaused] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const home = view === "House";
  const journal = view === "Journal";
  const about = view === "About";
  const world = worldPages.find(w => w.name === view);
  const go = (next: string) => { navigate(next); setMenu(false); setShopMenu(false); setFilters({}); };
  const select = (key: string, value: string) => setFilters(f => ({ ...f, [key]: f[key] === value ? "" : value }));
  const unique = (rows: StoreProduct[]) => rows.filter((p, i) => rows.findIndex(a => a.product_id === p.product_id && a.colour === p.colour) === i);
  const filtered = unique(products.filter(p =>
    (!world || p.category === world.name) &&
    (!filters.World || p.category === filters.World) &&
    (!filters.Category || p.categories?.includes(filters.Category)) &&
    (!filters.Gender || p.categories?.includes(filters.Gender)) &&
    (!filters.Size || p.size === filters.Size) &&
    (!filters.Colour || p.colour === filters.Colour)
  )).sort((a, b) => sort === "Price: low to high" ? a.price_minor - b.price_minor : sort === "Price: high to low" ? b.price_minor - a.price_minor : 0);
  const featuredOrder = ["Core Bra", "Move Legging", "Essential Tee", "Active Short", "The Hoodie", "Relaxed Pant"];
  const featured = products.filter((p, i) => p.development_sample && featuredOrder.includes(p.name) && products.findIndex(v => v.product_id === p.product_id) === i).sort((a, b) => featuredOrder.indexOf(a.name) - featuredOrder.indexOf(b.name));
  const storyOrder = ["a-different-kind-of-movement", "material-matters", "the-first-affair", "people-in-motion"];
  const homeStories = [...stories].sort((a, b) => (storyOrder.includes(a.slug) ? storyOrder.indexOf(a.slug) : 99) - (storyOrder.includes(b.slug) ? storyOrder.indexOf(b.slug) : 99)).slice(0, 4);
  const cards = (rows: StoreProduct[], compact = false) => rows.map(p => <ProductCard key={p.id} item={p} products={products} onProduct={onProduct} saved={wishlist.some(id => products.some(v => v.id === id && v.product_id === p.product_id))} onSave={onSave} compact={compact} />);
  const worlds = (small = false) => <div className={`four-worlds ${small ? "small-worlds" : ""}`}>{worldPages.map((w, index) => <button key={w.name} onClick={() => go(w.name)} className="image-story"><CampaignPhoto name={w.image} alt={`${w.name} campaign`} /><span className="story-index" aria-hidden="true">0{index + 1}</span><div><h3>{w.name}</h3><p>{w.tagline}</p><span className="underlined-link">Explore <span>→</span></span></div></button>)}</div>;
  const materialPanels = () => <div className="material-panels"><button className="image-story" onClick={() => onStory("Material Matters", "material-matters")}><CampaignPhoto name="material" alt="Close-up of black ribbed fabric" /><div><h2>In the details,<br />a difference.</h2><p>Considered fabrics. Thoughtful construction.<br />Made to be a part of your life.</p><span className="underlined-link">Our materials →</span></div></button><button className="image-story centered-story" onClick={() => onStory("A Closer Look", "a-closer-look")}><CampaignPhoto name={world?.image || "form"} alt="A study in movement" /><div><span className="circle-arrow">↗</span><h3>A CLOSER LOOK</h3><span className="tiny-label">A STUDY IN MOVEMENT</span></div></button></div>;
  useEffect(() => {
    const hero = heroRef.current;
    if (!home || paused || !hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pointerFrame = 0;
    let scrollFrame = 0;
    const setMotion = (pointerX = 0, pointerY = 0) => {
      const scroll = Math.min(window.scrollY / Math.max(hero.offsetHeight, 1), 1);
      hero.style.setProperty("--hero-image-x", `${pointerX * -10}px`);
      hero.style.setProperty("--hero-image-y", `${pointerY * -6 - scroll * 12}px`);
      hero.style.setProperty("--hero-copy-x", `${pointerX * 3}px`);
      hero.style.setProperty("--hero-copy-y", `${pointerY * 2 - scroll * 15}px`);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        setMotion((event.clientX - bounds.left) / bounds.width - 0.5, (event.clientY - bounds.top) / bounds.height - 0.5);
      });
    };
    const onPointerLeave = () => setMotion();
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => { setMotion(); scrollFrame = 0; });
    };
    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(pointerFrame);
      cancelAnimationFrame(scrollFrame);
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [home, paused]);
  return <>
    <div className="announcement"><span aria-hidden="true">‹</span><span>{props.announcement || "CRAFTED FOR EVERY AFFAIR"}</span><span aria-hidden="true">›</span><small>INDIA (INR)</small></div>
    <header className="flagship-header"><button className="brand" aria-label="Special Affair home" onClick={() => go("House")}>Special Affair</button>
      <nav className="flagship-nav" aria-label="Main navigation"><button aria-expanded={shopMenu} onClick={() => setShopMenu(!shopMenu)}>Shop</button>{["New", "Journal", "About"].map(n => <button className={view === n ? "active" : ""} key={n} onClick={() => go(n)}>{n}</button>)}</nav>
      <nav className="flagship-utilities" aria-label="Your account and bag"><button aria-label="Search" onClick={() => onPanel("search")}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><span className="utility-label">Search</span></button><button className="desktop-account" onClick={() => onPanel("account")}>Account</button><button onClick={() => onPanel("bag")}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8h14l1 13H4L5 8Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg> Bag ({count})</button><button className="menu-trigger" aria-label={menu ? "Close navigation" : "Open navigation"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? "×" : "☰"}</button></nav>
      {shopMenu && <div className="shop-menu"><button onClick={() => go("Shop")}>Shop all</button>{worldPages.map(w => <button key={w.name} onClick={() => go(w.name)}>{w.name}</button>)}<button onClick={() => onPanel("wishlist")}>Wishlist</button></div>}
      {menu && <div className="mobile-navigation"><button className="mobile-account" onClick={() => { onPanel("account"); setMenu(false); }}>Hello<br /><small>Sign in or create account →</small></button>{["Shop", "New", "Journal", "About"].map(n => <button key={n} onClick={() => go(n)}>{n}</button>)}<details><summary>The four worlds</summary>{worldPages.map(w => <button key={w.name} onClick={() => go(w.name)}>{w.name}</button>)}</details><button onClick={() => { onPanel("wishlist"); setMenu(false); }}>♡ Wishlist</button><button onClick={() => { onPanel("search"); setMenu(false); }}>⌕ Search</button><small>India (INR)</small></div>}
    </header>
    <main id="main-content">
      <section ref={heroRef} className={`campaign-hero ${home ? "home-hero" : ""} ${paused ? "paused" : ""}`}>
        <CampaignPhoto name={world?.image || (home ? "first-affair-motion" : "first-affair")} alt={world ? `${world.name} editorial campaign` : "Athlete overlooking a coastal city at sunrise"} priority />
        <div className="campaign-shade" /><div className="campaign-copy"><span className="tiny-label">{home ? "A HIGHER STANDARD OF EVERYDAY" : journal ? "JOURNAL" : about ? "OUR WORLD" : world ? "COLLECTION" : "SHOP"}</span><h1>{home ? "FIRST AFFAIR" : journal ? <>Stories for<br />a more intentional life.</> : about ? <>From the first<br />layer outward.</> : world?.name || (view === "New" ? "New arrivals" : "Shop All")}</h1>
          {(!journal && !about) && <p className="campaign-tagline">{home ? "Crafted for every affair." : world?.tagline || "Movement lives here."}</p>}
          {!home && <p className="campaign-description">{journal ? "Movement. Material. People. Places." : about ? "A contemporary lifestyle house for movement, intimacy and everyday life." : world?.description || "Apparel for every affair. Thoughtfully designed for your everyday and what’s next."}</p>}
          {!journal && <button className="underlined-link" onClick={() => home ? go("New") : document.getElementById(about ? "philosophy" : "collection")?.scrollIntoView({ behavior: "smooth" })}>{home ? "Discover the drop" : about ? "Our philosophy" : "Explore the collection"} <span>→</span></button>}
        </div><p className="campaign-note">{world?.note || "Movement\nPeople\nA brighter you"}</p>
        {home && <div className="hero-meta" aria-hidden="true"><span>FIRST COLLECTION</span><span>01 / 04</span><span>HYDERABAD · INDIA</span></div>}
        {home && <button className="campaign-pause" aria-pressed={paused} onClick={() => setPaused(!paused)} aria-label={paused ? "Play campaign motion" : "Pause campaign motion"}>{paused ? "▷" : "Ⅱ"}</button>}
      </section>
      {(home || about || world) && <section className="house-statement" id="philosophy"><div><span className="tiny-label">{world ? `THE ${world.name.toUpperCase()} COLLECTION` : "THE HOUSE"}</span><h2>{world?.title || "From the first layer outward."}</h2></div><div><p>{world?.description || "Special Affair is a contemporary lifestyle house for movement, intimacy and everyday life. Thoughtfully designed pieces that feel effortless, refined and real."}</p><button className="underlined-link" onClick={() => onStory("Our Philosophy", "our-philosophy")}>Our philosophy →</button></div>{home && <span className="statement-motto">LAYER.<br />MOVE.<br />LIVE.<br />BELONG.</span>}</section>}
      {home && <section className="worlds-section"><div className="section-intro"><span className="tiny-label">THE FOUR WORLDS</span><p>Different layers. One considered life.</p></div>{worlds()}</section>}
      {home ? <>
        <section className="featured-section"><div className="flagship-section-title"><div><span className="tiny-label">01 · THE FIRST EDIT</span><h2>Selected for now.</h2><p>Essential pieces for movement, recovery and everything between.</p></div><button className="underlined-link" onClick={() => go("Shop")}>Shop the edit →</button></div><div className="featured-grid">{cards(featured.length ? featured : unique(products).slice(0, 6), true)}</div>{!ready && <p className="empty-state">Loading the collection…</p>}</section>
        <section className="house-codes" aria-label="Special Affair values"><span>Designed for movement</span><span>Built for every day</span><span>Considered in every detail</span><span>Made to belong</span></section>
        {materialPanels()}
        <section className="layering-section"><div className="flagship-section-title"><div><span className="tiny-label">02 · THE ART OF LAYERING</span><h2>Complete the affair.</h2><p>Layer. Move. Live.</p></div><button className="underlined-link" onClick={() => go("Shop")}>Explore the looks →</button></div>{worlds(true)}</section>
        <section className="home-journal"><div className="flagship-section-title"><div><span className="tiny-label">03 · JOURNAL</span><h2>Our world.</h2><p>Stories, people and the process behind Special Affair.</p></div><button className="underlined-link" onClick={() => go("Journal")}>Explore journal →</button></div><div className="journal-rail">{homeStories.map((s, index) => <button className={`image-story journal-story-${index + 1}`} key={s.slug} onClick={() => onStory(s.title, s.slug)}><CampaignPhoto name={s.hero_url || "material"} alt={s.title} /><div><span className="tiny-label">{s.category || "THE HOUSE"}</span><h3>{s.title}</h3><span>Read the story →</span></div></button>)}</div></section>
      </> : journal ? <section className="journal-page"><nav className="journal-filters" aria-label="Journal categories">{["All", "Movement", "Material", "People", "Places", "Culture"].map(c => <button key={c} aria-pressed={journalFilter === c} onClick={() => setJournalFilter(c)}>{c}</button>)}</nav><div className="journal-grid">{stories.filter(s => journalFilter === "All" || s.category === journalFilter).map(s => <button className="journal-card" key={s.slug} onClick={() => onStory(s.title, s.slug)}><CampaignPhoto name={s.hero_url || "material"} alt={s.title} /><span className="tiny-label">{s.category || "THE HOUSE"}</span><h2>{s.title}</h2><p>{s.excerpt}</p><span className="underlined-link">Read the story →</span></button>)}</div></section> : about ? <><div className="about-stories"><button className="image-story" onClick={() => onStory("Material Matters", "material-matters")}><CampaignPhoto name="material" alt="Tactile black fabric" /><div><h2>Considered.<br />Inside and out.</h2><span className="underlined-link">Our materials →</span></div></button><div><span className="tiny-label">OUR PHILOSOPHY</span><h2>A more intentional you.</h2><p>Different layers. A fuller life. Explore the four worlds that define Special Affair.</p><button className="underlined-link" onClick={() => go("Journal")}>Explore our world →</button></div></div>{worlds()}</> : <>
        <section id="collection" className={`flagship-catalog ${world ? "world-catalog" : ""}`}><div className="catalog-tools"><button className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Filter {filtersOpen ? "−" : "+"}</button><span>{filtered.length} PRODUCTS</span><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}>{["Featured", "Price: low to high", "Price: high to low"].map(s => <option key={s}>{s}</option>)}</select></label></div><div className="catalog-body">
          <aside className={`catalog-filters ${filtersOpen ? "filters-open" : ""}`}><div className="filter-heading"><span>FILTER BY</span><button onClick={() => setFilters({})}>Reset all</button></div>{Object.entries({ Category: [...new Set(products.flatMap(p => p.categories || []).filter(c => !["Women", "Men", "Unisex"].includes(c)))], World: worldPages.map(w => w.name), Gender: ["Women", "Men", "Unisex"], Size: [...new Set(products.map(p => p.size).filter((s): s is string => !!s))], Colour: [...new Set(products.map(p => p.colour))] }).map(([label, options]) => <details open key={label}><summary>{label}</summary><div className={label === "Size" ? "filter-sizes" : "filter-options"}>{options.map(option => label === "Size" ? <button key={option} aria-pressed={filters[label] === option} onClick={() => select(label, option)}>{option}</button> : <label key={option}><input type="checkbox" checked={filters[label] === option} onChange={() => select(label, option)} />{label === "Colour" && <span className="filter-colour" style={{ backgroundColor: swatchColour(option) }} />}{option}</label>)}</div></details>)}</aside>
          <div><div className="flagship-product-grid">{cards(filtered)}</div>{!filtered.length && <div className="empty-state"><p>{ready ? "No pieces match this selection." : "Loading the collection…"}</p><button className="underlined-link" onClick={() => setFilters({})}>Reset filters</button></div>}</div>
        </div></section>{world && <>{materialPanels()}<section className="layering-section"><div className="flagship-section-title"><h2>More to explore.</h2><button className="underlined-link" onClick={() => go("Shop")}>Explore all collections →</button></div>{worlds(true)}</section></>}
      </>}
    </main>
    <footer className="flagship-footer"><div className="newsletter-bar"><div><h3>Join the affair.</h3><p>Be the first to know about new drops, stories and events.</p></div><form onSubmit={e => { e.preventDefault(); newsletter(String(new FormData(e.currentTarget).get("email"))); }}><label className="sr-only" htmlFor="flagship-email">Your email</label><input id="flagship-email" name="email" placeholder="Your email" type="email" required /><button aria-label="Subscribe to newsletter" disabled={!ready || busy}>→</button></form><div className="newsletter-links"><button onClick={() => go("Journal")}>JOURNAL</button><button onClick={() => onPanel("support")}>CONTACT</button></div></div><div className="flagship-footer-bottom"><button className="brand" onClick={() => go("House")}>Special Affair</button><nav aria-label="Footer navigation">{["Shop", "Journal", "About"].map(n => <button key={n} onClick={() => go(n)}>{n}</button>)}<button onClick={() => onPanel("support")}>Help</button><button onClick={() => onPanel("wishlist")}>Wishlist</button></nav><div><span>INDIA (INR)</span><button onClick={() => onStory("Privacy")}>Privacy</button><button onClick={() => onStory("Terms")}>Terms</button><span>© 2026 SPECIAL AFFAIR</span></div><span className="sa-seal" aria-hidden="true">Sa</span></div></footer>
  </>;
}
